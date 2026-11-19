'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { supabase, formatRupiah, formatDateDisplay } from '@/lib/supabase';
import { MeterReading, Room } from '@/types/database';
import { 
  Gauge, 
  Plus, 
  Search, 
  Zap, 
  Droplets, 
  RefreshCw, 
  CheckCircle2, 
  X,
  BedDouble
} from 'lucide-react';

export default function UtilitiesPage() {
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [utilityTypeFilter, setUtilityTypeFilter] = useState<'ALL' | 'ELECTRICITY' | 'WATER'>('ALL');
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    room_id: '',
    reading_date: new Date().toISOString().substring(0, 10),
    utility_type: 'ELECTRICITY' as 'ELECTRICITY' | 'WATER',
    previous_meter: 0,
    current_meter: 0,
    rate_per_unit: 1500, // Rp 1.500 / kWh
    notes: ''
  });

  async function loadData() {
    setLoading(true);
    try {
      const [
        { data: mData, error: mErr },
        { data: rData }
      ] = await Promise.all([
        supabase.from('meter_readings').select('*, room:rooms(*)').order('reading_date', { ascending: false }),
        supabase.from('rooms').select('*').order('room_code', { ascending: true })
      ]);

      if (mErr) throw mErr;
      setReadings(mData || []);
      setRooms(rData || []);
    } catch (err: any) {
      alert('Gagal memuat meteran utilitas: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleOpenModal() {
    const firstRoom = rooms[0]?.id || '';
    setFormData({
      room_id: firstRoom,
      reading_date: new Date().toISOString().substring(0, 10),
      utility_type: 'ELECTRICITY',
      previous_meter: 0,
      current_meter: 0,
      rate_per_unit: 1500,
      notes: ''
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.room_id) {
      alert('Silakan pilih kamar terlebih dahulu!');
      return;
    }
    setSaving(true);
    try {
      const usage = Math.max(0, Number(formData.current_meter) - Number(formData.previous_meter));
      const totalCost = usage * Number(formData.rate_per_unit);
      const newId = 'MTR_' + Date.now();
      const selectedRoom = rooms.find(r => r.id === formData.room_id);

      const { error } = await supabase
        .from('meter_readings')
        .insert([{
          id: newId,
          room_id: formData.room_id,
          property_id: selectedRoom?.property_id || null,
          reading_date: formData.reading_date,
          utility_type: formData.utility_type,
          previous_meter: Number(formData.previous_meter),
          current_meter: Number(formData.current_meter),
          usage_amount: usage,
          rate_per_unit: Number(formData.rate_per_unit),
          total_cost: totalCost,
          recorded_by: 'Owner / Administrator',
          notes: formData.notes
        }]);

      if (error) throw error;
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Gagal mencatat meteran: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = readings.filter((r) => {
    const rCode = r.room?.room_code || '';
    const matchSearch = rCode.toLowerCase().includes(search.toLowerCase());
    const matchType = utilityTypeFilter === 'ALL' || r.utility_type === utilityTypeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      <Navbar title="Meteran Listrik & Air" subtitle="Catat angka meteran utilitas bulanan dan kalkulasi tarif pemakaian" />

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kamar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              onClick={() => setUtilityTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${utilityTypeFilter === 'ALL' ? 'bg-[#064e3b] text-white' : 'text-slate-600'}`}
            >
              Semua
            </button>
            <button
              onClick={() => setUtilityTypeFilter('ELECTRICITY')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${utilityTypeFilter === 'ELECTRICITY' ? 'bg-[#064e3b] text-white' : 'text-slate-600'}`}
            >
              <Zap className="w-3.5 h-3.5" /> Listrik
            </button>
            <button
              onClick={() => setUtilityTypeFilter('WATER')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${utilityTypeFilter === 'WATER' ? 'bg-[#064e3b] text-white' : 'text-slate-600'}`}
            >
              <Droplets className="w-3.5 h-3.5" /> Air
            </button>
          </div>
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
            <Plus className="w-4 h-4" /> Catat Meteran Baru
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
            Memuat data meteran...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Gauge className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700">Belum ada pencatatan meteran</p>
            <p className="text-xs text-slate-400 mt-1">Klik tombol 'Catat Meteran Baru' untuk menginput angka meteran listrik atau air.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-4 px-6">Tanggal Catat</th>
                  <th className="py-4 px-6">Kamar</th>
                  <th className="py-4 px-6">Jenis Utilitas</th>
                  <th className="py-4 px-6">Meter Awal</th>
                  <th className="py-4 px-6">Meter Akhir</th>
                  <th className="py-4 px-6">Pemakaian</th>
                  <th className="py-4 px-6">Tarif / Satuan</th>
                  <th className="py-4 px-6">Total Tagihan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6 text-slate-600 text-xs">
                      {formatDateDisplay(m.reading_date)}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold text-xs border border-emerald-100">
                        <BedDouble className="w-3.5 h-3.5" />
                        {m.room?.room_code || 'Kamar'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md ${
                        m.utility_type === 'ELECTRICITY' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {m.utility_type === 'ELECTRICITY' ? <Zap className="w-3.5 h-3.5" /> : <Droplets className="w-3.5 h-3.5" />}
                        {m.utility_type === 'ELECTRICITY' ? 'Listrik' : 'Air'}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-600 text-xs">{m.previous_meter}</td>
                    <td className="py-4 px-6 font-mono text-slate-900 font-bold text-xs">{m.current_meter}</td>
                    <td className="py-4 px-6 font-bold text-slate-800 text-xs">
                      {m.usage_amount} {m.utility_type === 'ELECTRICITY' ? 'kWh' : 'm³'}
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-xs">{formatRupiah(m.rate_per_unit)}</td>
                    <td className="py-4 px-6 font-bold text-[#064e3b]">{formatRupiah(m.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Input Meteran */}
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
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 leading-tight">Catat Angka Meteran</h3>
                  <p className="text-[11px] text-slate-400">Pencatatan pemakaian listrik & air kamar</p>
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
            <form id="utilityForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Pilih Kamar</label>
                <select
                  required
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
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Jenis Utilitas</label>
                  <select
                    value={formData.utility_type}
                    onChange={(e) => {
                      const type = e.target.value as 'ELECTRICITY' | 'WATER';
                      setFormData({ 
                        ...formData, 
                        utility_type: type,
                        rate_per_unit: type === 'ELECTRICITY' ? 1500 : 5000
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600 bg-white"
                  >
                    <option value="ELECTRICITY">⚡ Listrik (kWh)</option>
                    <option value="WATER">💧 Air (m³)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formData.reading_date}
                    onChange={(e) => setFormData({ ...formData, reading_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Meter Awal (Lalu)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.previous_meter}
                    onChange={(e) => setFormData({ ...formData, previous_meter: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Meter Akhir (Saat Ini)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.current_meter}
                    onChange={(e) => setFormData({ ...formData, current_meter: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Tarif per Satuan (Rp)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.rate_per_unit}
                  onChange={(e) => setFormData({ ...formData, rate_per_unit: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                />
              </div>

              {/* Kalkulasi Ringkasan */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Pemakaian:</span>
                  <strong>{Math.max(0, formData.current_meter - formData.previous_meter)} {formData.utility_type === 'ELECTRICITY' ? 'kWh' : 'm³'}</strong>
                </div>
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Estimasi Biaya:</span>
                  <span>{formatRupiah(Math.max(0, formData.current_meter - formData.previous_meter) * formData.rate_per_unit)}</span>
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
                form="utilityForm"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Meteran'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
