'use client';

import React from 'react';
import { Bell, Shield } from 'lucide-react';

export default function Navbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <header className="h-20 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title || 'Dashboard'}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <button className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500"></span>
        </button>

        {/* User Profile Badge */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-[#064e3b] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            O
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-sm font-bold text-slate-800 leading-tight">Owner / Administrator</div>
            <div className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3" /> OWNER
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
