'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { supabase, formatRupiah, formatDateDisplay } from '@/lib/supabase';
import { RentBill, Payment, CashBankAccount } from '@/types/database';
import { 
  Receipt, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  X, 
  CreditCard,
  Printer
} from 'lucide-react';

export default function PaymentsPage() {
  const [bills, setBills] = useState<RentBill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accounts, setAccounts] = useState<CashBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'BILLS' | 'PAYMENTS'>('BILLS');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal Bayar
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedBill, setSelectedBill] = useState<RentBill | null>(null);
  const [payForm, setPayForm] = useState({
    amount: 0,
    payment_method: 'TRANSFER_BANK' as 'TUNAI' | 'TRANSFER_BANK' | 'QRIS' | 'OTHER',
    account_id: '',
    payment_date: new Date().toISOString().substring(0, 10),
    notes: '',
    received_by: 'Owner / Administrator'
  });

  async function loadData() {
    setLoading(true);
    try {
      const [
        { data: bData, error: bErr },
        { data: pData, error: pErr },
        { data: aData }
      ] = await Promise.all([
        supabase.from('rent_bills').select('*, tenant:tenants(*), room:rooms(*)').order('due_date', { ascending: false }),
        supabase.from('payments').select('*, account:cash_bank_accounts(*)').order('payment_date', { ascending: false }),
        supabase.from('cash_bank_accounts').select('*').eq('status', 'ACTIVE').order('account_name', { ascending: true })
      ]);

      if (bErr) throw bErr;
      if (pErr) throw pErr;
      setBills(bData || []);
      setPayments(pData || []);
      setAccounts(aData || []);
    } catch (err: any) {
      alert('Gagal memuat tagihan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleOpenPayModal(bill: RentBill) {
    setSelectedBill(bill);
    setPayForm({
      amount: Number(bill.remaining_amount || bill.total_amount),
      payment_method: 'TRANSFER_BANK',
      account_id: accounts[0]?.id || '',
      payment_date: new Date().toISOString().substring(0, 10),
      notes: `Pembayaran ${bill.period_name} - ${bill.bill_number}`,
      received_by: 'Owner / Administrator'
    });
    setModalOpen(true);
  }

  async function handlePaySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBill) return;
    setSaving(true);
    try {
      const payId = 'PAY_' + Date.now();
      const payNumber = 'PAY-' + Date.now().toString().slice(-6);
      const payAmount = Number(payForm.amount);

      // 1. Simpan pembayaran
      const { error: pErr } = await supabase.from('payments').insert([{
        id: payId,
        payment_number: payNumber,
        bill_id: selectedBill.id,
        contract_id: selectedBill.contract_id || null,
        tenant_id: selectedBill.tenant_id,
        room_id: selectedBill.room_id || null,
        property_id: selectedBill.property_id || null,
        payment_date: payForm.payment_date,
        amount: payAmount,
        payment_method: payForm.payment_method,
        account_id: payForm.account_id || null,
        receipt_number: 'REC-' + Date.now().toString().slice(-6),
        notes: payForm.notes,
        received_by: payForm.received_by,
        status: 'CONFIRMED'
      }]);
      if (pErr) throw pErr;

      // 2. Update status tagihan
      const newPaid = Number(selectedBill.paid_amount || 0) + payAmount;
      const newRemaining = Math.max(0, Number(selectedBill.total_amount) - newPaid);
      const newStatus = newRemaining <= 0 ? 'PAID' : 'PARTIAL';

      await supabase.from('rent_bills').update({
        paid_amount: newPaid,
        remaining_amount: newRemaining,
        status: newStatus
      }).eq('id', selectedBill.id);

      // 3. Update saldo akun kas/bank jika ada
      if (payForm.account_id) {
        const targetAcc = accounts.find(a => a.id === payForm.account_id);
        if (targetAcc) {
          const updatedBalance = Number(targetAcc.current_balance || 0) + payAmount;
          await supabase.from('cash_bank_accounts').update({
            current_balance: updatedBalance
          }).eq('id', payForm.account_id);
        }
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert('Gagal mencatat pembayaran: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const filteredBills = bills.filter((b) => {
    const tName = b.tenant?.full_name || '';
    const num = b.bill_number || '';
    const matchSearch = (tName + ' ' + num + ' ' + b.period_name).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <Navbar title="Tagihan & Pembayaran" subtitle="Kelola surat tagihan sewa kamar, penerimaan transfer, dan kuitansi" />

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('BILLS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'BILLS' ? 'bg-[#064e3b] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daftar Tagihan ({bills.length})
          </button>
          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'PAYMENTS' ? 'bg-[#064e3b] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Riwayat Pembayaran ({payments.length})
          </button>
        </div>

        {/* Filter & Refresh */}
        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari invoice, nama..."
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
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
            Memuat data transaksi...
          </div>
        ) : activeTab === 'BILLS' ? (
          filteredBills.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-700">Tidak ada tagihan sewa</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-4 px-6">No. Invoice</th>
                    <th className="py-4 px-6">Penghuni / Kamar</th>
                    <th className="py-4 px-6">Periode</th>
                    <th className="py-4 px-6">Jatuh Tempo</th>
                    <th className="py-4 px-6">Total Tagihan</th>
                    <th className="py-4 px-6">Sisa Bayar</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredBills.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 font-mono font-bold text-slate-800">
                        {b.bill_number}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        <div>{b.tenant?.full_name || 'Penghuni'}</div>
                        <div className="text-xs text-slate-400 font-normal">{b.room?.room_code || 'Kamar'}</div>
                      </td>
                      <td className="py-4 px-6 text-slate-600 text-xs">
                        {b.period_name}
                      </td>
                      <td className="py-4 px-6 text-slate-600 text-xs">
                        {formatDateDisplay(b.due_date)}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900">
                        {formatRupiah(b.total_amount)}
                      </td>
                      <td className="py-4 px-6 font-bold text-rose-600">
                        {Number(b.remaining_amount) > 0 ? formatRupiah(b.remaining_amount) : <span className="text-emerald-600">Lunas</span>}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                          b.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                          b.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {b.status === 'PAID' ? 'LUNAS' : b.status === 'PARTIAL' ? 'SEBAGIAN' : 'BELUM BAYAR'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {b.status !== 'PAID' ? (
                          <button
                            onClick={() => handleOpenPayModal(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#064e3b] hover:bg-[#065f46] text-white text-xs font-bold transition shadow-sm"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Catat Bayar
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Selesai
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* TAB PAYMENTS */
          payments.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CreditCard className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-semibold text-slate-700">Belum ada riwayat pembayaran</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-4 px-6">No. Pembayaran</th>
                    <th className="py-4 px-6">Tanggal</th>
                    <th className="py-4 px-6">Nominal Masuk</th>
                    <th className="py-4 px-6">Metode</th>
                    <th className="py-4 px-6">Rekening Kas/Bank</th>
                    <th className="py-4 px-6">Diterima Oleh</th>
                    <th className="py-4 px-6">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 font-mono font-bold text-slate-800">
                        {p.payment_number}
                      </td>
                      <td className="py-4 px-6 text-slate-600 text-xs">
                        {formatDateDisplay(p.payment_date)}
                      </td>
                      <td className="py-4 px-6 font-extrabold text-[#064e3b]">
                        {formatRupiah(p.amount)}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-700 font-medium text-xs">
                        {p.account?.account_name || 'Kas Utama'}
                      </td>
                      <td className="py-4 px-6 text-slate-600 text-xs">
                        {p.received_by || 'Admin'}
                      </td>
                      <td className="py-4 px-6 text-slate-500 text-xs">
                        {p.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Modal Catat Bayar */}
      {modalOpen && selectedBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Catat Pembayaran Sewa</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedBill.bill_number}</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4 pt-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-900">
                <div>Penghuni: <strong>{selectedBill.tenant?.full_name || 'Penghuni'}</strong></div>
                <div>Periode: <strong>{selectedBill.period_name}</strong></div>
                <div>Sisa Tagihan: <strong className="text-rose-600">{formatRupiah(selectedBill.remaining_amount || selectedBill.total_amount)}</strong></div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Nominal Bayar (Rp)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-extrabold text-[#064e3b] focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Metode Pembayaran</label>
                <select
                  value={payForm.payment_method}
                  onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600 bg-white"
                >
                  <option value="TRANSFER_BANK">Transfer Bank</option>
                  <option value="TUNAI">Tunai / Cash</option>
                  <option value="QRIS">QRIS</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Rekening Tujuan Kas / Bank</label>
                <select
                  value={payForm.account_id}
                  onChange={(e) => setPayForm({ ...payForm, account_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600 bg-white"
                >
                  <option value="">-- Pilih Rekening --</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bank_name} - {acc.account_number} a.n {acc.holder_name} ({acc.account_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Tanggal Pembayaran</label>
                <input
                  type="date"
                  required
                  value={payForm.payment_date}
                  onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Catatan / Keterangan</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-emerald-600"
                  placeholder="Bukti transfer terverifikasi..."
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
                  <CheckCircle2 className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Konfirmasi Bayar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
