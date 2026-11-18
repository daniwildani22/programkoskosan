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
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  X,
  Home,
  Map,
  Share2,
  Navigation,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Compass
} from 'lucide-react';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Tambah / Edit State
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
    google_maps_url: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });

  // Modal Bagikan Lokasi State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedPropertyForShare, setSelectedPropertyForShare] = useState<Property | null>(null);
  const [recipientPhone, setRecipientPhone] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Expanded Map Cards State (id properti yang sedang menampilkan iframe peta)
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);

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

    // Dukungan tombol ESC di keyboard untuk menutup modal dengan cepat
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setModalOpen(false);
        setShareModalOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function getEffectiveMapsUrl(p: { name: string; address: string; google_maps_url?: string }) {
    if (p.google_maps_url && p.google_maps_url.trim().startsWith('http')) {
      return p.google_maps_url.trim();
    }
    const query = encodeURIComponent(`${p.name} ${p.address}`.trim());
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  function getEmbedMapUrl(p: { name: string; address: string; google_maps_url?: string }) {
    const query = encodeURIComponent(`${p.name}, ${p.address}`.trim());
    return `https://maps.google.com/maps?q=${query}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  }

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
        google_maps_url: prop.google_maps_url || '',
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
        google_maps_url: '',
        status: 'ACTIVE'
      });
    }
    setModalOpen(true);
  }

  function handleAutoGenerateMapsUrl() {
    if (!formData.name && !formData.address) {
      alert('Silakan isi Nama Bangunan Kos dan Alamat terlebih dahulu!');
      return;
    }
    const query = encodeURIComponent(`${formData.name} ${formData.address}`.trim());
    const generated = `https://www.google.com/maps/search/?api=1&query=${query}`;
    setFormData(prev => ({ ...prev, google_maps_url: generated }));
  }

  function handleOpenGoogleMapsSearch() {
    const query = encodeURIComponent(`${formData.name} ${formData.address}`.trim());
    window.open(`https://www.google.com/maps/search/${query}`, '_blank');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = {
        name: formData.name,
        property_code: formData.property_code,
        address: formData.address,
        owner_name: formData.owner_name,
        phone: formData.phone,
        total_floors: Number(formData.total_floors),
        photo_url: formData.photo_url,
        description: formData.description,
        google_maps_url: formData.google_maps_url ? formData.google_maps_url.trim() : null,
        status: formData.status
      };

      if (formData.id) {
        let { error } = await supabase
          .from('properties')
          .update(payload)
          .eq('id', formData.id);

        // Fallback jika kolom google_maps_url belum dibuat di database Supabase
        if (error && error.message.includes('google_maps_url')) {
          delete payload.google_maps_url;
          const retry = await supabase.from('properties').update(payload).eq('id', formData.id);
          error = retry.error;
        }

        if (error) throw error;
      } else {
        payload.id = 'PROP_' + Date.now();
        let { error } = await supabase
          .from('properties')
          .insert([payload]);

        // Fallback jika kolom google_maps_url belum dibuat di database Supabase
        if (error && error.message.includes('google_maps_url')) {
          delete payload.google_maps_url;
          const retry = await supabase.from('properties').insert([payload]);
          error = retry.error;
        }

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

  async function handleDelete(prop: Property) {
    if (!confirm(`Hapus properti "${prop.name}"? Semua kamar di dalam gedung ini mungkin akan ikut terhapus.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('properties').delete().eq('id', prop.id);
      if (error) throw error;
      setProperties(properties.filter(p => p.id !== prop.id));
    } catch (err: any) {
      alert('Gagal menghapus properti: ' + err.message);
    }
  }

  // Buka Modal Bagikan Lokasi
  function openShareModal(prop: Property) {
    setSelectedPropertyForShare(prop);
    setRecipientPhone('');
    setCopiedLink(false);
    setCopiedText(false);
    setShareModalOpen(true);
  }

  function getShareMessage(prop: Property) {
    const mapsLink = getEffectiveMapsUrl(prop);
    return `📍 *LOKASI KOS: ${prop.name.toUpperCase()}*\n\n` +
      `🏠 *Alamat*: ${prop.address}\n` +
      (prop.phone ? `📞 *Kontak/WA*: ${prop.phone}\n` : '') +
      `🗺️ *Google Maps*: ${mapsLink}\n\n` +
      `Silakan klik tautan Google Maps di atas untuk navigasi dan petunjuk arah langsung menuju lokasi kos kami. Kami tunggu kehadirannya! 🙏`;
  }

  function handleCopyMapsLink(prop: Property) {
    const link = getEffectiveMapsUrl(prop);
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function handleCopyShareText(prop: Property) {
    const text = getShareMessage(prop);
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  }

  function handleSendWhatsApp(prop: Property) {
    const text = getShareMessage(prop);
    let cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }
    const targetUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(targetUrl, '_blank');
  }

  return (
    <div>
      <Navbar 
        title="Daftar Bangunan & Properti Kos" 
        subtitle="Kelola gedung properti kos, fasilitas umum, dan bagikan titik Google Maps" 
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Gedung Properti Kos</h2>
          <p className="text-xs text-slate-500">Total {properties.length} properti terdaftar</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadProperties}
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
          {properties.map((p) => {
            const mapsUrl = getEffectiveMapsUrl(p);
            const isMapExpanded = expandedMapId === p.id;

            return (
              <div 
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden hover:shadow-md transition flex flex-col"
              >
                {/* Photo & Badges */}
                <div className="h-44 bg-slate-100 relative overflow-hidden group">
                  <img 
                    src={p.photo_url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80'} 
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-[#064e3b] text-white text-xs px-2.5 py-1 rounded-lg font-bold shadow-md">
                    {p.property_code}
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase shadow-sm ${
                      p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  {/* Tombol Cepat Bagikan Lokasi di Pojok Gambar */}
                  <button
                    onClick={() => openShareModal(p)}
                    className="absolute bottom-3 right-3 bg-white/95 hover:bg-white text-slate-700 hover:text-emerald-700 text-xs px-3 py-1.5 rounded-xl font-bold shadow-md backdrop-blur-sm flex items-center gap-1.5 transition active:scale-95"
                    title="Bagikan Lokasi Kos ke Calon Penghuni"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Bagikan Lokasi</span>
                  </button>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 leading-tight">{p.name}</h3>
                    
                    {/* Alamat & Direct Maps */}
                    <div className="flex items-start gap-2 text-slate-600 text-xs mt-2.5">
                      <MapPin className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                      <span className="leading-relaxed">{p.address}</span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-500 text-xs mt-2.5">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{p.phone || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>{p.total_floors || 1} Lantai</span>
                      </div>
                    </div>

                    {p.description && (
                      <p className="text-xs text-slate-600 mt-3 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        {p.description}
                      </p>
                    )}

                    {/* Google Maps Actions Card */}
                    <div className="mt-4 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100/80">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-emerald-700" /> Google Maps
                        </span>
                        {p.google_maps_url ? (
                          <span className="text-[10px] bg-emerald-200/70 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                            Terkonfigurasi
                          </span>
                        ) : (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">
                            Otomatis dari Alamat
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Tombol Buka di Tab Baru */}
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-2.5 rounded-lg bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/50 shadow-sm transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Buka di Maps</span>
                        </a>

                        {/* Tombol Toggle Tampilkan Peta Interaktif */}
                        <button
                          type="button"
                          onClick={() => setExpandedMapId(isMapExpanded ? null : p.id)}
                          className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-2.5 rounded-lg shadow-sm transition ${
                            isMapExpanded 
                              ? 'bg-emerald-700 text-white' 
                              : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/50'
                          }`}
                        >
                          <Map className="w-3.5 h-3.5" />
                          <span>{isMapExpanded ? 'Tutup Peta' : 'Lihat Peta'}</span>
                        </button>
                      </div>

                      {/* Embed Google Map Interaktif (Jika di-expand) */}
                      {isMapExpanded && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-emerald-200 shadow-inner bg-slate-100">
                          <iframe
                            title={`Peta Lokasi ${p.name}`}
                            width="100%"
                            height="180"
                            style={{ border: 0 }}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={getEmbedMapUrl(p)}
                          />
                          <div className="p-2 bg-white text-center border-t border-slate-100">
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(p.name + ' ' + p.address)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center justify-center gap-1"
                            >
                              <Navigation className="w-3 h-3" /> Petunjuk Arah ke Lokasi Ini &rarr;
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400 truncate max-w-[120px]">
                      Pemilik: <strong className="text-slate-700">{p.owner_name || 'Owner'}</strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openShareModal(p)}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                        title="Bagikan Lokasi"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Bagikan</span>
                      </button>
                      <button
                        onClick={() => handleOpenModal(p)}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                        title="Edit Data Properti"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition"
                        title="Hapus Properti"
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

      {/* MODAL BAGIKAN LOKASI (SHARE GOOGLE MAPS) */}
      {shareModalOpen && selectedPropertyForShare && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          onClick={() => setShareModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* STICKY HEADER */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 leading-tight">Bagikan Lokasi Kos</h3>
                  <p className="text-[11px] text-slate-400">{selectedPropertyForShare.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShareModalOpen(false)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 text-xs font-bold transition active:scale-95"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </button>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              {/* Info Box */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs space-y-1">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {selectedPropertyForShare.name}
                </div>
                <div className="text-slate-600 pl-5 leading-relaxed">
                  {selectedPropertyForShare.address}
                </div>
              </div>

              {/* Kirim Langsung via WhatsApp */}
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100/80">
                <label className="text-xs font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-700" />
                  Kirim Lokasi via WhatsApp
                </label>
                <p className="text-[11px] text-emerald-800/80 mb-2.5">
                  Masukkan nomor WhatsApp calon penghuni (atau kosongkan untuk memilih kontak di WhatsApp).
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    placeholder="Contoh: 08123456789"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-emerald-200 text-xs bg-white focus:outline-emerald-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(selectedPropertyForShare)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition active:scale-95 shrink-0"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Kirim WA
                  </button>
                </div>
              </div>

              {/* Salin Link & Teks Lengkap */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-700">Tautan Google Maps</p>
                    <p className="text-xs text-slate-500 truncate font-mono">
                      {getEffectiveMapsUrl(selectedPropertyForShare)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyMapsLink(selectedPropertyForShare)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Tersalin!' : 'Salin Link'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-700">Pesan Lengkap (Teks + Alamat + Link)</p>
                    <p className="text-xs text-slate-400 truncate">
                      Format pesan rapi yang siap ditempelkan di chat.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyShareText(selectedPropertyForShare)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#064e3b] hover:bg-[#065f46] text-white text-xs font-semibold shrink-0 shadow-sm"
                  >
                    {copiedText ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedText ? 'Tersalin!' : 'Salin Pesan'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* STICKY FOOTER */}
            <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/90 backdrop-blur-sm z-10 text-xs">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedPropertyForShare.name + ' ' + selectedPropertyForShare.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
              >
                <Navigation className="w-3.5 h-3.5" /> Buka Navigasi Rute &rarr;
              </a>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT PROPERTI (DENGAN HEADER & FOOTER STICKY + BACKDROP CLICK TO CLOSE) */}
      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          onClick={() => setModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. STICKY HEADER (TETAP DI ATAS, MUDAH DITUTUP) */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                    {formData.id ? 'Edit Properti Kos' : 'Tambah Properti Kos Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Isi kelengkapan data gedung & titik maps</p>
                </div>
              </div>

              {/* Tombol Tutup Besar & Jelas di Sudut Kanan Atas */}
              <button 
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 text-xs font-bold transition active:scale-95 shadow-sm"
                title="Tutup Jendela (Esc / Klik Luar)"
              >
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </button>
            </div>

            {/* 2. SCROLLABLE FORM BODY (BISA DI-SCROLL LANCAR TANPA KELUAR LAYAR) */}
            <form id="propertyForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Kode Properti</label>
                  <input
                    type="text"
                    required
                    value={formData.property_code}
                    onChange={(e) => setFormData({ ...formData, property_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-emerald-600"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                  placeholder="Jl. Mawar No. 12, Sleman, Yogyakarta"
                />
              </div>

              {/* INTEGRASI GOOGLE MAPS */}
              <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Titik Lokasi Google Maps
                  </label>
                  <span className="text-[10px] text-slate-400">Opsional</span>
                </div>

                <input
                  type="url"
                  value={formData.google_maps_url}
                  onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600 bg-white"
                  placeholder="https://maps.app.goo.gl/... atau https://goo.gl/maps/..."
                />

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoGenerateMapsUrl}
                    className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                  >
                    <Compass className="w-3 h-3" /> Buat dari Alamat
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenGoogleMapsSearch}
                    className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 px-2.5 py-1 rounded-lg transition flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Cari di Maps
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Pemilik / Pengelola</label>
                  <input
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">No. Telepon / WA</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                    placeholder="08123456789"
                  />
                </div>
              </div>

              {/* Komponen Unggah Foto Ramping */}
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                  placeholder="Fasilitas parkir luas, dekat kampus, dll."
                />
              </div>
            </form>

            {/* 3. STICKY FOOTER (TETAP DI BAWAH, TOMBOL BATAL & SIMPAN SELALU TERLIHAT) */}
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
                form="propertyForm"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Properti'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
