'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import ImageUpload from '@/components/ImageUpload';
import { useAuth } from '@/context/AuthContext';
import { supabase, formatRupiah, formatDateDisplay } from '@/lib/supabase';
import { Room, Property, Contract } from '@/types/database';
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
  Sparkles,
  CalendarCheck,
  Calendar,
  Clock,
  User,
  Phone,
  DoorClosed,
  AlertCircle,
  Building2,
  CalendarDays,
  Send,
  Check
} from 'lucide-react';

export default function RoomsPage() {
  const { isOwner, isAdmin, isStaff } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [floorFilter, setFloorFilter] = useState('ALL');

  // Modal Tambah / Edit Kamar State
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

  // Modal Jadwal Check-In & Check-Out State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTab, setScheduleTab] = useState<'CHECKOUT' | 'CHECKIN'>('CHECKOUT');
  const [scheduleSearch, setScheduleSearch] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const [
        { data: rData, error: rErr }, 
        { data: pData },
        { data: cData }
      ] = await Promise.all([
        supabase.from('rooms').select('*, property:properties(*)').order('room_code', { ascending: true }),
        supabase.from('properties').select('*').order('name', { ascending: true }),
        supabase.from('contracts').select('*, tenant:tenants(*), room:rooms(*)').in('status', ['ACTIVE', 'EXTENDED']).order('end_date', { ascending: true })
      ]);

      if (rErr) throw rErr;
      setRooms(rData || []);
      setProperties(pData || []);
      setContracts(cData || []);
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
        setScheduleModalOpen(false);
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

  // HAPUS KAMAR DENGAN PEMBERSIHAN RELASIONAL BERSIH (FIX DELETE ROOM)
  async function handleDelete(room: Room) {
    if (!isOwner) {
      alert('Hanya akun Owner (Pemilik Kos) yang memiliki wewenang untuk menghapus unit kamar.');
      return;
    }

    const confirmMsg = `Hapus kamar "${room.room_code} - ${room.name}"?\n\nPerhatian: Sistem akan membersihkan seluruh data riwayat terkait kamar ini (kontrak, tagihan sewa, pembayaran, tiket keluhan, dan pembacaan meteran) agar penghapusan kamar berhasil tanpa error constraint.`;
    if (!confirm(confirmMsg)) return;

    try {
      // 1. Bersihkan transaksi pembayaran yang terkait kamar ini
      await supabase.from('payments').delete().eq('room_id', room.id);

      // 2. Bersihkan uang deposit terkait kamar ini
      await supabase.from('deposits').delete().eq('room_id', room.id);

      // 3. Bersihkan tagihan sewa terkait kamar ini
      await supabase.from('rent_bills').delete().eq('room_id', room.id);

      // 4. Bersihkan kontrak sewa terkait kamar ini
      await supabase.from('contracts').delete().eq('room_id', room.id);

      // 5. Bersihkan tiket perawatan/keluhan fasilitas
      await supabase.from('maintenance_tickets').delete().eq('room_id', room.id);

      // 6. Bersihkan pencatatan meteran listrik & air
      await supabase.from('meter_readings').delete().eq('room_id', room.id);

      // 7. Hapus unit kamar
      const { error } = await supabase.from('rooms').delete().eq('id', room.id);
      if (error) throw error;

      // 8. Update state lokal
      setRooms(prev => prev.filter(r => r.id !== room.id));
      setContracts(prev => prev.filter(c => c.room_id !== room.id));
      alert(`Kamar ${room.room_code} beserta riwayat terkait berhasil dihapus.`);
    } catch (err: any) {
      alert('Gagal menghapus kamar: ' + err.message);
    }
  }

  // AKHIRI SEWA & KOSONGKAN KAMAR DARI MODAL JADWAL
  async function handleTerminateFromSchedule(contract: Contract) {
    const confirmMsg = `Check-out & Akhiri sewa untuk:\nPenghuni: ${contract.tenant?.full_name || '-'}\nKamar: ${contract.room?.room_code || '-'}\n\nStatus kamar akan otomatis dikembalikan menjadi KOSONG dan siap disewakan kembali.`;
    if (!confirm(confirmMsg)) return;

    try {
      // 1. Update kontrak jadi TERMINATED
      await supabase.from('contracts').update({ 
        status: 'TERMINATED', 
        updated_at: new Date().toISOString() 
      }).eq('id', contract.id);

      // 2. Kosongkan kamar
      if (contract.room_id) {
        await supabase.from('rooms').update({ 
          status: 'KOSONG', 
          updated_at: new Date().toISOString() 
        }).eq('id', contract.room_id);

        setRooms(prev => prev.map(r => r.id === contract.room_id ? { ...r, status: 'KOSONG' } : r));
      }

      // 3. Update daftar kontrak aktif
      setContracts(prev => prev.filter(c => c.id !== contract.id));
      alert(`Check-out selesai! Kamar ${contract.room?.room_code || ''} kini berstatus KOSONG.`);
    } catch (err: any) {
      alert('Gagal mengakhiri sewa: ' + err.message);
    }
  }

  const filteredRooms = rooms.filter((r) => {
    const matchSearch = (r.room_code + ' ' + r.name + ' ' + (r.facilities || '')).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchFloor = floorFilter === 'ALL' || String(r.floor) === floorFilter;
    return matchSearch && matchStatus && matchFloor;
  });

  // Filter untuk Jadwal Check-In & Check-Out
  const filteredSchedule = contracts.filter((c) => {
    const q = scheduleSearch.toLowerCase().trim();
    if (!q) return true;
    const tName = c.tenant?.full_name || '';
    const rCode = c.room?.room_code || '';
    return tName.toLowerCase().includes(q) || rCode.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <Navbar title="Kamar & Fasilitas" subtitle="Daftar unit kamar kos, jadwal check-in/out, ketersediaan, dan fasilitas" />

      {/* Top Action & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
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
            <option value="PERBAIKAN">Perbaikan</option>
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

        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* TOMBOL JADWAL CHECK-IN & CHECK-OUT */}
          <button
            onClick={() => setScheduleModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#064e3b] font-bold text-xs sm:text-sm border border-emerald-200 transition shadow-sm active:scale-95"
            title="Lihat Jadwal Kedatangan & Kepulangan Penghuni"
          >
            <CalendarDays className="w-4 h-4 text-emerald-700" />
            <span>Jadwal Check-In & Out ({contracts.length})</span>
          </button>

          {!isStaff && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4" /> Tambah Kamar
            </button>
          )}
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

            // Ambil data kontrak aktif untuk kamar ini (jika terisi)
            const activeContract = contracts.find(c => c.room_id === r.id);

            return (
              <div 
                key={r.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
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

                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg text-slate-900">{r.name}</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        Lt. {r.floor} . {r.dimensions || '3x4m'}
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-xl font-extrabold text-[#064e3b]">{formatRupiah(r.base_price)}</span>
                      <span className="text-xs text-slate-400">/ bulan</span>
                    </div>

                    {r.facilities && (
                      <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        {r.facilities}
                      </p>
                    )}

                    {/* STRIP INFO JADWAL CHECK-IN & CHECK-OUT UNTUK KAMAR TERISI */}
                    {activeContract ? (
                      <div className="mt-3 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span className="flex items-center gap-1.5 text-emerald-900 truncate max-w-[140px]">
                            <User className="w-3.5 h-3.5 text-emerald-700" />
                            {activeContract.tenant?.full_name || 'Penghuni'}
                          </span>
                          <span className="text-[10px] bg-emerald-200/70 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                            Penyewa Aktif
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] mt-1.5 pt-1.5 border-t border-emerald-200/60">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Check-In:</span>
                            <strong className="text-slate-700">{formatDateDisplay(activeContract.start_date)}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Check-Out:</span>
                            <strong className="text-amber-800">{formatDateDisplay(activeContract.end_date)}</strong>
                          </div>
                        </div>
                      </div>
                    ) : r.status === 'KOSONG' ? (
                      <div className="mt-3 py-1.5 px-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kamar siap disewakan (Tersedia)</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
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
                      {!isStaff && (
                        <button
                          onClick={() => handleOpenModal(r)}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
                      {isOwner && (
                        <button
                          onClick={() => handleDelete(r)}
                          className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition shadow-sm"
                          title="Hapus Kamar (Khusus Owner)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL JADWAL CHECK-IN & CHECK-OUT KAMAR */}
      {scheduleModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          onClick={() => setScheduleModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. STICKY HEADER */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                    Jadwal Check-In & Check-Out Kamar
                  </h3>
                  <p className="text-[11px] text-slate-400">Pantau kepulangan penghuni dan kedatangan sewa baru</p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 text-xs font-bold transition"
              >
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </button>
            </div>

            {/* TAB SELECTOR & SEARCH */}
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 space-y-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleTab('CHECKOUT')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                    scheduleTab === 'CHECKOUT'
                      ? 'bg-[#064e3b] text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Jadwal Check-Out / Selesai Sewa ({contracts.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScheduleTab('CHECKIN')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                    scheduleTab === 'CHECKIN'
                      ? 'bg-[#064e3b] text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Jadwal Check-In Awal ({contracts.length})</span>
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama penghuni atau kode kamar di jadwal..."
                  value={scheduleSearch}
                  onChange={(e) => setScheduleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600 bg-white"
                />
              </div>
            </div>

            {/* 2. SCROLLABLE SCHEDULE LIST */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {filteredSchedule.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-600">Tidak ada jadwal ditemukan</p>
                  <p className="text-xs text-slate-400 mt-1">Belum ada kontrak sewa aktif atau sesuaikan kata kunci pencarian.</p>
                </div>
              ) : (
                filteredSchedule.map((c) => {
                  const today = new Date();
                  const targetDate = new Date(scheduleTab === 'CHECKOUT' ? c.end_date : c.start_date);
                  const diffTime = targetDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  let daysBadge = null;
                  if (scheduleTab === 'CHECKOUT') {
                    if (diffDays < 0) {
                      daysBadge = (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                          Selesai Sewa Lewat {Math.abs(diffDays)} Hari
                        </span>
                      );
                    } else if (diffDays === 0) {
                      daysBadge = (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                          Hari Ini (Check-Out)
                        </span>
                      );
                    } else if (diffDays <= 7) {
                      daysBadge = (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          {diffDays} Hari Lagi
                        </span>
                      );
                    } else {
                      daysBadge = (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {diffDays} Hari Lagi
                        </span>
                      );
                    }
                  } else {
                    daysBadge = (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Mulai {formatDateDisplay(c.start_date)}
                      </span>
                    );
                  }

                  const phoneClean = (c.tenant?.phone || '').replace(/[^0-9]/g, '');
                  const waNumber = phoneClean.startsWith('0') ? '62' + phoneClean.substring(1) : phoneClean;

                  return (
                    <div 
                      key={c.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-200 hover:shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#064e3b] text-white font-mono font-bold text-xs">
                            {c.room?.room_code || 'KMR'}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{c.tenant?.full_name || 'Penghuni'}</span>
                          {daysBadge}
                        </div>

                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                          <span>
                            {scheduleTab === 'CHECKOUT' ? 'Tanggal Selesai (Check-Out): ' : 'Tanggal Masuk (Check-In): '}
                            <strong className="text-slate-800">
                              {formatDateDisplay(scheduleTab === 'CHECKOUT' ? c.end_date : c.start_date)}
                            </strong>
                          </span>
                          <span>Tarif: <strong>{formatRupiah(c.rent_price)}</strong></span>
                          <span>Kontrak: <code className="text-slate-600">{c.contract_number}</code></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {waNumber && (
                          <a
                            href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                              `Halo ${c.tenant?.full_name}, kami dari pengelola kos ingin konfirmasi jadwal ${
                                scheduleTab === 'CHECKOUT' ? 'check-out / selesai sewa kamar ' : 'check-in kamar '
                              }${c.room?.room_code}. Terima kasih!`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition"
                            title="Kirim Pesan WhatsApp ke Penghuni"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WA</span>
                          </a>
                        )}

                        {scheduleTab === 'CHECKOUT' && (isOwner || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleTerminateFromSchedule(c)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-xs transition shadow-sm"
                            title="Check-out penghuni dan ubah status kamar menjadi KOSONG"
                          >
                            <DoorClosed className="w-3.5 h-3.5 text-amber-600" />
                            <span>Selesai & Kosongkan</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 3. STICKY FOOTER */}
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50 text-xs text-slate-500">
              <span>Total {contracts.length} kamar terisi dengan kontrak aktif.</span>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT KAMAR (DENGAN HEADER & FOOTER STICKY) */}
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600 font-mono"
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
                    placeholder="Kamar 101"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Gedung Properti Kos</label>
                <select
                  value={formData.property_id}
                  onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600 bg-white"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Lantai</label>
                  <input
                    type="number"
                    min="1"
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
