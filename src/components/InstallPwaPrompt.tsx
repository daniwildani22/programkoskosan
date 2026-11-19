'use client';

import React, { useEffect, useState } from 'react';
import { Smartphone, Download, X } from 'lucide-react';

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Jika sudah berjalan di mode standalone PWA, sembunyikan banner
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) {
      alert('Untuk memasang di HP Android:\n1. Buka menu titik tiga (?) di pojok kanan atas browser Chrome.\n2. Pilih "Tambahkan ke Layar Utama" atau "Instal Aplikasi".\n3. Ikon aplikasi akan langsung muncul di menu HP Anda!');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  }

  if (isDismissed || !isInstallable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm animate-in slide-in-from-bottom duration-300">
      <div className="bg-[#064e3b] text-white p-3.5 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-emerald-300 border border-white/10">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold leading-tight truncate">Pasang Aplikasi di HP Android</h4>
            <p className="text-[10px] text-emerald-200/80 truncate">Akses cepat layar penuh tanpa browser</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 text-xs font-black shadow transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" /> Pasang
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg text-emerald-300/70 hover:text-white hover:bg-white/10 transition"
            title="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
