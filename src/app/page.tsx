'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { supabase, formatRupiah } from '@/lib/supabase';
import { 
  Users, 
  BedDouble, 
  Wallet, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Receipt
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    loading: true
  });

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [
          { count: tenantCount },
          { data: rooms },
          { data: accounts },
          { data: payments },
          { data: expenses }
        ] = await Promise.all([
          supabase.from('tenants').select('*', { count: 'exact', head: true }),
          supabase.from('rooms').select('status'),
          supabase.from('cash_bank_accounts').select('current_balance'),
          supabase.from('payments').select('amount, status').eq('status', 'CONFIRMED'),
          supabase.from('expenses').select('amount, status').eq('status', 'PAID'),
        ]);

        const totalRooms = rooms?.length || 0;
        const occupiedRooms = rooms?.filter(r => r.status === 'TERISI').length || 0;
        const totalBalance = accounts?.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0) || 0;
        const monthlyIncome = payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
        const monthlyExpense = expenses?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0;

        setStats({
          totalTenants: tenantCount || 0,
          totalRooms,
          occupiedRooms,
          totalBalance,
          monthlyIncome,
          monthlyExpense,
          loading: false
        });
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setStats(prev => ({ ...prev, loading: false }));
      }
    }

    loadDashboardData();
  }, []);

  const occupancyRate = stats.totalRooms > 0 
    ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) 
    : 0;

  return (
    <div>
      <Navbar title="Ringkasan Operasional Kos" subtitle="Pantau keterisian kamar, arus kas riil, dan status sewa" />

      {/* Hero Financial Banner (Finora Style) */}
      <div className="mt-6 bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#059669] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 text-xs font-semibold backdrop-blur-md mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
              Total Saldo Seluruh Rekening & Kas
            </span>
            <div className="text-4xl md:text-5xl font-black tracking-tight">
              {stats.loading ? 'Memuat...' : formatRupiah(stats.totalBalance)}
            </div>
            <p className="text-emerald-100/80 text-sm mt-2">
              Akumulasi saldo riil buku kas fisik dan rekening bank operasional.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link 
              href="/tenants" 
              className="px-5 py-3 rounded-2xl bg-white text-[#064e3b] font-bold text-sm shadow-lg hover:bg-emerald-50 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Tambah Penghuni
            </Link>
            <Link 
              href="/finance" 
              className="px-5 py-3 rounded-2xl bg-emerald-900/50 hover:bg-emerald-900/80 text-white font-semibold text-sm border border-emerald-400/30 transition-all flex items-center gap-2"
            >
              <Wallet className="w-4 h-4" /> Kelola Rekening Bank
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
        {/* Card 1: Okupansi */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Okupansi Kamar</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BedDouble className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-800">{occupancyRate}%</div>
            <div className="text-xs text-slate-500 mt-1">
              <strong>{stats.occupiedRooms}</strong> dari <strong>{stats.totalRooms}</strong> kamar terisi
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${occupancyRate}%` }}></div>
          </div>
        </div>

        {/* Card 2: Total Penghuni */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Penghuni Aktif</span>
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-slate-800">{stats.totalTenants}</div>
            <div className="text-xs text-slate-500 mt-1">Data penghuni terdaftar di database Supabase</div>
          </div>
          <Link href="/tenants" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-4">
            Lihat Database Penghuni &rarr;
          </Link>
        </div>

        {/* Card 3: Pemasukan Sewa */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pemasukan Sewa</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-emerald-700">
              {stats.loading ? '...' : formatRupiah(stats.monthlyIncome)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Total pembayaran sewa terkonfirmasi</div>
          </div>
          <span className="kms-badge kms-badge-success self-start mt-4">Arus Kas Masuk</span>
        </div>

        {/* Card 4: Pengeluaran Ops */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pengeluaran Ops</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-rose-600">
              {stats.loading ? '...' : formatRupiah(stats.monthlyExpense)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Biaya listrik, air, internet, gaji, & perawatan</div>
          </div>
          <span className="kms-badge kms-badge-danger self-start mt-4">Biaya Operasional</span>
        </div>
      </div>
    </div>
  );
}
