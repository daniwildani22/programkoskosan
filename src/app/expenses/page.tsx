'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { supabase, formatRupiah, formatDateDisplay } from '@/lib/supabase';
import { Expense, CashBankAccount } from '@/types/database';
import { 
  ArrowDownCircle, 
  Plus, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  X, 
  Wallet,
  Tag
} from 'lucide-react';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<CashBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    expense_number: '',
    expense_date: new Date().toISOString().substring(0, 10),
    category: 'LISTRIK_AIR',
    description: '',
    amount: 100000,
    payment_method: 'TRANSFER',
    account_id: '',
    status: 'PAID' as 'PAID' | 'CANCELLED'
  });

  async function loadData() {
    setLoading(true);
    try {
      const [
        { data: eData, error: eErr },
        { data: aData }
      ] = await Promise.all([
        supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
        supabase.from('cash_bank_accounts').select('*').eq('status', 'ACTIVE').order('account_name', { ascending: true })
      ]);

      if (eErr) throw eErr;
      setExpenses(eData || []);
      setAccounts(aData || []);
    } catch (err: any) {
      alert('Gagal memuat pengeluaran: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleOpenModal() {
    setFormData({
      expense_number: 'EXP-' + Date.now().toString().slice(-6),
      expense_date: new Date().toISOString().substring(0, 10),
      category: 'LISTRIK_AIR',
      description: '',
      amount: 100000,
      payment_method: 'TRANSFER',
      account_id: accounts[0]?.id || '',
      status: 'PAID'
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const expId = 'EXP_' + Date.now();
      const expAmount = Number(formData.amount);

      const { error } = await supabase
        .from('expenses')
        .insert([{
          id: expId,
          expense_number: formData.expense_number,
          expense_date: formData.expense_date,
          category: formData.category,
          description: formData.description,
          amount: expAmount,
          payment_method: formData.payment_method,
          account_id: formData.account_id || null,
          recorded_by: 'Owner / Administrator',
          status: formData.status
        }]);

      if (error) throw error;

      // Otomatis kurangi saldo akun kas/bank jika dipilih
      if (formData.account_id) {
        const acc = accounts.find(a => a.id === formData.account_id);
        if (acc) {
          const newBal = Math.max(0, Number(acc.current_balance || 0) - expAmount);
          await supabase.from('cash_bank_accounts').update({ current_balance: newBal }).eq('id', formData.account_id);
        }
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Gagal mencatat pengeluaran: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = expenses.filter((e) => {
    const matchSearch = (e.description + ' ' + e.expense_number).toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'ALL' || e.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const totalExpense = filtered.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <Navbar title="Pengeluaran Operasional" subtitle="Catat biaya operasional kos, perbaikan, gaji, dan tagihan utilitas" />

      {/* Top Action & Stat Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pengeluaran</span>
          <div className="text-2xl font-extrabold text-rose-600 mt-0.5">{formatRupiah(totalExpense)}</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari pengeluaran..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
            />
          </div>

          <button 
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-md transition"
          >
            <Plus className="w-4 h-4" /> Catat Pengeluaran
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
            Memuat daftar pengeluaran...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ArrowDownCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700">Belum ada catatan pengeluaran</p>
            <p className="text-xs text-slate-400 mt-1">Klik tombol 'Catat Pengeluaran' untuk menambahkan pengeluaran operasional.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-4 px-6">No. Transaksi</th>
                  <th className="py-4 px-6">Tanggal</th>
                  <th className="py-4 px-6">Kategori</th>
                  <th className="py-4 px-6">Deskripsi / Keperluan</th>
                  <th className="py-4 px-6">Nominal Biaya</th>
                  <th className="py-4 px-6">Metode & Rekening</th>
                  <th className="py-4 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6 font-mono font-bold text-slate-800">
                      {e.expense_number}
                    </td>
                    <td className="py-4 px-6 text-slate-600 text-xs">
                      {formatDateDisplay(e.expense_date)}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-900">
                      {e.description}
                    </td>
                    <td className="py-4 px-6 font-extrabold text-rose-600">
                      {formatRupiah(e.amount)}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-600">
                      <div>{e.payment_method}</div>
                      <div className="text-slate-400">
                        {accounts.find(a => a.id === e.account_id)?.account_name || 'Kas Tunai'}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                        e.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Catat Pengeluaran */}
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
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
                  <ArrowDownCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 leading-tight">Catat Pengeluaran Operasional</h3>
                  <p className="text-[11px] text-slate-400">Pencatatan kas keluar & pemeliharaan</p>
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
            <form id="expenseForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Deskripsi / Keperluan</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-rose-600"
                  placeholder="Beli token listrik utama, servis AC..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-rose-600 bg-white"
                  >
                    <option value="LISTRIK_AIR">Listrik & Air</option>
                    <option value="INTERNET">Internet & WiFi</option>
                    <option value="KEBERSIHAN">Kebersihan & Sampah</option>
                    <option value="PERAWATAN">Perawatan / Servis</option>
                    <option value="KEAMANAN">Iuran Keamanan</option>
                    <option value="GAJI">Gaji Staff / Penjaga</option>
                    <option value="LAINNYA">Lain-lain</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Nominal Pengeluaran (Rp)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-base font-extrabold text-rose-600 focus:outline-rose-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Metode Pembayaran</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-rose-600 bg-white"
                  >
                    <option value="TRANSFER">Transfer Bank</option>
                    <option value="TUNAI">Tunai / Kas</option>
                    <option value="QRIS">QRIS</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1 block">Sumber Rekening Kas</label>
                  <select
                    value={formData.account_id}
                    onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-rose-600 bg-white"
                  >
                    <option value="">-- Pilih Rekening --</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.bank_name} - {acc.account_name}</option>
                    ))}
                  </select>
                </div>
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
                form="expenseForm"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Pengeluaran'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
