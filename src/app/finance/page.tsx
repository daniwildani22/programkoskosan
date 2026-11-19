'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { supabase, formatRupiah, formatDateDisplay } from '@/lib/supabase';
import { CashBankAccount, CashMutation } from '@/types/database';
import { 
  Wallet, 
  Building2, 
  Plus, 
  CreditCard, 
  Edit3, 
  RefreshCw, 
  ArrowRightLeft, 
  CheckCircle2, 
  X,
  QrCode
} from 'lucide-react';

export default function FinancePage() {
  const [accounts, setAccounts] = useState<CashBankAccount[]>([]);
  const [mutations, setMutations] = useState<CashMutation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    account_type: 'BANK' as 'BANK' | 'CASH' | 'EWALLET',
    account_name: '',
    bank_name: '',
    account_number: '',
    holder_name: '',
    balance: 0,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    notes: ''
  });

  async function loadData() {
    setLoading(true);
    try {
      const [{ data: accs }, { data: muts }] = await Promise.all([
        supabase.from('cash_bank_accounts').select('*').order('created_at', { ascending: true }),
        supabase.from('cash_mutations').select('*').order('mutation_date', { ascending: false }).limit(20)
      ]);

      setAccounts(accs || []);
      setMutations(muts || []);
    } catch (err: any) {
      alert('Gagal memuat data kas & rekening: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openAddModal() {
    setFormData({
      id: '',
      account_type: 'BANK',
      account_name: '',
      bank_name: '',
      account_number: '',
      holder_name: '',
      balance: 0,
      status: 'ACTIVE',
      notes: ''
    });
    setModalOpen(true);
  }

  function openEditModal(a: CashBankAccount) {
    setFormData({
      id: a.id,
      account_type: a.account_type,
      account_name: a.account_name,
      bank_name: a.bank_name !== '-' ? a.bank_name : '',
      account_number: a.account_number !== '-' ? a.account_number : '',
      holder_name: a.holder_name !== '-' ? a.holder_name : '',
      balance: a.current_balance,
      status: a.status,
      notes: a.notes || ''
    });
    setModalOpen(true);
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.account_name) return alert('Nama akun wajib diisi.');

    setSaving(true);
    try {
      if (formData.id) {
        // Update existing account
        const { error } = await supabase
          .from('cash_bank_accounts')
          .update({
            account_type: formData.account_type,
            account_name: formData.account_name.trim(),
            bank_name: formData.bank_name.trim() || '-',
            account_number: formData.account_number.trim() || '-',
            holder_name: formData.holder_name.trim() || '-',
            current_balance: Number(formData.balance) || 0,
            status: formData.status,
            notes: formData.notes.trim()
          })
          .eq('id', formData.id);

        if (error) throw error;
      } else {
        // Create new account
        const count = accounts.length + 1;
        const code = 'ACC-' + ('000' + count).slice(-3);
        const newId = 'ACC_' + Date.now();
        const initialBal = Number(formData.balance) || 0;

        const { error } = await supabase
          .from('cash_bank_accounts')
          .insert({
            id: newId,
            account_code: code,
            account_type: formData.account_type,
            account_name: formData.account_name.trim(),
            bank_name: formData.bank_name.trim() || '-',
            account_number: formData.account_number.trim() || '-',
            holder_name: formData.holder_name.trim() || '-',
            initial_balance: initialBal,
            current_balance: initialBal,
            status: formData.status,
            notes: formData.notes.trim()
          });

        if (error) throw error;
      }

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      alert('Gagal menyimpan rekening: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const totalBalance = accounts.reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0);

  return (
    <div>
      <Navbar title="Kas & Rekening Bank" subtitle="Kelola rekening penerimaan sewa, buku kas fisik, dan riwayat mutasi" />

      {/* Header Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Total Likuiditas: <strong>{formatRupiah(totalBalance)}</strong> ({accounts.length} rekening)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadData}
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-2xl bg-[#064e3b] hover:bg-[#047857] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Tambah Rekening / Kas
          </button>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            Memuat rekening kas & bank...
          </div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
            <Wallet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">Belum ada rekening kas atau bank terdaftar.</p>
            <button
              onClick={openAddModal}
              className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
            >
              Tambah Rekening Pertama
            </button>
          </div>
        ) : (
          accounts.map((acc) => {
            const isCash = acc.account_type === 'CASH';
            const isEwallet = acc.account_type === 'EWALLET';

            return (
              <div 
                key={acc.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                      isCash 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : isEwallet 
                        ? 'bg-cyan-50 text-cyan-700' 
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {isCash ? <Wallet className="w-3.5 h-3.5" /> : isEwallet ? <QrCode className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                      {acc.account_type}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      {acc.account_code}
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-slate-800 leading-tight">{acc.account_name}</h4>
                  
                  {/* Account Details */}
                  <div className="mt-2 text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>{acc.bank_name || '-'}</span> . 
                      <span className="font-mono font-bold text-slate-900 bg-slate-50 px-1 rounded border border-slate-100">
                        {acc.account_number || '-'}
                      </span>
                    </div>
                    {acc.holder_name && acc.holder_name !== '-' && (
                      <div className="text-slate-500 pl-5">a.n. <strong>{acc.holder_name}</strong></div>
                    )}
                    {acc.notes && (
                      <div className="text-slate-400 italic pl-5 text-[11px] mt-1">{acc.notes}</div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-xs text-slate-400 font-medium">Saldo Riil:</span>
                    <span className="text-2xl font-black text-emerald-700 tracking-tight">
                      {formatRupiah(acc.current_balance)}
                    </span>
                  </div>

                  <button
                    onClick={() => openEditModal(acc)}
                    className="w-full py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Nomor Rekening & Saldo
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Add / Edit Account */}
      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          onClick={() => setModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] sm:max-h-[88vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. STICKY HEADER */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 leading-tight">
                    {formData.id ? 'Edit Rekening Bank / Kas' : 'Tambah Rekening Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Atur akun penerimaan dana sewa</p>
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
            <form id="accountForm" onSubmit={handleSaveAccount} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Akun *</label>
                <select
                  value={formData.account_type}
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value as any })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:outline-emerald-600 font-medium"
                >
                  <option value="BANK">Rekening Bank Transfer (BCA, Mandiri, BRI, BNI, BSI)</option>
                  <option value="CASH">Kas Tunai Fisik (Petty Cash)</option>
                  <option value="EWALLET">E-Wallet / QRIS (GoPay, OVO, Dana, ShopeePay)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Akun Rekening *</label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Rekening BCA Utama / Kas Operasional"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Bank / Provider</label>
                  <input
                    type="text"
                    placeholder="BCA / Mandiri / BRI"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    placeholder="Contoh: 8720192831"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Pemilik Rekening (a.n.)</label>
                <input
                  type="text"
                  placeholder="Nama pemilik yang tertera di buku tabungan"
                  value={formData.holder_name}
                  onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {formData.id ? 'Saldo Saat Ini (Rp)' : 'Saldo Awal (Rp)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-emerald-600 font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-emerald-600 bg-white"
                  >
                    <option value="ACTIVE">Aktif Digunakan</option>
                    <option value="INACTIVE">Non-Aktif</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Catatan rekening (opsional)"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-emerald-600"
                ></textarea>
              </div>
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
                form="accountForm"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Rekening'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
