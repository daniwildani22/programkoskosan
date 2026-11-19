'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNav } from '@/context/NavContext';
import { Shield, LogOut, KeyRound, Menu, Crown, UserCheck } from 'lucide-react';
import Link from 'next/link';

export default function Navbar({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { currentUser, logout, isOwner, isAdmin } = useAuth();
  const { toggleMobileMenu } = useNav();

  const displayName = currentUser?.full_name || 'Administrator';
  const roleCode = (currentUser?.role || 'STAFF').toUpperCase();
  const initial = displayName.charAt(0).toUpperCase();

  function handleLogout() {
    if (confirm('Apakah Anda yakin ingin keluar dari sistem?')) {
      logout();
    }
  }

  return (
    <header className="h-16 sm:h-20 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      {/* Left Area: Hamburger Button (Mobile Only) + Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 border border-slate-200/80 transition shrink-0 active:scale-95"
          title="Buka Menu"
          aria-label="Toggle Menu Navigasi"
        >
          <Menu className="w-5 h-5 text-[#064e3b]" />
        </button>

        <div className="truncate">
          <h2 className="text-base sm:text-xl font-extrabold text-slate-800 tracking-tight truncate">
            {title || 'Dashboard'}
          </h2>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-slate-400 truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Area: Profile & Logout */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <Link
          href="/settings"
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition hidden md:flex items-center gap-1.5 text-xs font-semibold"
          title={isOwner ? "Pengaturan & Kelola Pengguna" : "Ganti Password Akun"}
        >
          <KeyRound className="w-4 h-4 text-emerald-600" />
          <span>{isOwner ? 'Pengaturan' : 'Ganti Password'}</span>
        </Link>

        {/* User Profile Badge */}
        <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 sm:border-l border-slate-200">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm shrink-0 ${
            isOwner 
              ? 'bg-gradient-to-br from-amber-600 to-amber-500' 
              : isAdmin 
                ? 'bg-gradient-to-br from-blue-700 to-blue-600' 
                : 'bg-gradient-to-br from-[#064e3b] to-[#059669]'
          }`}>
            {initial}
          </div>
          <div className="text-left hidden lg:block">
            <div className="text-xs sm:text-sm font-bold text-slate-800 leading-tight truncate max-w-[140px]">
              {displayName}
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 mt-0.5">
              {isOwner ? (
                <span className="text-amber-700 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-500" /> OWNER
                </span>
              ) : isAdmin ? (
                <span className="text-blue-700 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-blue-500" /> ADMIN
                </span>
              ) : (
                <span className="text-emerald-700 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-emerald-600" /> STAF
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tombol Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition border border-rose-200/80 shadow-sm active:scale-95"
          title="Keluar dari akun"
        >
          <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
