'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { supabase, formatRupiah, formatDateDisplay } from '@/lib/supabase';
import { MaintenanceTicket, Room, Tenant } from '@/types/database';
import { 
  Wrench, 
  Plus, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  X, 
  Clock, 
  AlertTriangle,
  BedDouble
} from 'lucide-react';

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    ticket_number: '',
    room_id: '',
    tenant_id: '',
    category: 'PLUMBING',
    issue_description: '',
    estimated_cost: 0,
    status: 'BARU' as 'BARU' | 'DIPROSES' | 'SELESAI'
  });

  async function loadData() {
    setLoading(true);
    try {
      const [
        { data: tData, error: tErr },
        { data: rData },
        { data: tnData }
      ] = await Promise.all([
        supabase.from('maintenance_tickets').select('*, room:rooms(*), tenant:tenants(*)').order('created_at', { ascending: false }),
        supabase.from('rooms').select('*').order('room_code', { ascending: true }),
        supabase.from('tenants').select('*').order('full_name', { ascending: true })
      ]);

      if (tErr) throw tErr;
      setTickets(tData || []);
      setRooms(rData || []);
      setTenants(tnData || []);
    } catch (err: any) {
      alert('Gagal memuat tiket perawatan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleOpenModal() {
    setFormData({
      ticket_number: 'TCK-' + Date.now().toString().slice(-6),
      room_id: rooms[0]?.id || '',
      tenant_id: tenants[0]?.id || '',
      category: 'PLUMBING',
      issue_description: '',
      estimated_cost: 50000,
      status: 'BARU'
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const tckId = 'TCK_' + Date.now();
      const selRoom = rooms.find(r => r.id === formData.room_id);

      const { error } = await supabase
        .from('maintenance_tickets')
        .insert([{
          id: tckId,
          ticket_number: formData.ticket_number,
          room_id: formData.room_id || null,
          tenant_id: formData.tenant_id || null,
          property_id: selRoom?.property_id || null,
          category: formData.category,
          issue_description: formData.issue_description,
          estimated_cost: Number(formData.estimated_cost),
          status: formData.status,
          report_date: new Date().toISOString().substring(0, 10)
        }]);

      if (error) throw error;
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Gagal menyimpan tiket: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(ticketId: string, newStatus: any) {
    try {
      const { error } = await supabase
        .from('maintenance_tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);
      if (error) throw error;
      setTickets(tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    } catch (err: any) {
      alert('Gagal mengubah status tiket: ' + err.message);
    }
  }

  const filtered = tickets.filter((t) => {
    const rCode = t.room?.room_code || '';
    const desc = t.issue_description || '';
    const matchSearch = (rCode + ' ' + desc).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <Navbar title="Keluhan & Perawatan" subtitle="Manajemen tiket keluhan fasilitas kamar, AC, pipa air, dan perbaikan aset" />

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari keluhan atau kamar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="BARU">Baru Masuk</option>
            <option value="DIPROSES">Sedang Diproses</option>
            <option value="SELESAI">Selesai</option>
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
            <Plus className="w-4 h-4" /> Buat Tiket Perbaikan
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
            Memuat daftar keluhan...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700">Semua fasilitas dalam kondisi prima</p>
            <p className="text-xs text-slate-400 mt-1">Belum ada keluhan atau tiket perbaikan yang dilaporkan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-4 px-6">No. Tiket</th>
                  <th className="py-4 px-6">Kamar / Pelapor</th>
                  <th className="py-4 px-6">Kategori</th>
                  <th className="py-4 px-6">Rincian Keluhan</th>
                  <th className="py-4 px-6">Est. Biaya</th>
                  <th className="py-4 px-6">Status Pengerjaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6 font-mono font-bold text-slate-800">
                      {t.ticket_number}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <BedDouble className="w-4 h-4 text-emerald-600" />
                        {t.room?.room_code || 'Fasilitas Umum'}
                      </div>
                      <div className="text-xs text-slate-400">{t.tenant?.full_name || 'Penghuni'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-900 max-w-xs">
                      {t.issue_description}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-700">
                      {formatRupiah(t.estimated_cost)}
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border ${
                          t.status === 'SELESAI' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                          t.status === 'DIPROSES' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        <option value="BARU">Baru Masuk</option>
                        <option value="DIPROSES">Sedang Dikerjakan</option>
                        <option value="SELESAI">Selesai</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Buat Tiket */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Buat Tiket Keluhan Baru</h3>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Pilih Kamar Terkait</label>
                <select
                  value={formData.room_id}
                  onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600 bg-white"
                >
                  <option value="">-- Fasilitas Umum / Luar Kamar --</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.room_code} - {r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Pelapor (Penghuni)</label>
                <select
                  value={formData.tenant_id}
                  onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600 bg-white"
                >
                  <option value="">-- Tanpa Penghuni / Staf --</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Kategori Kerusakan</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600 bg-white"
                  >
                    <option value="PLUMBING">Pipa & Kran Air</option>
                    <option value="ELECTRICAL">Kelistrikan & Lampu</option>
                    <option value="AC">Pendingin AC</option>
                    <option value="FURNITURE">Mebel & Kasur</option>
                    <option value="DOOR_LOCK">Kunci & Pintu</option>
                    <option value="OTHER">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Estimasi Biaya (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Rincian Keluhan</label>
                <textarea
                  required
                  rows={3}
                  value={formData.issue_description}
                  onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600"
                  placeholder="Kran wastafel bocor, AC kamar kurang dingin..."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                  Batal
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white text-sm font-bold shadow-md">
                  <CheckCircle2 className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Kirim Tiket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
