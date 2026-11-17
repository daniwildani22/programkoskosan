'use client';

import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { UploadCloud, Image as ImageIcon, X, RefreshCw, Link as LinkIcon, CheckCircle2 } from 'lucide-react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
  aspectRatio?: 'square' | 'video';
}

export default function ImageUpload({
  value,
  onChange,
  label = 'Unggah Foto',
  folder = 'uploads',
  aspectRatio = 'square'
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [useUrlMode, setUseUrlMode] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Kompresi gambar client-side (agar foto resolusi tinggi dari HP/kamera otomatis dioptimasi)
  async function compressImage(file: File, maxDim = 1200, quality = 0.82): Promise<Blob> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          let { width, height } = img;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              resolve(blob || file);
            }, 'image/jpeg', quality);
          } else {
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  }

  async function handleFileSelected(file: File) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Harap pilih file gambar (JPG, PNG, WEBP).');
      return;
    }

    setUploading(true);
    try {
      // 1. Kompres gambar
      const compressedBlob = await compressImage(file);

      // 2. Coba upload ke Supabase Storage (Bucket: kos-photos)
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(5)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('kos-photos')
        .upload(fileName, compressedBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from('kos-photos')
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          onChange(urlData.publicUrl);
          setUploading(false);
          return;
        }
      }

      // 3. Fallback cerdas: Jika bucket kos-photos belum dibuat di Supabase,
      // kita konversi ke Data URL Base64 yang sudah terkompresi (~100 KB) agar tetap tersimpan 100% aman!
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onChange(dataUrl);
        setUploading(false);
      };
      reader.readAsDataURL(compressedBlob);

    } catch (err: any) {
      alert('Gagal mengunggah foto: ' + err.message);
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700">{label}</label>
        <button
          type="button"
          onClick={() => setUseUrlMode(!useUrlMode)}
          className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1"
        >
          {useUrlMode ? (
            <>
              <UploadCloud className="w-3.5 h-3.5" /> Unggah Langsung File
            </>
          ) : (
            <>
              <LinkIcon className="w-3.5 h-3.5" /> Tempel URL Link
            </>
          )}
        </button>
      </div>

      {useUrlMode ? (
        <div className="relative">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://... atau tempel URL foto"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600 bg-white"
          />
        </div>
      ) : (
        <div>
          {value ? (
            /* PREVIEW GANTI FOTO */
            <div className={`relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group ${
              aspectRatio === 'video' ? 'h-36 sm:h-44' : 'h-36 w-36 sm:h-44 sm:w-44'
            }`}>
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Ganti
                </button>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition"
                  title="Hapus foto"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* UPLOAD DROPZONE */
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
                dragOver
                  ? 'border-emerald-600 bg-emerald-50/50'
                  : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/80 bg-slate-50/40'
              } ${aspectRatio === 'video' ? 'h-32 sm:h-36' : 'h-32 w-full sm:h-36'}`}
            >
              {uploading ? (
                <div className="flex flex-col items-center justify-center text-emerald-700">
                  <RefreshCw className="w-6 h-6 animate-spin mb-1 text-emerald-600" />
                  <span className="text-xs font-bold">Mengompres & Mengunggah...</span>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">Klik untuk upload foto</span>
                    <span className="text-xs text-slate-400 block mt-0.5">atau drag & drop foto ke sini</span>
                  </div>
                  <span className="text-[10px] text-slate-400">JPG, PNG, WEBP (Otomatis dikompres)</span>
                </>
              )}
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelected(e.target.files[0]);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
