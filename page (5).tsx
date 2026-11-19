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
  AlertCircle,
  Crown,
  Shield,
  UserCheck
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

  function setDemoAccount(u: string, p: string) {
    setUsername(u);
    setPassword(p);
    setErrorMsg('');
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#064e3b] via-[#065f46] to-slate-900 p-4 sm:p-6">
      {/* Background Ornaments */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-emerald-400 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-emerald-600 blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-10 overflow-hidden">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#064e3b] mx-auto mb-3 sm:mb-4 shadow-sm">
            <Building2 className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">KOS MANAGEMENT</h1>
          <p className="text-[11px] sm:text-xs text-emerald-700 font-bold uppercase tracking-wider mt-1">Finora Cloud Edition</p>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5">Pilih hak akses atau masuk dengan akun Anda.</p>
        </div>

        {/* Quick Role Switcher Buttons */}
        <div className="mb-6 p-2 rounded-2xl bg-slate-50 border border-slate-200/80">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 text-center">
            Pilihan Cepat Akun Demo (Uji Hak Akses):
          </p>
          <div className="grid grid-cols-3 gap-1.5 mt-1">
            <button
              type="button"
              onClick={() => setDemoAccount('admin', 'admin123')}
              className={`p-2 rounded-xl text-center transition flex flex-col items-center justify-center gap-1 border ${
                username === 'admin' 
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <Crown className="w-4 h-4" />
              <span className="text-[10px] font-bold">Owner</span>
            </button>

            <button
              type="button"
              onClick={() => setDemoAccount('pengelola', 'admin123')}
              className={`p-2 rounded-xl text-center transition flex flex-col items-center justify-center gap-1 border ${
                username === 'pengelola' 
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm' 
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span className="text-[10px] font-bold">Admin</span>
            </button>

            <button
              type="button"
              onClick={() => setDemoAccount('user', 'user123')}
              className={`p-2 rounded-xl text-center transition flex flex-col items-center justify-center gap-1 border ${
                username === 'user' 
                  ? 'bg-[#064e3b] text-white border-emerald-800 shadow-sm' 
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span className="text-[10px] font-bold">Staf</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 mb-1.5 block">Username Akun</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full pl-11 pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-emerald-600 focus:border-emerald-600 transition"
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
                className="w-full pl-11 pr-11 py-2.5 sm:py-3 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-emerald-600 focus:border-emerald-600 transition"
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
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/20 transition-all duration-200 disabled:opacity-70 mt-2 active:scale-95"
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

        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Sistem Keamanan Berbasis Peran: <strong>Owner</strong> (Superadmin), <strong>Admin</strong> (Pengelola), dan <strong>Staf</strong> (Lapangan).
          </p>
        </div>
      </div>
    </div>
  );
}
