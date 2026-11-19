'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { supabase, formatRupiah, formatDateDisplay } from '@/lib/supabase';
import { Deposit, Tenant, Room, CashBankAccount } from '@/types/database';
import { 
  ShieldCheck, 
  Plus, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  X, 
  RotateCcw,
  BedDouble
} from 'lucide-react';

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [accounts, setAccounts] = useState<CashBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal Tambah
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    tenant_id: '',
    room_id: '',
    deposit_amount: 500000,
    received_date: new Date().toISOString().substring(0, 10),
    account_id: '',
    notes: 'Uang jaminan sewa kamar'
  });

  // Modal Refund
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [refundForm, setRefundForm] = useState({
    refund_amount: 0,
    deduction_amount: 0,
    deduction_reason: '',
    refund_account_id: '',
    refund_date: new Date().toISOString().substring(0, 10)
  });

  async function loadData() {
    setLoading(true);
    try {
      const [
        { data: dData, error: dErr },
        { data: tData },
        { data: rData },
        { data: aData }
      ] = await Promise.all([
        supabase.from('deposits').select('*, tenant:tenants(*), room:rooms(*)').order('received_date', { ascending: false }),
        supabase.from('tenants').select('*').order('full_name', { ascending: true }),
        supabase.from('rooms').select('*').order('room_code', { ascending: true }),
        supabase.from('cash_bank_accounts').select('*').eq('status', 'ACTIVE').order('account_name', { ascending: true })
      ]);

      if (dErr) throw dErr;
      setDeposits(dData || []);
      setTenants(tData || []);
      setRooms(rData || []);
      setAccounts(aData || []);
    } catch (err: any) {
      alert('Gagal memuat deposit: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleOpenModal() {
    setFormData({
      tenant_id: tenants[0]?.id || '',
      room_id: rooms[0]?.id || '',
      deposit_amount: 500000,
      received_date: new Date().toISOString().substring(0, 10),
      account_id: accounts[0]?.id || '',
      notes: 'Uang jaminan sewa kamar'
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.tenant_id) {
      alert('Pilih penghuni terlebih dahulu!');
      return;
    }
    setSaving(true);
    try {
      const depId = 'DEP_' + Date.now();
      const depNumber = 'DEP-' + Date.now().toString().slice(-6);
      const selectedRoom = rooms.find(r => r.id === formData.room_id);

      const { error } = await supabase
        .from('deposits')
        .insert([{
          id: depId,
          deposit_number: depNumber,
          tenant_id: formData.tenant_id,
          room_id: formData.room_id || null,
          property_id: selectedRoom?.property_id || null,
          received_date: formData.received_date,
          deposit_amount: Number(formData.deposit_amount),
          account_id: formData.account_id || null,
          status: 'HELD',
          notes: formData.notes
        }]);

      if (error) throw error;
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Gagal menyimpan deposit: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleOpenRefund(d: Deposit) {
    setSelectedDeposit(d);
    setRefundForm({
      refund_amount: Number(d.deposit_amount),
      deduction_amount: 0,
      deduction_reason: '',
      refund_account_id: accounts[0]?.id || '',
      refund_date: new Date().toISOString().substring(0, 10)
    });
    setRefundModalOpen(true);
  }

  async function handleRefundSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDeposit) return;
    setSaving(true);
    try {
      const isDeducted = Number(refundForm.deduction_amount) > 0;
      const isFullyRefunded = Number(refundForm.refund_amount) >= Number(selectedDeposit.deposit_amount);

      const newStatus = isFullyRefunded ? 'REFUNDED' : isDeducted ? 'DEDUCTED' : 'PARTIALLY_REFUNDED';

      const { error } = await supabase
        .from('deposits')
        .update({
          refund_amount: Number(refundForm.refund_amount),
          deduction_amount: Number(refundForm.deduction_amount),
          deduction_reason: refundForm.deduction_reason,
          refund_date: refundForm.refund_date,
          refund_account_id: refundForm.refund_account_id || null,
          status: newStatus
        })
        .eq('id', selectedDeposit.id);

      if (error) throw error;
      setRefundModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Gagal mengembalikan deposit: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = deposits.filter((d) => {
    const tName = d.tenant?.full_name || '';
    const num = d.deposit_number || '';
    const matchSearch = (tName + ' ' + num).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalHeld = deposits
    .filter(d => d.status === 'HELD')
    .reduce((sum, d) => sum + (Number(d.deposit_amount) || 0), 0);

  return (
    <div className="space-y-6">
      <Navbar title="Uang Deposit Jaminan" subtitle="Kelola dana jaminan sewa penghuni, pemotongan kerusakan, dan pengembalian" />

      {/* Action & Stat Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Deposit Tersimpan</span>
          <div className="text-2xl font-extrabold text-[#064e3b] mt-0.5">{formatRupiah(totalHeld)}</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari penghuni, no. deposit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
            />
          </div>

          <button 
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white font-semibold text-sm shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Catat Deposit Baru
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
            Memuat data deposit...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700">Belum ada data uang deposit</p>
            <p className="text-xs text-slate-400 mt-1">Klik tombol 'Catat Deposit Baru' untuk mendaftarkan uang jaminan penyewa.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-4 px-6">No. Deposit</th>
                  <th className="py-4 px-6">Penghuni</th>
                  <th className="py-4 px-6">Kamar</th>
                  <th className="py-4 px-6">Tanggal Terima</th>
                  <th className="py-4 px-6">Nominal Deposit</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6 font-mono font-bold text-slate-800">
                      {d.deposit_number}
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {d.tenant?.full_name || 'Penghuni'}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold text-xs border border-emerald-100">
                        <BedDouble className="w-3.5 h-3.5" />
                        {d.room?.room_code || 'Kamar'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 text-xs">
                      {formatDateDisplay(d.received_date)}
                    </td>
                    <td className="py-4 px-6 font-extrabold text-[#064e3b]">
                      {formatRupiah(d.deposit_amount)}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                        d.status === 'HELD' ? 'bg-blue-100 text-blue-800' :
                        d.status === 'REFUNDED' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {d.status === 'HELD' ? 'DITAHAN' : d.status === 'REFUNDED' ? 'DIKEMBALIKAN' : 'DIPOTONG'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {d.status === 'HELD' ? (
                        <button
                          onClick={() => handleOpenRefund(d)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Proses Refund
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Tuntas</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah Deposit */}
      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          onClick={() => setModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. STICKY HEADER */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 leading-tight">Catat Uang Deposit</h3>
                  <p className="text-[11px] text-slate-400">Penerimaan dana jaminan sewa kamar</p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 text-xs font-bold transition active:scale-95 shadow-sm"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </button>
            </div>

            {/* 2. SCROLLABLE FORM BODY */}
            <form id="depositForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Pilih Penghuni</label>
                <select
                  required
                  value={formData.tenant_id}
                  onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-emerald-600 bg-white"
                >
                  <option value="">-- Pilih Penghuni --</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Pilih Kamar</label>
                <select
                  value={formData.room_id}
                  onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-emerald-600 bg-white"
                >
                  <option value="">-- Pilih Kamar --</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.room_code} - {r.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Nominal Deposit (Rp)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.deposit_amount}
                    onChange={(e) => setFormData({ ...formData, deposit_amount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-emerald-800 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Tanggal Terima</label>
                  <input
                    type="date"
                    required
                    value={formData.received_date}
                    onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Keterangan / Catatan</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                />
              </div>
            </form>

            {/* 3. STICKY FOOTER */}
            <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/90 backdrop-blur-sm z-10">
              <button 
                type="button" 
                onClick={() => setModalOpen(false)} 
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs sm:text-sm font-semibold hover:bg-white transition"
              >
                Batal
              </button>
              <button 
                type="submit" 
                form="depositForm"
                disabled={saving} 
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Refund */}
      {refundModalOpen && selectedDeposit && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          onClick={() => setRefundModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. STICKY HEADER */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
              <div>
                <h3 className="text-base font-bold text-slate-800 leading-tight">Proses Pengembalian Deposit</h3>
                <p className="text-[11px] text-slate-400">Pengembalian dana jaminan saat checkout</p>
              </div>
              <button 
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 text-xs font-bold transition active:scale-95 shadow-sm"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </button>
            </div>

            {/* 2. SCROLLABLE FORM BODY */}
            <form id="refundForm" onSubmit={handleRefundSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>Penghuni: <strong>{selectedDeposit.tenant?.full_name || 'Penghuni'}</strong></div>
                <div>Deposit Awal: <strong className="text-emerald-800">{formatRupiah(selectedDeposit.deposit_amount)}</strong></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Nominal Refund (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={refundForm.refund_amount}
                    onChange={(e) => setRefundForm({ ...refundForm, refund_amount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-emerald-800 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Potongan Kerusakan</label>
                  <input
                    type="number"
                    min="0"
                    value={refundForm.deduction_amount}
                    onChange={(e) => setRefundForm({ ...refundForm, deduction_amount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-rose-600 focus:outline-emerald-600"
                  />
                </div>
              </div>

              {Number(refundForm.deduction_amount) > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Alasan / Rincian Kerusakan</label>
                  <input
                    type="text"
                    value={refundForm.deduction_reason}
                    onChange={(e) => setRefundForm({ ...refundForm, deduction_reason: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                    placeholder="Kunci hilang, cat kamar terkelupas..."
                  />
                </div>
              )}
            </form>

            {/* 3. STICKY FOOTER */}
            <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/90 backdrop-blur-sm z-10">
              <button 
                type="button" 
                onClick={() => setRefundModalOpen(false)} 
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs sm:text-sm font-semibold hover:bg-white transition"
              >
                Batal
              </button>
              <button 
                type="submit" 
                form="refundForm"
                disabled={saving} 
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Memproses...' : 'Konfirmasi Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
