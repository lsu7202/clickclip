import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Zap, Power } from 'lucide-react';
import useSessionUser from '../../hooks/useSessionUser';

export default function Header() {
  const { sessionUser, loading } = useSessionUser();
  const isLoggedIn = Boolean(sessionUser?.isAuthenticated);
  const displayName = sessionUser?.name ?? '회원';
  const displayGrade = sessionUser?.permission?.gradeName ?? 'No Grade';

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        {/* 로고 영역 */}
        <Link to="/" className="flex items-center gap-3 text-black">
          <div className="rounded-2xl bg-black-400/15 p-2 text-black-300 ring-1 ring-black-300/20 w-fit flex items-center justify-center border border-black-300">
            <img
              src={'logo.png'}
              alt="icon"
              className="w-10 h-10 object-contain"
            />
          </div>
          <div className="hidden sm:block">
            <p className="text-lg font-bold tracking-tight">ClickClip</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">AI AUTO CLIP STUDIO</p>
          </div>
        </Link>

        {/* 네비게이션 */}
        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
        </nav>

        {/* 우측 액션 영역 (조건부 렌더링) */}
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            /* 로그인 된 상태: 프로필 표시 */
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="group flex items-center gap-3 pl-2 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-200 group transition-colors">{displayName} 회원님</p>
                  <p className="text-[10px] text-cyan-500/80 font-black tracking-tighter uppercase">{displayGrade}</p>
                </div>
                <div className="rounded-xl bg-white/5 p-2 text-slate-400 ring-1 ring-white/10 group-hover:bg-cyan-400/10 group-hover:text-cyan-300 transition-all">
                  <Power size={20} />
                </div>
              </Link>
            </div>
          ) : (
            /* 로그인 안 된 상태: 로그인 하기 */
            <Link to="/login" className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-300">
              <Zap size={16} /> {loading ? '세션 확인 중' : '로그인 해주세요'}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}