import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Play, Download, Settings2, Type, History,
  CheckCircle2, Loader2, Sparkles, UploadCloud, Search, Square, Eraser, RefreshCw, MessageSquare,
  Volume2
} from 'lucide-react';

import useSessionUser from '../hooks/useSessionUser';
import {
  getWork,
  deleteWork,
  startAnalyzeAndWait,
  saveDraft,
  startRenderingAndWait,
  uploadWorkVideo,
  getDownloadUrl,
} from '../api/works';

const statusLabelMap = {
  'NEW': { label: '신규', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'IN_PROGRESS': { label: '편집 중', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  'RENDERING': { label: '렌더링 중', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  'DONE': { label: '완료', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  'FAILED': { label: '실패', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
};

const toMediaUrl = (value) => {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/media/')) return `http://localhost:4000${value}`;
  if (value.startsWith('/app/')) return `http://localhost:4000${value.replace('/app', '')}`;
  return value;
};

export default function Editor() {
  const { id: workIdParam } = useParams();
  const navigate = useNavigate();
  const { sessionUser, loading: sessionLoading } = useSessionUser();

  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [jobProgress, setJobProgress] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');

  const [projectName, setProjectName] = useState('');
  const [originalScript, setOriginalScript] = useState('');
  const [scripts, setScripts] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('F7wT70V3u09d2rY9pNa6');
  const [sourceVideoPath, setSourceVideoPath] = useState('');
  const [playingVoice, setPlayingVoice] = useState(null);

  const [videoDim, setVideoDim] = useState({ width: 0, height: 0 });
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [rect, setRect] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });

  const voiceOptions = [
    { id: 'F7wT70V3u09d2rY9pNa6', file: 'F7wT70V3u09d2rY9pNa6.mp3', label: '유라' },
    { id: 'KlstlYt9VVf3zgie2Oht', file: 'KlstlYt9VVf3zgie2Oht.mp3', label: '소라' },
    { id: 'TRO4gatqxbbwLXHLDLSk', file: 'TRO4gatqxbbwLXHLDLSk.mp3', label: '재성' }
  ];

  useEffect(() => {
    if (!workIdParam) return;
    const fetchWorkData = async () => {
      try {
        setLoading(true);
        const response = await getWork(workIdParam);
        const data = response.data;
        setWork(data);
        setProjectName(data.title || '');
        setOriginalScript(data.originalScript || '');
        setSourceVideoPath(data.sourceVideoPath || '');
        setPreviewVideoUrl(data.renderResult?.outputVideoUrl || data.sourceVideoPath || '');
        setDownloadUrl(data.renderResult?.downloadUrl || data.renderResult?.outputVideoUrl || '');
        setScripts(Array.isArray(data.editedScript) ? data.editedScript : []);
        if (data.voicePreset) setSelectedVoice(data.voicePreset);

        if (data.status === 'DONE' && !data.renderResult?.downloadUrl) {
          try {
            const resolved = await getDownloadUrl(workIdParam);
            setDownloadUrl(resolved || data.renderResult?.outputVideoUrl || '');
          } catch (_) {}
        }
      } catch (err) {
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchWorkData();
  }, [workIdParam, navigate]);

  const handleVoiceSelect = (voiceId, fileName) => {
    setSelectedVoice(voiceId);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    const audioPath = `/voices/${fileName}`;
    const newAudio = new Audio(audioPath);
    
    setPlayingVoice(voiceId);
    newAudio.play().catch(err => console.error("오디오 재생 실패:", err));
    
    newAudio.onended = () => setPlayingVoice(null);
    audioRef.current = newAudio;
  };

  const handleScriptChange = (index, newText) => {
    const updated = [...scripts];
    updated[index].text = newText;
    setScripts(updated);
  };

  const handleLoadedMetadata = (e) => {
    const { videoWidth, videoHeight } = e.target;
    setVideoDim({ width: videoWidth, height: videoHeight });
  };

  useEffect(() => {
    if (!canvasRef.current || videoDim.width === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (rect) {
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = Math.max(4, videoDim.width * 0.005);
      ctx.setLineDash([videoDim.width * 0.02, videoDim.width * 0.01]);
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      ctx.fillStyle = 'rgba(34, 211, 238, 0.15)';
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
  }, [rect, videoDim]);

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const canvasRect = canvas.getBoundingClientRect();
    const scaleX = videoDim.width / canvasRect.width;
    const scaleY = videoDim.height / canvasRect.height;
    return {
      x: (e.clientX - canvasRect.left) * scaleX,
      y: (e.clientY - canvasRect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    if (!isDrawingMode || rect || videoDim.width === 0) return;
    const coords = getCanvasCoordinates(e);
    startPos.current = coords;
    setIsDragging(true);
    setRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const coords = getCanvasCoordinates(e);
    setRect({
      x: Math.min(coords.x, startPos.current.x),
      y: Math.min(coords.y, startPos.current.y),
      width: Math.abs(coords.x - startPos.current.x),
      height: Math.abs(coords.y - startPos.current.y)
    });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setIsDrawingMode(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      const response = await uploadWorkVideo(workIdParam, file);
      if (response.success) {
        setSourceVideoPath(response.data.sourceVideoPath);
        setPreviewVideoUrl(response.data.sourceVideoPath);
        setDownloadUrl('');
        setWork(prev => ({ ...prev, sourceVideoPath: response.data.sourceVideoPath }));
      }
    } catch (err) {
      alert('업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!work) return;
    try {
      setSubmitLoading(true);
      await saveDraft(workIdParam, {
        title: projectName,
        editedScript: scripts,
        voicePreset: selectedVoice,
        sourceVideoPath: sourceVideoPath,
        originalScript: originalScript
      });
      alert('저장되었습니다.');
    } catch (err) {
      alert('저장 실패');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      setJobProgress({ phase: 'analyze', status: 'PENDING', progress: 0, message: '분석 요청 중...' });

      const result = await startAnalyzeAndWait(workIdParam, sourceVideoPath, (progress) => {
        setJobProgress({
          phase: 'analyze',
          status: progress.status,
          progress: progress.progress ?? 0,
          message: progress.message || '분석 진행 중...',
        });
      });

      const payload = result?.work || result?.data?.work || result?.result || result;
      const analyzedScript = payload?.editedScript || payload?.editedscript || [];
      const analyzedOriginalScript = payload?.originalScript || payload?.originalscript || '';

      if (analyzedOriginalScript) setOriginalScript(analyzedOriginalScript);
      if (Array.isArray(analyzedScript)) setScripts(analyzedScript);

      setWork(prev => prev ? { ...prev, ...payload, status: 'IN_PROGRESS' } : prev);
      setJobProgress({ phase: 'analyze', status: 'COMPLETED', progress: 100, message: '분석 완료' });

    } catch (err) {
      setJobProgress({ phase: 'analyze', status: 'FAILED', progress: 0, message: err?.message || '분석 실패' });
      alert('에러 발생');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRender = async () => {
    if (!work || !sourceVideoPath) return;
    if (!window.confirm('렌더링을 시작하시겠습니까?')) return;
    handleSave
    try {
      setSubmitLoading(true);
      setRendering(true);
      setJobProgress({ phase: 'render', status: 'PENDING', progress: 0, message: '렌더링 요청 중...' });
      const result = await startRenderingAndWait(workIdParam, rect, videoDim, selectedVoice, (progress) => {
        setJobProgress({
          phase: 'render',
          status: progress.status,
          progress: progress.progress ?? 0,
          message: progress.message || '렌더링 진행 중...',
        });
      });

      const payload = result?.work || result?.data?.work || result?.result || result;
      const nextPreviewUrl = payload?.renderResult?.outputVideoUrl || payload?.outputVideoUrl || '';
      setWork(prev => prev ? { ...prev, ...payload, status: 'DONE' } : prev);
      setPreviewVideoUrl(nextPreviewUrl || previewVideoUrl);

      try {
        const resolvedDownloadUrl = await getDownloadUrl(workIdParam);
        setDownloadUrl(resolvedDownloadUrl || payload?.renderResult?.downloadUrl || nextPreviewUrl || '');
      } catch (_) {
        setDownloadUrl(payload?.renderResult?.downloadUrl || nextPreviewUrl || '');
      }

      setJobProgress({ phase: 'render', status: 'DONE', progress: 100, message: '렌더링 완료' });
      
    } catch (err) {
      setJobProgress({ phase: 'render', status: 'FAILED', progress: 0, message: err?.message || '렌더링 실패' });
      alert('렌더링 실패');
    } finally {
      setSubmitLoading(false);
      setRendering(false);
    }
  };

  const handleDeleteWork = async () => {
    if (!window.confirm('이 작업을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')) return;
    try {
      setSubmitLoading(true);
      await deleteWork(workIdParam);
      navigate('/dashboard');
    } catch (err) {
      alert('삭제 실패');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!downloadHref) return;
    try {
      const response = await fetch(downloadHref, { credentials: 'include' });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;

      // 1. 서버 파일명에서 확장자만 추출 (예: 'mp4', 'png' 등)
      const serverFileName = (downloadHref.split('/').pop() || 'output.mp4').split('?')[0];
      const fileExtension = serverFileName.split('.').pop(); // 확장자 추출

      anchor.download = `${projectName}.${fileExtension}`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      // 에러 시 fallback (주의: 이 경우에는 클라이언트에서 이름을 지정할 수 없고 서버 이름을 따릅니다)
      window.open(downloadHref, '_blank', 'noopener,noreferrer');
    }
};

  const isReadOnly = work?.status === 'RENDERING' || work?.status === 'DONE';
  const isCompleted = work?.status === 'DONE';
  const previewSource = isCompleted
    ? (work?.renderResult?.outputVideoUrl || previewVideoUrl)
    : (previewVideoUrl || sourceVideoPath);
  const previewVideoSrc = toMediaUrl(previewSource);
  const downloadHref = toMediaUrl(downloadUrl);

  if (loading || sessionLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-10 h-10 text-cyan-500 animate-spin" /></div>;
  }

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      <header className="h-16 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="p-2 hover:bg-white/10 rounded-xl transition-colors"><ArrowLeft className="w-5 h-5 text-slate-400" /></Link>
          <div className="flex items-center gap-3">
            <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} readOnly={isReadOnly} className="bg-transparent border-none focus:ring-0 font-bold text-lg p-0 w-64" placeholder="제목 없음" />
            {work && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${(statusLabelMap[work?.status]?.color) || 'bg-white/10 text-slate-300 border-white/5'}`}>{(statusLabelMap[work?.status]?.label) || work?.status || 'Unknown'}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <>
              {downloadHref && (
                <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-sm font-black text-slate-950 shadow-lg shadow-emerald-500/20">
                  <Download className="w-4 h-4" /> 다운로드
                </button>
              )}
              <button onClick={handleDeleteWork} disabled={submitLoading} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-sm font-bold text-red-300 border border-red-500/30">
                작업 삭제
              </button>
            </>
          ) : (
            <>
              <button onClick={handleSave} disabled={submitLoading || isReadOnly || analyzing || rendering} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold border border-white/5">{submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 저장</button>
              <button onClick={handleDeleteWork} disabled={submitLoading} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-sm font-bold text-red-300 border border-red-500/30">작업 삭제</button>
              <button onClick={handleAnalyze} disabled={analyzing || rendering || submitLoading || !sourceVideoPath} className="flex items-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-400 rounded-xl text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20">{analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} 동영상 분석</button>
              {rect && <button onClick={handleRender} disabled={submitLoading || analyzing || rendering || isReadOnly || !sourceVideoPath} className="flex items-center gap-2 px-6 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-xl text-sm font-black text-slate-950 shadow-lg shadow-cyan-500/20">{rendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 작업 완료</button>}
            </>
          )}
        </div>
      </header>

      {!isCompleted && jobProgress && (
        <div className={`px-6 py-3 border-b border-white/10 ${jobProgress.status === 'FAILED' ? 'bg-red-500/10 text-red-200' : ['DONE','COMPLETED'].includes(jobProgress.status) ? 'bg-emerald-500/10 text-emerald-200' : 'bg-cyan-500/10 text-cyan-200'}`}>
          <div className="flex items-center justify-between gap-4 text-sm font-medium">
            <span>{jobProgress.phase === 'analyze' ? '분석' : '렌더링'} 상태</span>
            <span>{jobProgress.progress ?? 0}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${jobProgress.status === 'FAILED' ? 'bg-red-400' : ['DONE','COMPLETED'].includes(jobProgress.status) ? 'bg-emerald-400' : 'bg-cyan-400'}`} style={{ width: `${Math.min(100, Math.max(0, jobProgress.progress ?? 0))}%` }} />
          </div>
          <div className="mt-2 text-xs opacity-90">{jobProgress.message}</div>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden">
        {!sourceVideoPath ? (
           <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center p-12">
            <input type="file" id="init-upload" className="hidden" accept="video/*" onChange={handleFileUpload} />
            <label htmlFor="init-upload" className="w-full max-w-4xl aspect-video rounded-[3rem] border-4 border-dashed border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all flex flex-col items-center justify-center gap-8 cursor-pointer group">
              <div className="w-24 h-24 bg-cyan-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">{uploading ? <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" /> : <UploadCloud className="w-12 h-12 text-cyan-500" />}</div>
              <div className="text-center"><h2 className="text-3xl font-black mb-4">영상 소스를 선택하세요</h2><p className="text-slate-500 font-bold uppercase tracking-widest">업로드 후 AI 분석이 진행됩니다</p></div>
            </label>
          </div>
        ) : (
          <>
            <section className="flex-[5] min-w-0 bg-black flex flex-col border-r border-white/10 relative">
              <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-slate-900/30">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Preview</span>
                {!isCompleted && <button onClick={() => setSourceVideoPath('')} className="text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"><RefreshCw className="w-3 h-3" /> 교체</button>}
              </div>
              <div className="flex-1 flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
                <div className="relative inline-block max-w-full max-h-full">
                  <video
                    ref={videoRef}
                    onLoadedMetadata={handleLoadedMetadata}
                    controls={!isDrawingMode}
                    key={previewVideoSrc}
                    className="max-w-full max-h-[75vh] block relative z-0"
                  >
                    <source src={previewVideoSrc} type="video/mp4" />
                  </video>
                  {!isCompleted && videoDim.width > 0 && (
                    <canvas
                      ref={canvasRef}
                      width={videoDim.width}
                      height={videoDim.height}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      className={`absolute inset-0 z-10 w-full h-full ${isDrawingMode ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
                    />
                  )}
                </div>
              </div>
            </section>

            <section className="flex-[5] min-w-0 flex flex-col bg-slate-950">
              <div className="h-32 flex flex-col border-b border-white/10 bg-slate-900/20 shrink-0">
                <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 bg-black/20">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Original Draft</span>
                </div>
                <div className="flex-1 p-4 overflow-y-auto text-xs leading-relaxed text-slate-500 font-medium whitespace-pre-wrap italic">
                  {analyzing ? '분석 중...' : (originalScript || '영상을 분석하면 원본 스크립트가 이곳에 표시됩니다.')}
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2 bg-cyan-500/5">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="text-[9px] font-black text-cyan-500 uppercase tracking-widest">AI Edited Workspace</span>
                </div>
                <div className="flex-1 overflow-y-auto bg-white/[0.01]">
                  {scripts.length > 0 ? (
                    <div className="divide-y divide-white/5">
                      {scripts.map((item, idx) => (
                        <div key={idx} className="flex bg-slate-950/50 hover:bg-white/[0.03] transition-colors group">
                          <div className="w-10 flex items-center justify-center border-r border-white/5 bg-black/10">
                            <span className="text-[10px] font-bold text-slate-600">{item.idx}</span>
                          </div>
                          <textarea
                            value={item.text}
                            onChange={(e) => handleScriptChange(idx, e.target.value)}
                            readOnly={isReadOnly}
                            rows={2}
                            className="flex-1 bg-transparent border-none focus:ring-0 p-4 text-sm leading-relaxed text-slate-300 resize-none overflow-hidden"
                            placeholder="편집할 텍스트를 입력하세요..."
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-700">
                      <Type className="w-10 h-10 mb-3 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">{analyzing ? 'Analyzing Video...' : 'No data available'}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {!isCompleted && (
              <aside className="w-64 border-l border-white/10 bg-slate-950 p-6 flex flex-col gap-10 shrink-0 overflow-y-auto">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Square className="w-3 h-3" /> Area Tools</label>
                  <button
                    onClick={() => rect ? setRect(null) : setIsDrawingMode(true)}
                    className={`w-full py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${rect ? 'border-red-500/40 bg-red-500/10 text-red-400' : (isDrawingMode ? 'border-blue-500 bg-blue-500/20 text-blue-400' : 'border-white/5 bg-white/5 text-slate-500 hover:bg-white/10')}`}
                  >
                    {rect ? <><Eraser className="w-5 h-5" /><span className="text-[10px] font-bold">도형 지우기</span></> : <><Square className={`w-5 h-5 ${isDrawingMode ? 'animate-pulse' : ''}`} /><span className="text-[10px] font-bold">{isDrawingMode ? '그리는 중...' : '영역 지정하기'}</span></>}
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Settings2 className="w-3 h-3" /> Voice Preset</label>
                  <div className="grid gap-2">
                    {voiceOptions.map((voice) => (
                      <button 
                        key={voice.id} 
                        onClick={() => handleVoiceSelect(voice.id, voice.file)} 
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${selectedVoice === voice.id ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-white/5 bg-white/5 text-slate-500 hover:bg-white/10'}`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold">{voice.label}</span>
                          <span className="text-[8px] opacity-40">{voice.id}</span>
                        </div>
                        {playingVoice === voice.id ? <Volume2 className="w-3 h-3 animate-pulse" /> : selectedVoice === voice.id ? <CheckCircle2 className="w-3 h-3" /> : <Play className="w-3 h-3 opacity-20" />}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
            )}
          </>
        )}
      </main>
    </div>
  );
}