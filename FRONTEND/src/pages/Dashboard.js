import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Film,
  Play,
  Home,
  LayoutDashboard,
  Zap,
  Calendar,
  CreditCard,
  ArrowRight,
  Lock,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import useSessionUser from '../hooks/useSessionUser';
import { getWorks, createWork } from '../api/works';

const statusLabelMap = {
  NEW: '새 작업',
  IN_PROGRESS: '작업중',
  RENDERING: '렌더링중',
  DONE: '완료',
  FAILED: '실패',
};

function formatDate(isoDate) {
  if (!isoDate) {
    return '-';
  }
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

// ... 상단 import 생략 ...

export default function Dashboard() {
  // 1. 필요한 Hook 및 상태 추가
  const navigate = useNavigate(); // 이동을 위해 추가
  const { sessionUser, loading, error } = useSessionUser();
  const [worksLoading, setWorksLoading] = useState(false);
  const [worksError, setWorksError] = useState(null);
  const [works, setWorks] = useState([]);
  const [creating, setCreating] = useState(false); // ✅ 이 줄이 없어서 에러가 났던 겁니다!

  useEffect(() => {
    if (!sessionUser?.userId) return;

    let isMounted = true;

    async function loadWorks() {
      setWorksLoading(true);
      setWorksError(null);
      try {
        const response = await getWorks({ limit: 10 });

        if (isMounted) {
          // 콘솔 로그 구조에 맞춰 수정: response.data.items
          // 데이터가 없을 경우를 대비해 옵셔널 체이닝과 기본값([]) 설정
          const fetchedWorks = response.data?.items ?? [];
          setWorks(fetchedWorks);
        }
      } catch (fetchError) {
        if (isMounted) setWorksError(fetchError);
        console.error("작업 목록 로드 에러:", fetchError);
      } finally {
        if (isMounted) setWorksLoading(false);
      }
    }

    loadWorks();
    return () => { isMounted = false; };
  }, [sessionUser?.userId]);

  // 2. 생성 핸들러 (이제 setCreating을 찾을 수 있습니다)
  const handleCreateWork = async () => {
    if (creating) return;

    try {
      setCreating(true);
      const response = await createWork({
        title: `${sessionUser.name ?? 'User'}님의 새로운 프로젝트`,
        originalScript: '스크립트'
      });

      console.log("전체 응답 객체:", response); // 구조 확인용

      // 1. success 대신 status === 'success' 확인
      // 2. response.data 내부에 workId가 있는지 확인
      const isSuccess = response.status === 'success' || response.success === true;
      const workId = response.data?.workId;

      if (isSuccess && workId) {
        console.log("이동할 ID:", workId);
        navigate(`/editor/${workId}`);
      } else {
        console.error("이동 실패: ID 또는 성공 상태 부족", { isSuccess, workId });
        alert('작업 정보가 올바르지 않습니다.');
      }
    } catch (err) {
      console.error('작업 생성 실패:', err);
      alert('새 작업을 생성하지 못했습니다.');
    } finally {
      setCreating(false);
    }
  };

  // Compute derived state after all hooks
  const isActiveMember = sessionUser?.permission?.status === 'Active' ?? false;
  const recentVideos = useMemo(() => works, [works]);
  const accessLabel = sessionUser?.permission?.gradeName ?? sessionUser?.permission?.status ?? 'No Access';

  // Conditional UI rendering based on state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-slate-300">
          <Loader2 className="animate-spin text-cyan-400" size={18} />
          세션 정보를 불러오는 중입니다.
        </div>
      </div>
    );
  }

  if (error && !sessionUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="max-w-lg rounded-[2rem] border border-red-500/20 bg-red-500/10 p-8 text-center">
          <AlertTriangle className="mx-auto text-red-300" size={40} />
          <h2 className="mt-4 text-2xl font-black">세션을 불러오지 못했습니다</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            세션 API 연결이 아직 없거나 네트워크 오류가 발생했습니다. 현재는 개발용 더미 세션으로 대체할 수 있도록 훅이 설계되어 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 lg:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <Link to="/" className="group flex items-center justify-center w-12 h-12 bg-white/5 border border-white/10 rounded-2xl hover:bg-cyan-400 transition-all">
              <Home size={22} className="text-slate-400 group-hover:text-slate-950" />
            </Link>
            <div className="h-8 w-[1px] bg-white/10 mx-2" />
            <div>
              
              <h1 className="text-3xl font-black tracking-tight">대시보드</h1>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            <span className="font-semibold text-white">{sessionUser?.name ?? 'User'} 회원님</span>
            <span className="font-semibold text-white">{sessionUser?.userId ?? 'ID'} </span>
          </div>
        </div>

        {isActiveMember ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="md:col-span-2 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex gap-10">
                  <div className="space-y-2">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <Zap size={14} className="text-cyan-400" /> 남은 크레딧
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-white">{sessionUser?.credits?.remainingCredits ?? 0}</span>
                      <span className="text-slate-500 font-bold">Credits</span>
                    </div>
                  </div>
                  <div className="w-[1px] bg-white/10 h-full hidden sm:block" />
                  <div className="space-y-2">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                      <Calendar size={14} className="text-cyan-400" /> 사용 가능 기간
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-white">{sessionUser?.permission?.remainingDays ?? 0}</span>
                      <span className="text-slate-500 font-bold">Days Left</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-[2.5rem] p-8 flex flex-col justify-center items-center text-center">
                
                <h2 className="text-5xl font-black text-cyan-400">{accessLabel}</h2>
                
              </div>
            </div>

            <div className="flex items-center gap-2 mb-8 text-slate-400 px-2">
              <LayoutDashboard size={18} />
              <span className="text-sm font-bold uppercase tracking-widest">Recent Activity</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <button
                onClick={handleCreateWork}
                disabled={creating}
                className="group border-2 border-dashed border-white/10 rounded-[2.5rem] flex flex-col items-center justify-center p-8 hover:border-cyan-400/50 hover:bg-white/5 transition-all min-h-[280px] w-full text-left"
              >
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {creating ? (
                    <Loader2 className="animate-spin text-cyan-400" size={32} />
                  ) : (
                    <Plus size={32} className="text-slate-500 group-hover:text-cyan-400" />
                  )}
                </div>
                <span className="text-slate-400 font-bold group-hover:text-white">
                  {creating ? '생성 중...' : '새 작업 시작'}
                </span>
              </button>

              {worksLoading ? (
                <div className="col-span-full rounded-[2rem] border border-white/10 bg-white/5 p-6 text-slate-400">
                  작업 목록을 불러오는 중입니다.
                </div>
              ) : null}

              {worksError ? (
                <div className="col-span-full rounded-[2rem] border border-red-500/20 bg-red-500/10 p-6 text-red-200">
                  작업 목록을 불러오지 못했습니다.
                </div>
              ) : null}

              {!worksLoading && !worksError && recentVideos.length === 0 ? (
                <div className="col-span-full rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center text-slate-400">
                  아직 저장된 작업이 없습니다. 새 작업을 시작해보세요.
                </div>
              ) : null}

              {recentVideos.map((video) => (
                <Link to={`/editor/${video.workId}`} key={video.workId} className="group bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden hover:border-cyan-400/30 hover:bg-white/10 transition-all backdrop-blur-xl block">
                  <div className="aspect-video bg-slate-900 relative flex items-center justify-center overflow-hidden">
                    <Film size={40} className="text-slate-700" />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 bg-cyan-400 rounded-full flex items-center justify-center text-slate-950">
                        <Play fill="currentColor" size={20} className="ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg text-slate-100">{video.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDate(video.updatedAt)} • ID: {video.workId}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xs rounded-full border border-white/10 px-3 py-1 text-slate-300">
                        {statusLabelMap[video.status] ?? video.status}
                      </span>
                      {video.canDownload ? (
                        <span className="text-xs font-semibold text-cyan-300">다운로드 가능</span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : sessionUser?.permission?.status === 'Pending' ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-sm">
            <div className="w-20 h-20 bg-cyan-400/10 rounded-3xl flex items-center justify-center mb-6 ring-1 ring-cyan-400/20">
              <Lock size={40} className="text-cyan-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4">승인 대기 중</h2>
            <p className="text-slate-400 max-w-md mb-10 leading-relaxed">
              결제 신청은 접수되었지만 아직 관리자가 승인하지 않았습니다. 승인 완료 후 권한이 활성화되고 크레딧이 반영됩니다.
            </p>
            <Link to="/payment" className="group bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-10 py-5 rounded-2xl font-black text-lg flex items-center gap-3 transition-all shadow-2xl shadow-cyan-400/20 active:scale-95">
              결제 상태 확인 <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-sm">
            <div className="w-20 h-20 bg-cyan-400/10 rounded-3xl flex items-center justify-center mb-6 ring-1 ring-cyan-400/20">
              <Lock size={40} className="text-cyan-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4">대시보드 잠김</h2>
            <p className="text-slate-400 max-w-md mb-10 leading-relaxed">
              현재 이용 가능한 권한이 없습니다. YourFactory의 AI 기능을 사용하려면 먼저 요금제를 선택하고 결제를 신청해주세요.
            </p>
            <Link
              to="/pricing"
              className="group bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-10 py-5 rounded-2xl font-black text-lg flex items-center gap-3 transition-all shadow-2xl shadow-cyan-400/20 active:scale-95"
            >
              요금제 확인하러 가기 <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}