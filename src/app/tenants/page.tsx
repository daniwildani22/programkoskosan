'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import ImageUpload from '@/components/ImageUpload';
import { supabase } from '@/lib/supabase';
import { Tenant } from '@/types/database';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  DoorOpen, 
  StickyNote, 
  Edit3, 
  RefreshCw, 
  Image as ImageIcon,
  CheckCircle2,
  X
} from 'lucide-react';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    full_name: '',
    phone: '',
    id_card_number: '',
    occupation: '',
    origin_address: '',
    photo_url: '',
    notes: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });

  async function loadTenants() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenants(data || []);
    } catch (err: any) {
      alert('Gagal memuat data penghuni: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTenants();
  }, []);

  function openAddModal() {
    setFormData({
      id: '',
      full_name: '',
      phone: '',
      id_card_number: '',
      occupation: '',
      origin_address: '',
      photo_url: '',
      notes: '',
      status: 'ACTIVE'
    });
    setModalOpen(true);
  }

  function openEditModal(t: Tenant) {
    setFormData({
      id: t.id,
      full_name: t.full_name,
      phone: t.phone,
      id_card_number: t.id_card_number || '',
      occupation: t.occupation || '',
      origin_address: t.origin_address || '',
      photo_url: t.photo_url || '',
      notes: t.notes || '',
      status: (t.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE')
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.full_name || !formData.phone) {
      return alert('Nama lengkap dan nomor WhatsApp wajib diisi.');
    }

    setSaving(true);
    try {
      if (formData.id) {
        // Update
        const { error } = await supabase
          .from('tenants')
          .update({
            full_name: formData.full_name.trim(),
            phone: formData.phone.trim(),
            id_card_number: formData.id_card_number.trim(),
            occupation: formData.occupation.trim(),
            origin_address: formData.origin_address.trim(),
            photo_url: formData.photo_url.trim(),
            notes: formData.notes.trim(),
            status: formData.status
          })
          .eq('id', formData.id);

        if (error) throw error;
      } else {
        // Insert
        const count = tenants.length + 1;
        const tenantCode = 'PNG-' + ('000' + count).slice(-3);
        const newId = 'TNT_' + Date.now();

        const { error } = await supabase
          .from('tenants')
          .insert({
            id: newId,
            tenant_code: tenantCode,
            full_name: formData.full_name.trim(),
            phone: formData.phone.trim(),
            id_card_number: formData.id_card_number.trim(),
            occupation: formData.occupation.trim(),
            origin_address: formData.origin_address.trim(),
            photo_url: formData.photo_url.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.full_name)}&background=064e3b&color=ffffff&bold=true`,
            notes: formData.notes.trim(),
            status: 'ACTIVE'
          });

        if (error) throw error;
      }

      setModalOpen(false);
      loadTenants();
    } catch (err: any) {
      alert('Gagal menyimpan penghuni: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // Filter Data
  const filteredTenants = tenants.filter(t => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || 
      t.full_name.toLowerCase().includes(q) ||
      t.phone.toLowerCase().includes(q) ||
      (t.notes || '').toLowerCase().includes(q) ||
      (t.tenant_code || '').toLowerCase().includes(q);

    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      <Navbar title="Database Penghuni Kos" subtitle="Kelola data identitas, foto profil, riwayat sewa, dan kontak penghuni" />

      {/* Header Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Supabase PostgreSQL • Total: <strong>{tenants.length}</strong> penghuni
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadTenants}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-2xl bg-[#064e3b] hover:bg-[#047857] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Tambah Penghuni
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-5 bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama, nomor WhatsApp, catatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif Menyewa</option>
            <option value="INACTIVE">Non-Aktif / Alumni</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="mt-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 w-20">Foto</th>
                <th className="py-4 px-6">Penghuni</th>
                <th className="py-4 px-6">No. WhatsApp / Telp</th>
                <th className="py-4 px-6">Keterangan / Catatan</th>
                <th className="py-4 px-6">Pekerjaan & Asal</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Memuat database penghuni...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">Tidak ada data penghuni ditemukan.</p>
                    <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian Anda.</p>
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => {
                  const cleanPhone = t.phone.replace(/[^0-9]/g, '');
                  const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
                  const initials = t.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* FOTO COLUMN */}
                      <td className="py-4 px-6">
                        {t.photo_url ? (
                          <img
                            src={t.photo_url}
                            alt={t.full_name}
                            className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shadow-sm"
                            onError={(e) => {
                              (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.full_name)}&background=064e3b&color=ffffff&bold=true`;
                            }}
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#064e3b] to-[#059669] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                            {initials}
                          </div>
                        )}
                      </td>

                      {/* NAMA & KODE */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800">{t.full_name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold">
                            {t.tenant_code}
                          </span>
                          {t.id_card_number && <span>NIK: {t.id_card_number}</span>}
                        </div>
                      </td>

                      {/* NO WA */}
                      <td className="py-4 px-6">
                        <a
                          href={`https://wa.me/${waNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs border border-emerald-200 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {t.phone}
                        </a>
                      </td>

                      {/* KETERANGAN / CATATAN */}
                      <td className="py-4 px-6 max-w-xs">
                        {t.notes ? (
                          <div className="text-xs text-slate-700 bg-amber-50/60 border border-amber-200/60 p-2 rounded-xl flex items-start gap-1.5">
                            <StickyNote className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>{t.notes}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>

                      {/* PEKERJAAN & ASAL */}
                      <td className="py-4 px-6 text-xs text-slate-600">
                        <div className="font-semibold">{t.occupation || '-'}</div>
                        <div className="text-slate-400 mt-0.5">{t.origin_address || '-'}</div>
                      </td>

                      {/* STATUS */}
                      <td className="py-4 px-6">
                        {t.status === 'ACTIVE' ? (
                          <span className="kms-badge kms-badge-success">Aktif</span>
                        ) : (
                          <span className="kms-badge kms-badge-secondary">Non-Aktif</span>
                        )}
                      </td>

                      {/* AKSI */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shadow-sm"
                          title="Edit Penghuni"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Tenant */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">
                {formData.id ? 'Edit Data Penghuni' : 'Tambah Penghuni Baru'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama sesuai KTP"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="081234567890"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NIK / KTP</label>
                  <input
                    type="text"
                    placeholder="16 digit NIK"
                    value={formData.id_card_number}
                    onChange={(e) => setFormData({ ...formData, id_card_number: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <ImageUpload
                label="Foto Profil Penghuni"
                value={formData.photo_url}
                onChange={(url) => setFormData({ ...formData, photo_url: url })}
                folder="tenants"
                aspectRatio="square"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pekerjaan</label>
                  <input
                    type="text"
                    placeholder="Mahasiswa / Karyawan"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Sewa</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ACTIVE">Aktif Menyewa</option>
                    <option value="INACTIVE">Non-Aktif / Alumni</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Asal KTP</label>
                <textarea
                  rows={2}
                  placeholder="Kota / Daerah asal"
                  value={formData.origin_address}
                  onChange={(e) => setFormData({ ...formData, origin_address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan / Catatan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Misal: Bawa kendaraan motor, bayar tiap tanggal 1"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-2xl bg-[#064e3b] text-white font-bold text-sm hover:bg-[#047857] shadow-md transition-all disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Penghuni'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
