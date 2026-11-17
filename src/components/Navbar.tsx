'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Bell, Shield, LogOut, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function Navbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { currentUser, logout } = useAuth();

  const displayName = currentUser?.full_name || 'Owner / Administrator';
  const roleName = currentUser?.role || 'OWNER';
  const initial = displayName.charAt(0).toUpperCase();

  function handleLogout() {
    if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
      logout();
    }
  }

  return (
    <header className="h-20 bg-white border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title || 'Dashboard'}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          href="/settings"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition hidden sm:flex items-center gap-1.5 text-xs font-semibold"
          title="Atur Password & Pengguna"
        >
          <KeyRound className="w-4 h-4 text-emerald-600" />
          <span>Atur Password</span>
        </Link>

        {/* User Profile Badge */}
        <div className="flex items-center gap-3 pl-2 sm:border-l border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-[#064e3b] text-white flex items-center justify-center font-bold text-sm shadow-sm">
            {initial}
          </div>
          <div className="text-left hidden md:block">
            <div className="text-sm font-bold text-slate-800 leading-tight">{displayName}</div>
            <div className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3" /> {roleName}
            </div>
          </div>
        </div>

        {/* Tombol Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition border border-rose-200 shadow-sm ml-1"
          title="Keluar dari akun"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
