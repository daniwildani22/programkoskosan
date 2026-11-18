'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import ImageUpload from '@/components/ImageUpload';
import { supabase, formatRupiah } from '@/lib/supabase';
import { Room, Property } from '@/types/database';
import { 
  BedDouble, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  X,
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [floorFilter, setFloorFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    room_code: '',
    name: '',
    property_id: '',
    floor: 1,
    room_type: 'STANDARD',
    dimensions: '3x4 m',
    base_price: 1500000,
    facilities: 'Kasur Springbed, Lemari Pakaian, Meja Belajar, AC, Kamar Mandi Dalam',
    photo_url: '',
    status: 'KOSONG' as 'KOSONG' | 'TERISI' | 'PERBAIKAN' | 'DIPESAN',
    notes: ''
  });

  async function loadData() {
    setLoading(true);
    try {
      const [{ data: rData, error: rErr }, { data: pData }] = await Promise.all([
        supabase.from('rooms').select('*, property:properties(*)').order('room_code', { ascending: true }),
        supabase.from('properties').select('*').order('name', { ascending: true })
      ]);

      if (rErr) throw rErr;
      setRooms(rData || []);
      setProperties(pData || []);
    } catch (err: any) {
      alert('Gagal memuat kamar: ' + err.message);
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

  function handleOpenModal(room?: Room) {
    if (room) {
      setFormData({
        id: room.id,
        room_code: room.room_code,
        name: room.name,
        property_id: room.property_id || (properties[0]?.id || ''),
        floor: room.floor || 1,
        room_type: room.room_type || 'STANDARD',
        dimensions: room.dimensions || '3x4 m',
        base_price: Number(room.base_price) || 0,
        facilities: room.facilities || '',
        photo_url: room.photo_url || '',
        status: room.status,
        notes: room.notes || ''
      });
    } else {
      setFormData({
        id: '',
        room_code: 'KMR-' + (rooms.length + 1).toString().padStart(2, '0'),
        name: 'Kamar ' + (rooms.length + 1),
        property_id: properties[0]?.id || '',
        floor: 1,
        room_type: 'STANDARD',
        dimensions: '3x4 m',
        base_price: 1500000,
        facilities: 'Kasur Springbed, Lemari Pakaian, Meja Belajar, AC, Kamar Mandi Dalam',
        photo_url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&auto=format&fit=crop&q=80',
        status: 'KOSONG',
        notes: ''
      });
    }
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (formData.id) {
        const { error } = await supabase
          .from('rooms')
          .update({
            room_code: formData.room_code,
            name: formData.name,
            property_id: formData.property_id || null,
            floor: Number(formData.floor),
            room_type: formData.room_type,
            dimensions: formData.dimensions,
            base_price: Number(formData.base_price),
            facilities: formData.facilities,
            photo_url: formData.photo_url,
            status: formData.status,
            notes: formData.notes
          })
          .eq('id', formData.id);
        if (error) throw error;
      } else {
        const newId = 'ROOM_' + Date.now();
        const { error } = await supabase
          .from('rooms')
          .insert([{
            id: newId,
            room_code: formData.room_code,
            name: formData.name,
            property_id: formData.property_id || null,
            floor: Number(formData.floor),
            room_type: formData.room_type,
            dimensions: formData.dimensions,
            base_price: Number(formData.base_price),
            facilities: formData.facilities,
            photo_url: formData.photo_url,
            status: formData.status,
            notes: formData.notes
          }]);
        if (error) throw error;
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Gagal menyimpan kamar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickStatusChange(roomId: string, newStatus: 'KOSONG' | 'TERISI' | 'PERBAIKAN' | 'DIPESAN') {
    try {
      const { error } = await supabase.from('rooms').update({ status: newStatus }).eq('id', roomId);
      if (error) throw error;
      setRooms(rooms.map(r => r.id === roomId ? { ...r, status: newStatus } : r));
    } catch (err: any) {
      alert('Gagal mengubah status: ' + err.message);
    }
  }

  async function handleDelete(room: Room) {
    if (!confirm(`Hapus kamar "${room.room_code} - ${room.name}"?`)) return;
    try {
      const { error } = await supabase.from('rooms').delete().eq('id', room.id);
      if (error) throw error;
      setRooms(rooms.filter(r => r.id !== room.id));
      alert(`Kamar ${room.room_code} berhasil dihapus.`);
    } catch (err: any) {
      alert('Gagal menghapus kamar: ' + err.message);
    }
  }

  const filteredRooms = rooms.filter((r) => {
    const matchSearch = (r.room_code + ' ' + r.name + ' ' + (r.facilities || '')).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchFloor = floorFilter === 'ALL' || String(r.floor) === floorFilter;
    return matchSearch && matchStatus && matchFloor;
  });

  return (
    <div className="space-y-6">
      <Navbar title="Kamar & Fasilitas" subtitle="Daftar unit kamar kos, ketersediaan, tipe, dan fasilitas" />

      {/* Top Action & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kode kamar, fasilitas..."
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
            <option value="KOSONG">Kosong</option>
            <option value="TERISI">Terisi</option>
            <option value="PERBAIKAN">Dalam Perbaikan</option>
            <option value="DIPESAN">Dipesan</option>
          </select>

          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 bg-white"
          >
            <option value="ALL">Semua Lantai</option>
            <option value="1">Lantai 1</option>
            <option value="2">Lantai 2</option>
            <option value="3">Lantai 3</option>
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
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white font-semibold text-sm shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Tambah Kamar
          </button>
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
          Memuat data kamar...
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <BedDouble className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-700">Tidak ada kamar ditemukan</p>
          <p className="text-xs text-slate-400 mt-1">Coba sesuaikan filter pencarian atau tambahkan kamar baru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((r) => {
            const statusColor = 
              r.status === 'TERISI' ? 'bg-rose-100 text-rose-800 border-rose-200' :
              r.status === 'KOSONG' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
              r.status === 'PERBAIKAN' ? 'bg-amber-100 text-amber-800 border-amber-200' :
              'bg-blue-100 text-blue-800 border-blue-200';

            return (
              <div 
                key={r.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition flex flex-col"
              >
                <div className="h-40 bg-slate-100 relative overflow-hidden">
                  <img 
                    src={r.photo_url || 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&auto=format&fit=crop&q=80'} 
                    alt={r.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-[#064e3b] text-white text-xs px-2.5 py-1 rounded-lg font-bold shadow-md">
                    {r.room_code}
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase border shadow-sm ${statusColor}`}>
                      {r.status}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg text-slate-900">{r.name}</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        Lt. {r.floor} • {r.dimensions || '3x4m'}
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl font-extrabold text-[#064e3b]">{formatRupiah(r.base_price)}</span>
                      <span className="text-xs text-slate-400">/ bulan</span>
                    </div>

                    {r.facilities && (
                      <p className="text-xs text-slate-600 mt-3 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {r.facilities}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-xs">
                      <select
                        value={r.status}
                        onChange={(e) => handleQuickStatusChange(r.id, e.target.value as any)}
                        className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700"
                      >
                        <option value="KOSONG">Kosong</option>
                        <option value="TERISI">Terisi</option>
                        <option value="PERBAIKAN">Perbaikan</option>
                        <option value="DIPESAN">Dipesan</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenModal(r)}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition"
                        title="Hapus Kamar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tambah / Edit */}
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
                  <BedDouble className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                    {formData.id ? 'Edit Data Kamar' : 'Tambah Kamar Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Atur tarif, lantai, dan fasilitas kamar</p>
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
            <form id="roomForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Kode Kamar</label>
                  <input
                    type="text"
                    required
                    value={formData.room_code}
                    onChange={(e) => setFormData({ ...formData, room_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                    placeholder="KMR-01"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Nama Kamar</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                    placeholder="Kamar 01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Lantai</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Ukuran</label>
                  <input
                    type="text"
                    value={formData.dimensions}
                    onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                    placeholder="3x4 m"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600 bg-white"
                  >
                    <option value="KOSONG">Kosong</option>
                    <option value="TERISI">Terisi</option>
                    <option value="PERBAIKAN">Perbaikan</option>
                    <option value="DIPESAN">Dipesan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Tarif Sewa Bulanan (Rp)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-emerald-600 font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Daftar Fasilitas</label>
                <textarea
                  rows={2}
                  value={formData.facilities}
                  onChange={(e) => setFormData({ ...formData, facilities: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                  placeholder="AC, WiFi, Kasur, Kamar Mandi Dalam..."
                />
              </div>

              <ImageUpload
                label="Foto Kamar"
                value={formData.photo_url}
                onChange={(url) => setFormData({ ...formData, photo_url: url })}
                folder="rooms"
                aspectRatio="video"
              />
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
                form="roomForm"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Kamar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
