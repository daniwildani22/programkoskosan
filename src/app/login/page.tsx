'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Building2, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await login(username, password);
      if (res.success) {
        router.push('/');
      } else {
        setErrorMsg(res.message || 'Login gagal. Periksa kembali username dan password.');
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#064e3b] via-[#065f46] to-slate-900 p-4 sm:p-6">
      {/* Background Ornaments */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-emerald-400 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-emerald-600 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10 overflow-hidden">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#064e3b] mx-auto mb-4 shadow-sm">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">KOS MANAGEMENT</h1>
          <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mt-1">Finora Cloud Edition</p>
          <p className="text-sm text-slate-500 mt-2">Silakan login untuk mengakses dashboard operasional kos.</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">Username Akun</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username (cth: admin)"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-emerald-600 focus:border-emerald-600 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Password</label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password..."
                className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:outline-emerald-600 focus:border-emerald-600 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white font-bold text-sm shadow-lg shadow-emerald-950/20 transition-all duration-200 disabled:opacity-70 mt-2"
          >
            {loading ? (
              <span>Memverifikasi...</span>
            ) : (
              <>
                <span>Masuk ke Sistem</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Default Credentials Box */}
        <div className="mt-8 pt-6 border-t border-slate-100 bg-slate-50 p-4 rounded-2xl text-xs text-slate-600">
          <div className="flex items-center gap-2 text-emerald-800 font-bold mb-1">
            <ShieldCheck className="w-4 h-4" /> Akun Bawaan (Default Owner):
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 font-mono">
            <div>Username: <strong className="text-slate-900">admin</strong></div>
            <div>Password: <strong className="text-slate-900">admin123</strong></div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Password dapat diubah kapan saja melalui menu <strong>Pengaturan &gt; Pengguna</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
