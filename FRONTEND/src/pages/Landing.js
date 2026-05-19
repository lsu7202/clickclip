import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Video, Zap, CheckCircle2, ShieldCheck, Volume2, VolumeX } from 'lucide-react'; // 아이콘 추가
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';

export default function Landing() {
    // 음소거 상태 관리 (기본값: true = 꺼짐)
    const [isMuted, setIsMuted] = useState(true);
    const videoRef = useRef(null);

    // 음성 켜고 끄기 토글 함수
    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setIsMuted(videoRef.current.muted);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            <Header />

            <main className="flex-1">
                <section className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_32%),radial-gradient(circle_at_80%_20%,_rgba(59,130,246,0.15),_transparent_28%),linear-gradient(to_bottom,_rgba(15,23,42,0),_rgba(15,23,42,0.8))]" />
                    <div className="relative mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
                        
                        {/* 좌측: 요금제 및 기능 설명 UI */}
                        <div className="flex flex-col justify-center space-y-8 z-10">
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-cyan-400 bg-cyan-950/50 rounded-full border border-cyan-800/50 w-fit">
                                    <Zap className="w-4 h-4 fill-cyan-400" />
                                    Premium AI Service
                                </div>
                                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                                    Pro 플랜
                                </h1>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-white">₩ 29,000</span>
                                    <span className="text-slate-400 font-medium">/ 30일</span>
                                </div>
                            </div>

                            <hr className="border-slate-800" />

                            {/* 기능 리스트 */}
                            <div className="space-y-4">
                                <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">제공되는 기능</p>
                                <ul className="grid gap-4 sm:grid-cols-1 text-slate-300">
                                    <li className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-semibold text-white">원본 쇼츠 AI 분석</span>
                                            <p className="text-sm text-slate-400 mt-0.5">영상의 핵심 구조와 트렌드를 정밀하게 파악합니다.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-semibold text-white">대본 & 음성 생성</span>
                                            <p className="text-sm text-slate-400 mt-0.5">조회수를 유도하는 최적의 숏폼 대본을 자동으로 구성합니다.</p>
                                        </div>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-semibold text-white">원본 자막 가리기</span>
                                            <p className="text-sm text-slate-400 mt-0.5">원본 자막 위에 각색한 자막으로 덮습니다.</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            {/* No API Key 안내 바 */}
                            <div className="flex items-center gap-3 p-4 bg-slate-900/60 rounded-xl border border-slate-800/80">
                                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                                <div>
                                    <span className="font-bold text-sm text-white block">No API key</span>
                                    <p className="text-xs text-slate-400 mt-0.5">복잡한 API 키 설정 없이 가입 즉시 모든 기능을 사용할 수 있습니다.</p>
                                </div>
                            </div>
                        </div>

                        {/* 우측: 예시 영상 로딩 UI */}
                        <div className="relative flex justify-center items-center z-10 w-full aspect-[9/16] max-w-[360px] mx-auto lg:ml-auto">
                            {/* 영상 테두리 및 데코레이션 */}
                            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-3xl blur-md opacity-20" />
                            <div className="relative w-full h-full bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
                                
                                {/* 상단 플레이어 바 흉내 */}
                                <div className="absolute top-0 inset-x-0 h-12 bg-gradient-to-b from-black/60 to-transparent z-20 flex items-center px-4 justify-between pointer-events-none">
                                    <div className="flex items-center gap-2">
                                        <Video className="w-4 h-4 text-cyan-400" />
                                        <span className="text-xs font-medium text-slate-300">PREVIEW</span>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                </div>

                                {/* 비디오 태그 */}
                                <video 
                                    ref={videoRef}
                                    className="w-full h-full object-cover"
                                    src="/preview.mp4" 
                                    autoPlay 
                                    loop 
                                    muted={isMuted} // 상태값과 동기화
                                    playsInline
                                />

                                {/* 음성 제어 버튼 (우측 하단 배치) */}
                                <button
                                    onClick={toggleMute}
                                    className="absolute bottom-4 right-4 z-20 p-2.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all border border-white/10 backdrop-blur-sm active:scale-95"
                                    aria-label={isMuted ? "음성 켜기" : "음성 끄기"}
                                >
                                    {isMuted ? (
                                        <VolumeX className="w-4 h-4 text-slate-300" />
                                    ) : (
                                        <Volume2 className="w-4 h-4 text-cyan-400" />
                                    )}
                                </button>
                            </div>
                        </div>

                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}