'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NavProvider } from '@/context/NavContext';
import Sidebar from '@/components/Sidebar';
import InstallPwaPrompt from '@/components/InstallPwaPrompt';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser, loading, canAccessRoute } = useAuth();
  const isLoginPage = pathname === '/login';

  // Jika di halaman login, tampilkan layar penuh tanpa sidebar dan tanpa padding
  if (isLoginPage) {
    return (
      <main className="w-full min-h-screen">
        {children}
        <InstallPwaPrompt />
      </main>
    );
  }

  // Tampilkan loading screen singkat saat memvalidasi session user
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#064e3b] text-white">
        <div className="w-10 h-10 border-4 border-emerald-300 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-semibold text-sm">Memuat Kos Management System...</p>
      </div>
    );
  }

  // Jika belum login, jangan render layout utama (akan dialihkan oleh AuthContext ke /login)
  if (!currentUser) {
    return null;
  }

  // Route Guard: Periksa apakah peran pengguna memiliki izin untuk rute saat ini
  const isAuthorized = canAccessRoute(pathname);

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc]">
      {/* Sidebar: Desktop permanent di layar lebar, Drawer tersembunyi di HP */}
      <Sidebar />

      {/* Main Content Area: Mengisi 100% lebar layar di HP */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
          {isAuthorized ? (
            children
          ) : (
            <div className="max-w-xl mx-auto my-16 bg-white rounded-3xl border border-slate-200/80 shadow-xl p-8 text-center animate-in fade-in zoom-in-95 duration-150">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200 shadow-sm">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 mb-2">Akses Halaman Dibatasi (403)</h2>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Akun Anda dengan peran <strong className="text-emerald-800 uppercase font-bold">{currentUser.role}</strong> tidak memiliki hak akses untuk membuka halaman keuangan / administrasi ini.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white font-bold text-sm shadow-md transition active:scale-95"
                >
                  <Home className="w-4 h-4" /> Kembali ke Dashboard
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Floating Prompt Pasang Aplikasi di HP Android */}
      <InstallPwaPrompt />
    </div>
  );
}

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NavProvider>
        <LayoutContent>{children}</LayoutContent>
      </NavProvider>
    </AuthProvider>
  );
}
