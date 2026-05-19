import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer id="footer" className="border-t border-white/10 bg-slate-950">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-10 md:grid-cols-3">


        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">고객센터</p>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p>지원: support@yourfactory.ai</p>
            <p>운영 시간: Mon-Fri 10:00 - 18:00</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">환불정책</p>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            
          </div>
        </div>
      </div>
    </footer>
  );
}
