'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import ImageUpload from '@/components/ImageUpload';
import { supabase } from '@/lib/supabase';
import { Property } from '@/types/database';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Phone, 
  Layers, 
  Edit3, 
  RefreshCw, 
  CheckCircle2, 
  X,
  Home
} from 'lucide-react';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    property_code: '',
    name: '',
    address: '',
    owner_name: '',
    phone: '',
    total_floors: 1,
    photo_url: '',
    description: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });

  async function loadProperties() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProperties(data || []);
    } catch (err: any) {
      alert('Gagal memuat properti: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProperties();
  }, []);

  function handleOpenModal(prop?: Property) {
    if (prop) {
      setFormData({
        id: prop.id,
        property_code: prop.property_code,
        name: prop.name,
        address: prop.address,
        owner_name: prop.owner_name || '',
        phone: prop.phone || '',
        total_floors: prop.total_floors || 1,
        photo_url: prop.photo_url || '',
        description: prop.description || '',
        status: prop.status
      });
    } else {
      setFormData({
        id: '',
        property_code: 'KOS-' + (properties.length + 1).toString().padStart(2, '0'),
        name: '',
        address: '',
        owner_name: 'Owner / Administrator',
        phone: '',
        total_floors: 2,
        photo_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80',
        description: '',
        status: 'ACTIVE'
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
          .from('properties')
          .update({
            name: formData.name,
            property_code: formData.property_code,
            address: formData.address,
            owner_name: formData.owner_name,
            phone: formData.phone,
            total_floors: Number(formData.total_floors),
            photo_url: formData.photo_url,
            description: formData.description,
            status: formData.status
          })
          .eq('id', formData.id);
        if (error) throw error;
      } else {
        const newId = 'PROP_' + Date.now();
        const { error } = await supabase
          .from('properties')
          .insert([{
            id: newId,
            property_code: formData.property_code,
            name: formData.name,
            address: formData.address,
            owner_name: formData.owner_name,
            phone: formData.phone,
            total_floors: Number(formData.total_floors),
            photo_url: formData.photo_url,
            description: formData.description,
            status: formData.status
          }]);
        if (error) throw error;
      }

      setModalOpen(false);
      await loadProperties();
    } catch (err: any) {
      alert('Gagal menyimpan properti: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Navbar title="Properti Kos" subtitle="Kelola bangunan rumah kos, alamat, dan kepemilikan aset" />

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Daftar Properti Kos</h2>
          <p className="text-sm text-slate-500">Total {properties.length} properti terdaftar</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadProperties}
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
            <Plus className="w-4 h-4" /> Tambah Properti
          </button>
        </div>
      </div>

      {/* Property Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
          Memuat data properti...
        </div>
      ) : properties.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Home className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-700">Belum ada properti terdaftar</p>
          <p className="text-xs text-slate-400 mt-1">Klik tombol 'Tambah Properti' untuk mendaftarkan gedung kos pertama Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((p) => (
            <div 
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition flex flex-col"
            >
              <div className="h-44 bg-slate-100 relative overflow-hidden">
                <img 
                  src={p.photo_url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80'} 
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-[#064e3b] text-white text-xs px-2.5 py-1 rounded-lg font-bold shadow-md">
                  {p.property_code}
                </div>
                <div className="absolute top-3 right-3">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase shadow-sm ${
                    p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {p.status}
                  </span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 leading-tight">{p.name}</h3>
                  <div className="flex items-start gap-2 text-slate-500 text-xs mt-2">
                    <MapPin className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                    <span>{p.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs mt-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs mt-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>{p.total_floors || 1} Lantai</span>
                  </div>
                  {p.description && (
                    <p className="text-xs text-slate-600 mt-3 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {p.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Pemilik: <strong className="text-slate-700">{p.owner_name || 'Owner'}</strong></span>
                  <button
                    onClick={() => handleOpenModal(p)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Properti
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">
                {formData.id ? 'Edit Properti Kos' : 'Tambah Properti Kos Baru'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Kode Properti</label>
                  <input
                    type="text"
                    required
                    value={formData.property_code}
                    onChange={(e) => setFormData({ ...formData, property_code: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600"
                    placeholder="Contoh: KOS-01"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Jumlah Lantai</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.total_floors}
                    onChange={(e) => setFormData({ ...formData, total_floors: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Nama Bangunan Kos</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600"
                  placeholder="Contoh: Kos Graha Asri Emerald"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Alamat Lengkap</label>
                <textarea
                  required
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600"
                  placeholder="Jl. Mawar No. 12, Sleman, Yogyakarta"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Nama Pemilik / Pengelola</label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">No. Telepon / WA</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600"
                    placeholder="08123456789"
                  />
                </div>
              </div>

              <ImageUpload
                label="Foto Bangunan Kos"
                value={formData.photo_url}
                onChange={(url) => setFormData({ ...formData, photo_url: url })}
                folder="properties"
                aspectRatio="video"
              />

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Keterangan Tambahan</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600"
                  placeholder="Fasilitas parkir luas, dekat kampus, dll."
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white text-sm font-bold shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Properti'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
