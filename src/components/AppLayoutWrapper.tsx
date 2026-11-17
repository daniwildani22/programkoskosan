'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser, loading } = useAuth();
  const isLoginPage = pathname === '/login';

  // Jika di halaman login, tampilkan layar penuh tanpa sidebar
  if (isLoginPage) {
    return <main className="w-full min-h-screen">{children}</main>;
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

  // Jika belum login, jangan render layout utama (akan dialihkan oleh AuthContext)
  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f8fafc]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  );
}
