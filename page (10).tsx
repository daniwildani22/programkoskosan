'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { User, Setting, CashBankAccount } from '@/types/database';
import { 
  Settings, 
  Users, 
  Bell, 
  CreditCard, 
  Plus, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  Shield, 
  MessageSquare,
  Lock,
  KeyRound,
  Smartphone,
  Eye,
  EyeOff
} from 'lucide-react';

export default function SettingsPage() {
  const { currentUser, updateUserPassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'USERS' | 'NOTIF' | 'BANK'>('USERS');
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [accounts, setAccounts] = useState<CashBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // User Modal State
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    role: 'ADMIN' as 'OWNER' | 'ADMIN' | 'STAFF',
    phone: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
  });

  // Password Modal State (Untuk Atur Password User Lain oleh Owner)
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Ganti Password Sendiri State
  const [myNewPassword, setMyNewPassword] = useState('');
  const [myPwdSuccess, setMyPwdSuccess] = useState(false);

  // Notif Form State
  const [notifForm, setNotifForm] = useState({
    owner_phone: '081234567890',
    wa_template: 'Halo {nama}, tagihan sewa kamar {kamar} periode {periode} sebesar {total} telah terbit. Jatuh tempo: {tgl}. Silakan transfer ke rekening {rekening}. Terima kasih!'
  });

  async function loadData() {
    setLoading(true);
    try {
      const [
        { data: uData },
        { data: sData },
        { data: aData }
      ] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('settings').select('*'),
        supabase.from('cash_bank_accounts').select('*').order('account_name', { ascending: true })
      ]);

      setUsers(uData || []);
      setSettings(sData || []);
      setAccounts(aData || []);

      if (sData) {
        const phoneSet = sData.find(s => s.key === 'owner_phone');
        const waSet = sData.find(s => s.key === 'wa_template');
        if (phoneSet) setNotifForm(prev => ({ ...prev, owner_phone: phoneSet.value }));
        if (waSet) setNotifForm(prev => ({ ...prev, wa_template: waSet.value }));
      }
    } catch (err: any) {
      alert('Gagal memuat pengaturan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const newId = 'USR_' + Date.now();
      const initialPassword = userForm.password.trim() || 'admin123';

      const { error } = await supabase.from('users').insert([{
        id: newId,
        username: userForm.username.trim().toLowerCase(),
        password_hash: initialPassword,
        full_name: userForm.full_name,
        email: userForm.email,
        role: userForm.role,
        phone: userForm.phone,
        status: userForm.status
      }]);

      if (error) throw error;
      setUserModalOpen(false);
      setUserForm({ username: '', password: '', full_name: '', email: '', role: 'ADMIN', phone: '', status: 'ACTIVE' });
      await loadData();
      alert(`Pengguna baru berhasil ditambahkan! Password awal: ${initialPassword}`);
    } catch (err: any) {
      alert('Gagal menambahkan user: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleOpenChangePassword(u: User) {
    setSelectedUser(u);
    setNewPassword('');
    setShowPwd(false);
    setPwdModalOpen(true);
  }

  async function handleSaveUserPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || !newPassword.trim()) return;
    setSaving(true);
    try {
      const res = await updateUserPassword(selectedUser.id, newPassword.trim());
      if (res.success) {
        alert(`Password untuk pengguna "${selectedUser.username}" berhasil diperbarui!`);
        setPwdModalOpen(false);
      } else {
        alert('Gagal mengubah password: ' + res.message);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveMyPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !myNewPassword.trim()) return;
    setSaving(true);
    try {
      const res = await updateUserPassword(currentUser.id, myNewPassword.trim());
      if (res.success) {
        setMyPwdSuccess(true);
        setMyNewPassword('');
        setTimeout(() => setMyPwdSuccess(false), 4000);
      } else {
        alert('Gagal mengubah password: ' + res.message);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotif(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await supabase.from('settings').upsert([
        { id: 'SET_OWNER_PHONE', key: 'owner_phone', value: notifForm.owner_phone, category: 'NOTIFICATION' },
        { id: 'SET_WA_TEMPLATE', key: 'wa_template', value: notifForm.wa_template, category: 'NOTIFICATION' }
      ]);
      alert('Pengaturan notifikasi berhasil disimpan!');
    } catch (err: any) {
      alert('Gagal menyimpan notifikasi: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Navbar title="Pengaturan Sistem & Pengguna" subtitle="Kelola hak akses akun, kata sandi pengguna, notifikasi WhatsApp, dan profil sistem" />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('USERS')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'USERS' ? 'bg-[#064e3b] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" /> Pengguna & Atur Password
        </button>

        <button
          onClick={() => setActiveTab('NOTIF')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'NOTIF' ? 'bg-[#064e3b] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-4 h-4" /> Notifikasi WhatsApp Owner
        </button>

        <button
          onClick={() => setActiveTab('BANK')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${
            activeTab === 'BANK' ? 'bg-[#064e3b] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Rekening Pembayaran
        </button>
      </div>

      {/* TAB 1: USERS & PASSWORD */}
      {activeTab === 'USERS' && (
        <div className="space-y-6">
          {/* Section: Ganti Password Akun Saya */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#064e3b] flex items-center justify-center shrink-0">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="flex-1 max-w-xl">
                <h3 className="text-base font-bold text-slate-800">Ganti Password Akun Saya</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Anda sedang login sebagai <strong>{currentUser?.full_name || 'Owner'}</strong> (Username: <code>{currentUser?.username || 'admin'}</code>).
                </p>

                {myPwdSuccess && (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Password Anda berhasil diperbarui! Gunakan password baru ini pada login berikutnya.</span>
                  </div>
                )}

                <form onSubmit={handleSaveMyPassword} className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="Masukkan password baru Anda..."
                      value={myNewPassword}
                      onChange={(e) => setMyNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving || !myNewPassword.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white text-xs font-bold shadow-md transition disabled:opacity-50 shrink-0"
                  >
                    Simpan Password Saya
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Section: Daftar Semua Pengguna & Tombol Atur Password */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Daftar Pengguna Sistem</h3>
                <p className="text-xs text-slate-500">Kelola akun staf, hak akses, dan atur ulang kata sandi (password) masing-masing staf</p>
              </div>
              <button
                onClick={() => setUserModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white font-semibold text-sm shadow-md transition"
              >
                <Plus className="w-4 h-4" /> Tambah Pengguna Baru
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-4 px-6">Username</th>
                    <th className="py-4 px-6">Nama Lengkap</th>
                    <th className="py-4 px-6">Peran (Role)</th>
                    <th className="py-4 px-6">Kontak</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Atur Password</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Belum ada pengguna. Akun utama: <strong>admin (Owner)</strong>
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-6 font-mono font-bold text-slate-900">{u.username}</td>
                        <td className="py-4 px-6 font-semibold text-slate-800">{u.full_name}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                            u.role === 'OWNER' ? 'bg-black text-white' :
                            u.role === 'ADMIN' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            <Shield className="w-3 h-3" /> {u.role}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-600 text-xs">
                          <div>{u.email || '-'}</div>
                          <div>{u.phone || '-'}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase bg-emerald-100 text-emerald-800">
                            {u.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleOpenChangePassword(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#064e3b] font-bold text-xs transition border border-emerald-200 shadow-sm"
                          >
                            <KeyRound className="w-3.5 h-3.5" /> Atur Password
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NOTIFIKASI OWNER */}
      {activeTab === 'NOTIF' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 max-w-2xl">
          <h3 className="text-lg font-bold text-slate-800 mb-1">Konfigurasi Notifikasi WhatsApp</h3>
          <p className="text-xs text-slate-500 mb-6">Setel nomor telepon owner untuk menerima laporan dan format pesan tagihan ke penghuni</p>

          <form onSubmit={handleSaveNotif} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" /> Nomor WhatsApp Owner
              </label>
              <input
                type="text"
                required
                value={notifForm.owner_phone}
                onChange={(e) => setNotifForm({ ...notifForm, owner_phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-emerald-600"
                placeholder="Contoh: 081234567890"
              />
              <p className="text-[11px] text-slate-400 mt-1">Nomor ini akan menerima pesan ringkasan pembayaran dan keluhan baru dari penghuni.</p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" /> Template Pesan Tagihan Sewa
              </label>
              <textarea
                rows={4}
                required
                value={notifForm.wa_template}
                onChange={(e) => setNotifForm({ ...notifForm, wa_template: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">Gunakan tag: <code>{'{nama}'}</code>, <code>{'{kamar}'}</code>, <code>{'{periode}'}</code>, <code>{'{total}'}</code>, <code>{'{rekening}'}</code>.</p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white text-sm font-bold shadow-md transition"
              >
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: REKENING */}
      {activeTab === 'BANK' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Daftar Rekening Pembayaran Kos</h3>
              <p className="text-xs text-slate-500">Nomor rekening ini dicantumkan pada kuitansi dan pesan tagihan sewa ke penghuni</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {accounts.map(acc => (
              <div key={acc.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                    {acc.bank_name}
                  </span>
                  <div className="text-lg font-mono font-extrabold text-slate-900 mt-2">
                    {acc.account_number}
                  </div>
                  <div className="text-xs text-slate-500">a.n <strong>{acc.holder_name}</strong> ({acc.account_name})</div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                  Aktif
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Tambah User Baru (Lengkap dengan Input Password) */}
      {userModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          onClick={() => setUserModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. STICKY HEADER */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 leading-tight">Tambah Pengguna Baru</h3>
                  <p className="text-[11px] text-slate-400">Atur akses login admin & staf kos</p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setUserModalOpen(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 text-xs font-bold transition active:scale-95 shadow-sm"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </button>
            </div>

            {/* 2. SCROLLABLE FORM BODY */}
            <form id="addUserForm" onSubmit={handleAddUser} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Username Login</label>
                <input
                  type="text"
                  required
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono focus:outline-emerald-600"
                  placeholder="staf_budi"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Password Akun</label>
                <input
                  type="text"
                  required
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-emerald-600"
                  placeholder="Password awal (cth: rahasia123)"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-emerald-600"
                  placeholder="Budi Santoso"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Peran (Role)</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600 bg-white"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="STAFF">STAFF</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">No. Telepon / WA</label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                    placeholder="08123456789"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Email</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                  placeholder="budi@gmail.com"
                />
              </div>
            </form>

            {/* 3. STICKY FOOTER */}
            <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/90 backdrop-blur-sm z-10">
              <button 
                type="button" 
                onClick={() => setUserModalOpen(false)} 
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs sm:text-sm font-semibold hover:bg-white transition"
              >
                Batal
              </button>
              <button 
                type="submit" 
                form="addUserForm"
                disabled={saving} 
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Atur Ulang Password Pengguna */}
      {pwdModalOpen && selectedUser && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          onClick={() => setPwdModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. STICKY HEADER */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
              <div>
                <h3 className="text-base font-bold text-slate-800 leading-tight">Atur Password Pengguna</h3>
                <p className="text-[11px] text-slate-400 font-mono">User: {selectedUser.username} ({selectedUser.full_name})</p>
              </div>
              <button 
                type="button"
                onClick={() => setPwdModalOpen(false)} 
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 text-xs font-bold transition active:scale-95 shadow-sm"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </button>
            </div>

            {/* 2. SCROLLABLE FORM BODY */}
            <form id="pwdForm" onSubmit={handleSaveUserPassword} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">Password Baru</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ketik password baru..."
                    className="w-full pl-10 pr-10 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-emerald-600 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Pengguna akan langsung dapat login menggunakan password baru ini.</p>
              </div>
            </form>

            {/* 3. STICKY FOOTER */}
            <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/90 backdrop-blur-sm z-10">
              <button 
                type="button" 
                onClick={() => setPwdModalOpen(false)} 
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs sm:text-sm font-semibold hover:bg-white transition"
              >
                Batal
              </button>
              <button 
                type="submit" 
                form="pwdForm"
                disabled={saving || !newPassword.trim()} 
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
