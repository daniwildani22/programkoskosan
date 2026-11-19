'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { supabase, formatRupiah, formatDateDisplay } from '@/lib/supabase';
import { Contract, Tenant, Room } from '@/types/database';
import { 
  FileSignature, 
  Plus, 
  Search, 
  Calendar, 
  CheckCircle2, 
  X, 
  RefreshCw,
  User,
  BedDouble,
  Trash2,
  DoorClosed,
  AlertTriangle
} from 'lucide-react';

export default function ContractsPage() {
  const { isOwner, isAdmin } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    contract_number: '',
    tenant_id: '',
    room_id: '',
    start_date: new Date().toISOString().substring(0, 10),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
    rent_price: 1500000,
    deposit_amount: 500000,
    billing_cycle: 'BULANAN',
    status: 'ACTIVE' as 'ACTIVE' | 'EXTENDED' | 'TERMINATED' | 'EXPIRED'
  });

  async function loadData() {
    setLoading(true);
    try {
      const [
        { data: cData, error: cErr },
        { data: tData },
        { data: rData }
      ] = await Promise.all([
        supabase.from('contracts').select('*, tenant:tenants(*), room:rooms(*)').order('created_at', { ascending: false }),
        supabase.from('tenants').select('*').order('full_name', { ascending: true }),
        supabase.from('rooms').select('*').order('room_code', { ascending: true })
      ]);

      if (cErr) throw cErr;
      setContracts(cData || []);
      setTenants(tData || []);
      setRooms(rData || []);
    } catch (err: any) {
      alert('Gagal memuat kontrak sewa: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setModalOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleOpenModal() {
    const defaultTenant = tenants[0]?.id || '';
    const defaultRoom = rooms[0]?.id || '';
    const defaultPrice = rooms[0]?.base_price || 1500000;

    setFormData({
      id: '',
      contract_number: 'CTR-' + Date.now().toString().slice(-6),
      tenant_id: defaultTenant,
      room_id: defaultRoom,
      start_date: new Date().toISOString().substring(0, 10),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      rent_price: Number(defaultPrice),
      deposit_amount: 500000,
      billing_cycle: 'BULANAN',
      status: 'ACTIVE'
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.tenant_id || !formData.room_id) {
      alert('Silakan pilih penghuni dan kamar terlebih dahulu!');
      return;
    }
    setSaving(true);
    try {
      const newId = 'CTR_' + Date.now();
      const selectedRoom = rooms.find(r => r.id === formData.room_id);

      const { error } = await supabase
        .from('contracts')
        .insert([{
          id: newId,
          contract_number: formData.contract_number,
          tenant_id: formData.tenant_id,
          room_id: formData.room_id,
          property_id: selectedRoom?.property_id || null,
          start_date: formData.start_date,
          end_date: formData.end_date,
          rent_price: Number(formData.rent_price),
          deposit_amount: Number(formData.deposit_amount),
          billing_cycle: formData.billing_cycle,
          status: formData.status
        }]);

      if (error) throw error;

      // Update room status to TERISI
      await supabase.from('rooms').update({ status: 'TERISI' }).eq('id', formData.room_id);

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Gagal membuat kontrak: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // Handler Mengakhiri Sewa (Check-Out / Pemutusan Kontrak)
  async function handleTerminateContract(c: Contract) {
    const confirmMsg = `Akhiri sewa untuk kontrak "${c.contract_number}"?\n\nPenghuni: ${c.tenant?.full_name || '-'}\nKamar: ${c.room?.room_code || '-'}\n\nSetelah diakhiri, status kamar ini akan otomatis dikembalikan menjadi KOSONG dan siap disewakan kembali kepada penghuni baru.`;
    if (!confirm(confirmMsg)) return;

    try {
      // 1. Update status kontrak menjadi TERMINATED
      const { error: cErr } = await supabase
        .from('contracts')
        .update({
          status: 'TERMINATED',
          updated_at: new Date().toISOString()
        })
        .eq('id', c.id);
      if (cErr) throw cErr;

      // 2. Kembalikan status kamar menjadi KOSONG
      if (c.room_id) {
        await supabase
          .from('rooms')
          .update({
            status: 'KOSONG',
            updated_at: new Date().toISOString()
          })
          .eq('id', c.room_id);
      }

      // 3. Perbarui state lokal
      setContracts(prev => prev.map(item => item.id === c.id ? { ...item, status: 'TERMINATED' } : item));
      alert(`Sewa untuk kamar ${c.room?.room_code || ''} berhasil diakhiri. Status kamar kini kembali KOSONG.`);
    } catch (err: any) {
      alert('Gagal mengakhiri sewa: ' + err.message);
    }
  }

  // Handler Hapus Kontrak (Owner / Admin)
  async function handleDeleteContract(c: Contract) {
    if (!isOwner && !isAdmin) {
      alert('Hanya akun Owner atau Admin yang berwenang menghapus data kontrak.');
      return;
    }

    const confirmMsg = `Hapus permanen kontrak "${c.contract_number}" (Penghuni: ${c.tenant?.full_name || '-'})?\n\nPerhatian: Seluruh data tagihan, pembayaran, dan deposit terkait kontrak ini akan ikut dibersihkan. Status kamar akan dikembalikan ke KOSONG jika saat ini masih terisi.`;
    if (!confirm(confirmMsg)) return;

    try {
      // 1. Bersihkan pembayaran & deposit & tagihan terkait kontrak ini terlebih dahulu
      await supabase.from('payments').delete().eq('contract_id', c.id);
      await supabase.from('deposits').delete().eq('contract_id', c.id);
      await supabase.from('rent_bills').delete().eq('contract_id', c.id);

      // 2. Hapus data kontrak
      const { error: delErr } = await supabase.from('contracts').delete().eq('id', c.id);
      if (delErr) throw delErr;

      // 3. Jika status kontrak aktif, kosongkan kembali kamar
      if (c.status === 'ACTIVE' && c.room_id) {
        await supabase.from('rooms').update({ status: 'KOSONG' }).eq('id', c.room_id);
      }

      // 4. Update state lokal
      setContracts(prev => prev.filter(item => item.id !== c.id));
      alert(`Kontrak ${c.contract_number} berhasil dihapus.`);
    } catch (err: any) {
      alert('Gagal menghapus kontrak: ' + err.message);
    }
  }

  const filtered = contracts.filter((c) => {
    const tName = c.tenant?.full_name || '';
    const rCode = c.room?.room_code || '';
    const num = c.contract_number || '';
    const matchSearch = (tName + ' ' + rCode + ' ' + num).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <Navbar title="Kontrak Sewa" subtitle="Daftar perjanjian sewa kamar, tanggal jatuh tempo, dan deposit" />

      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama penghuni, no. kontrak, kamar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="EXTENDED">Diperpanjang</option>
            <option value="TERMINATED">Berakhir</option>
            <option value="EXPIRED">Kedaluwarsa</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
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
            <Plus className="w-4 h-4" /> Buat Kontrak Baru
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
            Memuat daftar kontrak...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileSignature className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700">Belum ada kontrak sewa</p>
            <p className="text-xs text-slate-400 mt-1">Klik tombol 'Buat Kontrak Baru' untuk mendaftarkan penyewaan kamar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-4 px-6">No. Kontrak</th>
                  <th className="py-4 px-6">Penghuni</th>
                  <th className="py-4 px-6">Kamar</th>
                  <th className="py-4 px-6">Periode Sewa</th>
                  <th className="py-4 px-6">Tarif Sewa</th>
                  <th className="py-4 px-6">Deposit</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((c) => {
                  const isActive = c.status === 'ACTIVE' || c.status === 'EXTENDED';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 font-mono font-bold text-slate-800">
                        {c.contract_number}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                            {c.tenant?.full_name ? c.tenant.full_name[0] : 'P'}
                          </div>
                          <span>{c.tenant?.full_name || 'Penghuni'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold text-xs border border-emerald-100">
                          <BedDouble className="w-3.5 h-3.5" />
                          {c.room?.room_code || 'Kamar'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-600 text-xs">
                        <div>Mulai: <strong>{formatDateDisplay(c.start_date)}</strong></div>
                        <div>Sampai: <strong>{formatDateDisplay(c.end_date)}</strong></div>
                      </td>
                      <td className="py-4 px-6 font-bold text-[#064e3b]">
                        {formatRupiah(c.rent_price)}
                      </td>
                      <td className="py-4 px-6 text-slate-700 font-medium">
                        {formatRupiah(c.deposit_amount)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                          c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                          c.status === 'TERMINATED' ? 'bg-amber-100 text-amber-800' :
                          c.status === 'EXTENDED' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {c.status === 'ACTIVE' ? 'Aktif' :
                           c.status === 'TERMINATED' ? 'Diakhiri' :
                           c.status === 'EXTENDED' ? 'Diperpanjang' : 'Kedaluwarsa'}
                        </span>
                      </td>
                      {/* AKSI KONTRAK */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Tombol Akhiri Sewa Lebih Awal */}
                          {isActive && (
                            <button
                              onClick={() => handleTerminateContract(c)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition shadow-sm"
                              title="Akhiri Masa Sewa & Kosongkan Kamar"
                            >
                              <DoorClosed className="w-3.5 h-3.5 text-amber-600" />
                              <span className="hidden sm:inline">Akhiri Sewa</span>
                            </button>
                          )}

                          {/* Tombol Hapus Kontrak (Owner / Admin) */}
                          {(isOwner || isAdmin) && (
                            <button
                              onClick={() => handleDeleteContract(c)}
                              className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition shadow-sm"
                              title="Hapus Kontrak (Owner/Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Buat Kontrak */}
      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          onClick={() => setModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. STICKY HEADER */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSignature className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">Buat Kontrak Sewa Baru</h3>
                  <p className="text-[11px] text-slate-400">Hubungkan penghuni dengan kamar dan masa sewa</p>
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
            <form id="contractForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Nomor Kontrak</label>
                <input
                  type="text"
                  required
                  value={formData.contract_number}
                  onChange={(e) => setFormData({ ...formData, contract_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Pilih Penghuni</label>
                  <select
                    required
                    value={formData.tenant_id}
                    onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600 bg-white"
                  >
                    <option value="">-- Pilih Penghuni --</option>
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>{t.full_name} ({t.tenant_code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Pilih Kamar</label>
                  <select
                    required
                    value={formData.room_id}
                    onChange={(e) => {
                      const selRoom = rooms.find(r => r.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        room_id: e.target.value,
                        rent_price: selRoom ? Number(selRoom.base_price) : formData.rent_price
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600 bg-white"
                  >
                    <option value="">-- Pilih Kamar --</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.room_code} - {r.name} ({r.status})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Tanggal Mulai Sewa</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Tanggal Selesai Sewa</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Harga Sewa Bulanan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.rent_price}
                    onChange={(e) => setFormData({ ...formData, rent_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-emerald-800 focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Uang Deposit (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.deposit_amount}
                    onChange={(e) => setFormData({ ...formData, deposit_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-emerald-600"
                  />
                </div>
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
                form="contractForm"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Memproses...' : 'Simpan Kontrak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
