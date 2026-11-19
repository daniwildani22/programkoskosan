'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { supabase, formatRupiah } from '@/lib/supabase';
import { 
  Users, 
  BedDouble, 
  Wallet, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Receipt,
  Gauge,
  Wrench,
  DoorOpen,
  CalendarCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { currentUser, isOwner, isAdmin, isStaff } = useAuth();
  const [stats, setStats] = useState({
    totalTenants: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    vacantRooms: 0,
    totalBalance: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    pendingMaintenance: 0,
    totalReadings: 0,
    loading: true
  });

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // Query data operasional umum
        const [
          { count: tenantCount },
          { data: rooms },
          { data: tickets },
          { count: readingCount }
        ] = await Promise.all([
          supabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
          supabase.from('rooms').select('status'),
          supabase.from('maintenance_tickets').select('status').in('status', ['BARU', 'DIPROSES']),
          supabase.from('meter_readings').select('*', { count: 'exact', head: true })
        ]);

        const totalRooms = rooms?.length || 0;
        const occupiedRooms = rooms?.filter(r => r.status === 'TERISI').length || 0;
        const vacantRooms = rooms?.filter(r => r.status === 'KOSONG').length || 0;
        const pendingMaintenance = tickets?.length || 0;

        let totalBalance = 0;
        let monthlyIncome = 0;
        let monthlyExpense = 0;

        // Query data keuangan HANYA jika bukan Staff/User biasa (Owner & Admin)
        if (!isStaff) {
          const [
            { data: accounts },
            { data: payments },
            { data: expenses }
          ] = await Promise.all([
            supabase.from('cash_bank_accounts').select('current_balance').eq('status', 'ACTIVE'),
            supabase.from('payments').select('amount, status').eq('status', 'CONFIRMED'),
            supabase.from('expenses').select('amount, status').eq('status', 'PAID'),
          ]);

          totalBalance = accounts?.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0) || 0;
          monthlyIncome = payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
          monthlyExpense = expenses?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0;
        }

        setStats({
          totalTenants: tenantCount || 0,
          totalRooms,
          occupiedRooms,
          vacantRooms,
          totalBalance,
          monthlyIncome,
          monthlyExpense,
          pendingMaintenance,
          totalReadings: readingCount || 0,
          loading: false
        });
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setStats(prev => ({ ...prev, loading: false }));
      }
    }

    loadDashboardData();
  }, [isStaff]);

  const occupancyRate = stats.totalRooms > 0 
    ? Math.round((stats.occupiedRooms / stats.totalRooms) * 100) 
    : 0;

  return (
    <div>
      <Navbar 
        title={isStaff ? "Dashboard Petugas Lapangan" : "Ringkasan Operasional Kos"} 
        subtitle={isStaff ? "Monitoring kamar, pencatatan meteran listrik & air, serta keluhan fasilitas" : "Pantau keterisian kamar, arus kas riil, dan status sewa"} 
      />

      {/* DASHBOARD KHUSUS STAFF LAPANGAN (FINANSIAL DISEMBUNYIKAN) */}
      {isStaff ? (
        <>
          <div className="mt-4 sm:mt-6 bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#059669] rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-5 sm:gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 text-xs font-semibold backdrop-blur-md mb-2 sm:mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                  Portal Staf Lapangan & Penjaga Kos
                </span>
                <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                  Halo, {currentUser?.full_name || 'Petugas'} 👋
                </div>
                <p className="text-emerald-100/80 text-xs sm:text-sm mt-1.5 max-w-xl">
                  Silakan periksa ketersediaan kamar, catat meteran listrik & air berkala, serta tindak lanjuti laporan perbaikan fasilitas kos.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                <Link 
                  href="/utilities" 
                  className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-white text-[#064e3b] font-bold text-xs sm:text-sm shadow-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                >
                  <Gauge className="w-4 h-4 text-emerald-700" /> Catat Meteran
                </Link>
                <Link 
                  href="/maintenance" 
                  className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-emerald-900/50 hover:bg-emerald-900/80 text-white font-semibold text-xs sm:text-sm border border-emerald-400/30 transition-all flex items-center justify-center gap-2"
                >
                  <Wrench className="w-4 h-4 text-emerald-300" /> Cek Perbaikan
                </Link>
              </div>
            </div>
          </div>

          {/* KPI Cards Staf Lapangan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-4 sm:mt-6">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Okupansi Kamar</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <BedDouble className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">{occupancyRate}%</div>
                <div className="text-xs text-slate-500 mt-1">
                  <strong>{stats.occupiedRooms}</strong> terisi, <strong>{stats.vacantRooms}</strong> kamar kosong
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${occupancyRate}%` }}></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kamar Kosong Siap Huni</span>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <DoorOpen className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-teal-700">{stats.vacantRooms}</div>
                <div className="text-xs text-slate-500 mt-1">Kamar berstatus siap disewakan</div>
              </div>
              <Link href="/rooms" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-4">
                Lihat Daftar Kamar &rarr;
              </Link>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Keluhan Fasilitas</span>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">{stats.pendingMaintenance}</div>
                <div className="text-xs text-slate-500 mt-1">Laporan baru / sedang diproses</div>
              </div>
              <Link href="/maintenance" className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1 mt-4">
                Lihat Laporan Tiket &rarr;
              </Link>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Penghuni Aktif</span>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-blue-700">{stats.totalTenants}</div>
                <div className="text-xs text-slate-500 mt-1">Penghuni kos yang aktif menempati</div>
              </div>
              <Link href="/tenants" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-4">
                Buku Tamu / Kontak &rarr;
              </Link>
            </div>
          </div>
        </>
      ) : (
        /* DASHBOARD LENGKAP UNTUK OWNER & ADMIN (LENGKAP ARUS KAS & SALDO) */
        <>
          <div className="mt-4 sm:mt-6 bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#059669] rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-5 sm:gap-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 text-xs font-semibold backdrop-blur-md mb-2 sm:mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                  Total Saldo Seluruh Rekening & Kas
                </span>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight break-words">
                  {stats.loading ? 'Memuat...' : formatRupiah(stats.totalBalance)}
                </div>
                <p className="text-emerald-100/80 text-xs sm:text-sm mt-1.5 sm:mt-2">
                  Akumulasi saldo riil buku kas fisik dan rekening bank operasional kos.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                <Link 
                  href="/tenants" 
                  className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-white text-[#064e3b] font-bold text-xs sm:text-sm shadow-lg hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Tambah Penghuni
                </Link>
                <Link 
                  href="/finance" 
                  className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-emerald-900/50 hover:bg-emerald-900/80 text-white font-semibold text-xs sm:text-sm border border-emerald-400/30 transition-all flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4" /> Kelola Rekening Bank
                </Link>
              </div>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-4 sm:mt-6">
            {/* Card 1: Okupansi */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Okupansi Kamar</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <BedDouble className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">{occupancyRate}%</div>
                <div className="text-xs text-slate-500 mt-1">
                  <strong>{stats.occupiedRooms}</strong> dari <strong>{stats.totalRooms}</strong> kamar terisi
                </div>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${occupancyRate}%` }}></div>
              </div>
            </div>

            {/* Card 2: Total Penghuni */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Penghuni Aktif</span>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">{stats.totalTenants}</div>
                <div className="text-xs text-slate-500 mt-1">Data penghuni aktif di Supabase</div>
              </div>
              <Link href="/tenants" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-4">
                Lihat Database Penghuni &rarr;
              </Link>
            </div>

            {/* Card 3: Pemasukan Sewa */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pemasukan Sewa</span>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-700">
                  {stats.loading ? '...' : formatRupiah(stats.monthlyIncome)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Total pembayaran sewa terkonfirmasi</div>
              </div>
              <span className="kms-badge kms-badge-success self-start mt-4">Arus Kas Masuk</span>
            </div>

            {/* Card 4: Pengeluaran Ops */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pengeluaran Ops</span>
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-xl sm:text-2xl font-extrabold text-rose-600">
                  {stats.loading ? '...' : formatRupiah(stats.monthlyExpense)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Biaya listrik, air, internet, gaji, & perawatan</div>
              </div>
              <span className="kms-badge kms-badge-danger self-start mt-4">Biaya Operasional</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
