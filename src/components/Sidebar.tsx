'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Building2, 
  LayoutDashboard, 
  BedDouble, 
  Users, 
  FileSignature, 
  Receipt, 
  Gauge, 
  ArrowDownCircle, 
  Wallet, 
  ShieldCheck, 
  Wrench, 
  Settings 
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Properti Kos', href: '/properties', icon: Building2 },
    { label: 'Kamar & Fasilitas', href: '/rooms', icon: BedDouble },
    { label: 'Penghuni', href: '/tenants', icon: Users },
    { label: 'Kontrak Sewa', href: '/contracts', icon: FileSignature },
    { label: 'Tagihan & Pembayaran', href: '/payments', icon: Receipt },
    { label: 'Meteran Listrik & Air', href: '/utilities', icon: Gauge },
    { label: 'Pengeluaran', href: '/expenses', icon: ArrowDownCircle },
    { label: 'Kas & Rekening Bank', href: '/finance', icon: Wallet },
    { label: 'Uang Deposit', href: '/deposits', icon: ShieldCheck },
    { label: 'Keluhan & Perawatan', href: '/maintenance', icon: Wrench },
    { label: 'Pengaturan', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#064e3b] text-white flex flex-col min-h-screen shrink-0 shadow-xl">
      {/* Brand Header */}
      <div className="p-6 border-b border-emerald-900/60 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg tracking-tight leading-tight">KOS MANAGEMENT</h1>
          <p className="text-xs text-emerald-300/80 font-medium">Finora Cloud Edition</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-bold text-emerald-400/60 uppercase tracking-wider">
          Menu Utama
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-semibold'
                  : 'text-emerald-100/80 hover:bg-emerald-800/40 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-300'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-emerald-900/60 text-xs text-emerald-300/70 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Supabase Connected
        </span>
        <span className="bg-emerald-900/60 px-2 py-0.5 rounded text-[10px] text-emerald-300">v2.0</span>
      </div>
    </aside>
  );
}
