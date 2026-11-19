'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { supabase, formatRupiah, formatDateDisplay } from '@/lib/supabase';
import { RentBill, Payment, CashBankAccount } from '@/types/database';
import { 
  Receipt, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  X, 
  CreditCard, 
  Printer, 
  MessageSquare, 
  AlertTriangle, 
  Building2, 
  Share2, 
  Calendar, 
  Check, 
  Send,
  Trash2,
  Zap
} from 'lucide-react';

export default function PaymentsPage() {
  const { isOwner, isAdmin } = useAuth();
  const [bills, setBills] = useState<RentBill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [accounts, setAccounts] = useState<CashBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'BILLS' | 'PAYMENTS'>('BILLS');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dueDateAlertOnly, setDueDateAlertOnly] = useState(false);

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

  // Modal Cetak Struk / Kuitansi
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    bill?: RentBill;
    payment?: Payment;
    isPaid: boolean;
  } | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [
        { data: bData, error: bErr },
        { data: pData, error: pErr },
        { data: aData }
      ] = await Promise.all([
        supabase.from('rent_bills').select('*, tenant:tenants(*), room:rooms(*)').order('due_date', { ascending: false }),
        supabase.from('payments').select('*, account:cash_bank_accounts(*), tenant:tenants(*), room:rooms(*)').order('payment_date', { ascending: false }),
        supabase.from('cash_bank_accounts').select('*').eq('status', 'ACTIVE').order('account_name', { ascending: true })
      ]);

      if (bErr) throw bErr;
      if (pErr) throw pErr;

      let currentBills = bData || [];

      // Auto-sinkronisasi dari seluruh kontrak: jika ada kontrak yang belum memiliki tagihan, buat otomatis
      const { data: allContracts } = await supabase
        .from('contracts')
        .select('*, tenant:tenants(*), room:rooms(*)')
        .order('created_at', { ascending: false });

      if (allContracts && allContracts.length > 0) {
        const existingContractIds = new Set(currentBills.map(b => b.contract_id).filter(Boolean));
        const missingContracts = allContracts.filter(c => !existingContractIds.has(c.id));

        if (missingContracts.length > 0) {
          const autoBills = missingContracts.map(c => {
            const rent = Number(c.rent_price) || 0;
            const deposit = Number(c.deposit_amount) || 0;
            const total = rent + deposit;
            const billId = 'BILL_' + c.id;
            const billNum = 'INV-' + (c.contract_number ? c.contract_number.replace('CTR-', '') : Date.now().toString().slice(-6));

            return {
              id: billId,
              bill_number: billNum,
              contract_id: c.id,
              tenant_id: c.tenant_id,
              room_id: c.room_id,
              property_id: c.property_id || null,
              period_name: `Sewa Awal (${formatDateDisplay(c.start_date)} - ${formatDateDisplay(c.end_date)})`,
              period_start: c.start_date,
              period_end: c.end_date,
              due_date: c.start_date,
              rent_amount: rent,
              other_charges: deposit,
              discount_amount: 0,
              total_amount: total,
              paid_amount: 0,
              remaining_amount: total,
              status: 'UNPAID',
              notes: 'Otomatis dibuat dari kontrak ' + c.contract_number
            };
          });

          await supabase.from('rent_bills').upsert(autoBills, { onConflict: 'id' });

          const { data: refreshedBills } = await supabase
            .from('rent_bills')
            .select('*, tenant:tenants(*), room:rooms(*)')
            .order('due_date', { ascending: false });

          if (refreshedBills) {
            currentBills = refreshedBills;
          }
        }
      }

      setBills(currentBills);
      setPayments(pData || []);
      setAccounts(aData || []);
    } catch (err: any) {
      alert('Gagal memuat data transaksi: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncFromContracts() {
    setLoading(true);
    try {
      const { data: allContracts, error: cErr } = await supabase
        .from('contracts')
        .select('*, tenant:tenants(*), room:rooms(*)')
        .order('created_at', { ascending: false });

      if (cErr) throw cErr;

      const { data: existingBills, error: bErr } = await supabase
        .from('rent_bills')
        .select('*');

      if (bErr) throw bErr;

      const existingContractIds = new Set((existingBills || []).map(b => b.contract_id).filter(Boolean));
      const missingContracts = (allContracts || []).filter(c => !existingContractIds.has(c.id));

      if (missingContracts.length === 0) {
        alert('Seluruh kontrak (' + (allContracts?.length || 0) + ' kontrak) sudah tersinkronisasi ke daftar tagihan.');
        await loadData();
        return;
      }

      const autoBills = missingContracts.map(c => {
        const rent = Number(c.rent_price) || 0;
        const deposit = Number(c.deposit_amount) || 0;
        const total = rent + deposit;
        const billId = 'BILL_' + c.id;
        const billNum = 'INV-' + (c.contract_number ? c.contract_number.replace('CTR-', '') : Date.now().toString().slice(-6));

        return {
          id: billId,
          bill_number: billNum,
          contract_id: c.id,
          tenant_id: c.tenant_id,
          room_id: c.room_id,
          property_id: c.property_id || null,
          period_name: `Sewa Awal (${formatDateDisplay(c.start_date)} - ${formatDateDisplay(c.end_date)})`,
          period_start: c.start_date,
          period_end: c.end_date,
          due_date: c.start_date,
          rent_amount: rent,
          other_charges: deposit,
          discount_amount: 0,
          total_amount: total,
          paid_amount: 0,
          remaining_amount: total,
          status: 'UNPAID',
          notes: 'Otomatis dibuat dari kontrak ' + c.contract_number
        };
      });

      const { error: insErr } = await supabase.from('rent_bills').upsert(autoBills, { onConflict: 'id' });
      if (insErr) throw insErr;

      await loadData();
      alert(`Berhasil menyinkronkan ${autoBills.length} tagihan sewa baru dari kontrak aktif!`);
    } catch (err: any) {
      alert('Gagal menyinkronkan kontrak: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setModalOpen(false);
        setReceiptModalOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Format nomor WhatsApp (mengubah 08... menjadi 628...)
  function cleanWaPhone(phone?: string) {
    if (!phone) return '';
    const num = phone.replace(/[^0-9]/g, '');
    if (num.startsWith('0')) return '62' + num.substring(1);
    return num;
  }

  // Kalkulasi Status Jatuh Tempo
  function getDueDateStatus(dueDateStr: string, status: string) {
    if (status === 'PAID') {
      return { type: 'PAID', label: 'Lunas', days: 0, badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        type: 'OVERDUE', 
        label: `Terlambat ${Math.abs(diffDays)} Hari`, 
        days: diffDays, 
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold' 
      };
    } else if (diffDays === 0) {
      return { 
        type: 'TODAY', 
        label: 'JATUH TEMPO HARI INI', 
        days: 0, 
        badgeClass: 'bg-rose-600 text-white font-extrabold animate-pulse' 
      };
    } else if (diffDays <= 3) {
      return { 
        type: 'SOON', 
        label: `${diffDays} Hari Lagi`, 
        days: diffDays, 
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold' 
      };
    } else {
      return { 
        type: 'NORMAL', 
        label: formatDateDisplay(dueDateStr), 
        days: diffDays, 
        badgeClass: 'bg-slate-100 text-slate-700' 
      };
    }
  }

  // Generate Info Rekening Bank untuk Pesan WhatsApp
  function getBankAccountsText() {
    if (!accounts || accounts.length === 0) return 'Silakan hubungi pemilik kos untuk nomor rekening transfer.';
    return accounts.map(a => `. *${a.bank_name}*: \`${a.account_number}\` a.n ${a.holder_name}`).join('\n');
  }

  // 1. KIRIM STRUK TAGIHAN / PENGINGAT JATUH TEMPO VIA WA
  function sendWaInvoiceReminder(b: RentBill) {
    const phone = cleanWaPhone(b.tenant?.phone);
    if (!phone) {
      alert('Nomor WhatsApp penghuni belum tercatat.');
      return;
    }

    const dueStatus = getDueDateStatus(b.due_date, b.status);
    const isOverdue = dueStatus.type === 'OVERDUE';
    const isToday = dueStatus.type === 'TODAY';

    let headerNote = 'PEMBERITAHUAN TAGIHAN SEWA KOS';
    if (isOverdue) headerNote = '?? PENGINGAT TUNGGAKAN JATUH TEMPO SEWA KOS';
    if (isToday) headerNote = '? PENGINGAT JATUH TEMPO SEWA KOS (HARI INI)';

    const msg = `*${headerNote}*
Halo *${b.tenant?.full_name || 'Penghuni'}*,
Semoga dalam keadaan sehat selalu.

Berikut kami sampaikan rincian tagihan sewa kos Anda:
?? *No. Invoice:* ${b.bill_number}
?? *Kamar:* ${b.room?.room_code || '-'}
??? *Periode:* ${b.period_name}
?? *Total Tagihan:* ${formatRupiah(b.total_amount)}
?? *Sisa Pembayaran:* ${formatRupiah(b.remaining_amount || b.total_amount)}
? *Jatuh Tempo:* ${formatDateDisplay(b.due_date)} (${dueStatus.label})

*Rekening Pembayaran Resmi:*
${getBankAccountsText()}

Mohon untuk segera melakukan transfer pembayaran dan konfirmasikan bukti transfer melalui chat ini.
Terima kasih atas kerja samanya! ??
_Manajemen Kos Finora_`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  // 2. KIRIM STRUK PELUNASAN / KUITANSI RESMI VIA WA
  function sendWaReceipt(b: RentBill) {
    const phone = cleanWaPhone(b.tenant?.phone);
    if (!phone) {
      alert('Nomor WhatsApp penghuni belum tercatat.');
      return;
    }

    const msg = `*KUITANSI RESMI PEMBAYARAN SEWA KOS*
STATUS: ? *LUNAS (PAID)*

Terima kasih, pembayaran sewa kos Anda telah kami terima dan diverifikasi secara sah:
?? *No. Invoice / Kuitansi:* ${b.bill_number}
?? *Nama Penghuni:* ${b.tenant?.full_name || '-'}
?? *Kamar:* ${b.room?.room_code || '-'}
??? *Periode Sewa:* ${b.period_name}
?? *Nominal Dilunasi:* ${formatRupiah(b.total_amount)}
?? *Status:* Tuntas / Lunas

Semoga betah dan nyaman tinggal di kos kami!
Jika membutuhkan bantuan fasilitas atau keluhan kamar, silakan hubungi pengelola.
Terima kasih! ??
_Manajemen Kos Finora_`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  // Buka Modal Cetak Struk
  function openReceiptModal(b: RentBill) {
    setReceiptData({
      bill: b,
      isPaid: b.status === 'PAID'
    });
    setReceiptModalOpen(true);
  }

  function openReceiptModalFromPayment(p: Payment) {
    const relatedBill = bills.find(b => b.id === p.bill_id);
    if (relatedBill) {
      openReceiptModal(relatedBill);
      return;
    }
    const pseudoBill: RentBill = {
      id: p.bill_id || 'BILL_' + p.id,
      bill_number: p.receipt_number || p.payment_number,
      contract_id: p.contract_id || '',
      tenant_id: p.tenant_id,
      room_id: p.room_id || '',
      property_id: p.property_id || null,
      period_name: `Pembayaran Tanggal ${formatDateDisplay(p.payment_date)}`,
      period_start: p.payment_date,
      period_end: p.payment_date,
      due_date: p.payment_date,
      rent_amount: Number(p.amount),
      other_charges: 0,
      discount_amount: 0,
      total_amount: Number(p.amount),
      paid_amount: Number(p.amount),
      remaining_amount: 0,
      status: 'PAID',
      notes: p.notes || 'Pembayaran sewa kos',
      tenant: p.tenant,
      room: p.room
    };
    openReceiptModal(pseudoBill);
  }

  function sendWaReceiptFromPayment(p: Payment) {
    const phone = cleanWaPhone(p.tenant?.phone);
    if (!phone) {
      alert('Nomor WhatsApp penghuni belum tercatat.');
      return;
    }

    const msg = `*KUITANSI RESMI PEMBAYARAN SEWA KOS*
STATUS: ? *DITERIMA (LUNAS)*

Terima kasih, pembayaran telah kami terima dan tercatat:
?? *No. Transaksi:* ${p.payment_number}
?? *Penghuni:* ${p.tenant?.full_name || '-'}
?? *Kamar:* ${p.room?.room_code || '-'}
?? *Nominal Dibayar:* ${formatRupiah(p.amount)}
?? *Metode Pembayaran:* ${p.payment_method}
?? *Tanggal Bayar:* ${formatDateDisplay(p.payment_date)}
?? *Keterangan:* ${p.notes || 'Pembayaran sewa'}
?? *Diterima Oleh:* ${p.received_by || 'Owner / Pengelola'}

Terima kasih atas kerja samanya! ??
_Manajemen Kos Finora_`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  // Tombol Cepat Lunas Langsung (1-Klik)
  async function handleQuickFullPayment(b: RentBill) {
    const remaining = Number(b.remaining_amount || b.total_amount);
    if (remaining <= 0) {
      alert('Tagihan ini sudah lunas.');
      return;
    }

    const confirmMsg = `Tandai tagihan "${b.bill_number}" (${b.tenant?.full_name || 'Penghuni'}) sebesar ${formatRupiah(remaining)} sebagai LUNAS langsung?\n\nSistem akan otomatis mencatatnya ke Riwayat Pembayaran dan memperbarui saldo.`;
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const payId = 'PAY_' + Date.now();
      const payNumber = 'PAY-' + Date.now().toString().slice(-6);
      const todayStr = new Date().toISOString().substring(0, 10);
      const accId = accounts[0]?.id || null;

      // 1. Simpan pembayaran
      const { error: pErr } = await supabase.from('payments').insert([{
        id: payId,
        payment_number: payNumber,
        bill_id: b.id,
        contract_id: b.contract_id || null,
        tenant_id: b.tenant_id,
        room_id: b.room_id || null,
        property_id: b.property_id || null,
        payment_date: todayStr,
        amount: remaining,
        payment_method: 'TRANSFER_BANK',
        account_id: accId,
        receipt_number: 'REC-' + Date.now().toString().slice(-6),
        notes: `Pelunasan langsung ${b.period_name} (${b.bill_number})`,
        received_by: isOwner ? 'Owner' : 'Administrator',
        status: 'CONFIRMED'
      }]);
      if (pErr) throw pErr;

      // 2. Update tagihan menjadi PAID
      const newPaid = Number(b.total_amount);
      const { error: bErr } = await supabase.from('rent_bills').update({
        paid_amount: newPaid,
        remaining_amount: 0,
        status: 'PAID'
      }).eq('id', b.id);
      if (bErr) throw bErr;

      // 3. Update saldo akun kas
      if (accId) {
        const targetAcc = accounts.find(a => a.id === accId);
        if (targetAcc) {
          const updatedBalance = Number(targetAcc.current_balance || 0) + remaining;
          await supabase.from('cash_bank_accounts').update({
            current_balance: updatedBalance
          }).eq('id', accId);
        }
      }

      await loadData();
      alert(`Tagihan ${b.bill_number} berhasil dilunasi dan otomatis masuk ke Riwayat Pembayaran!`);
    } catch (err: any) {
      alert('Gagal melunasi tagihan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handlePrintReceipt() {
    window.print();
  }

  // Handler Buka Modal Bayar
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

  // Handler Simpan Bayar
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
      alert('Pembayaran berhasil dicatat!');
    } catch (err: any) {
      alert('Gagal mencatat pembayaran: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // Handler Hapus Tagihan (Owner / Admin)
  async function handleDeleteBill(bill: RentBill) {
    if (!isOwner && !isAdmin) {
      alert('Hanya akun Owner atau Admin yang berhak menghapus data tagihan.');
      return;
    }

    const confirmMsg = `Hapus data tagihan "${bill.bill_number}" (${bill.period_name}) untuk penghuni "${bill.tenant?.full_name || 'Penghuni'}"?\n\nPerhatian: Seluruh riwayat pembayaran yang terkait tagihan ini juga akan ikut dibersihkan.`;
    if (!confirm(confirmMsg)) return;

    try {
      // 1. Hapus pembayaran terkait tagihan ini terlebih dahulu
      await supabase.from('payments').delete().eq('bill_id', bill.id);

      // 2. Hapus tagihan
      const { error } = await supabase.from('rent_bills').delete().eq('id', bill.id);
      if (error) throw error;

      // 3. Update state lokal
      setBills(prev => prev.filter(item => item.id !== bill.id));
      setPayments(prev => prev.filter(item => item.bill_id !== bill.id));
      alert(`Tagihan ${bill.bill_number} berhasil dihapus.`);
    } catch (err: any) {
      alert('Gagal menghapus tagihan: ' + err.message);
    }
  }

  // Handler Hapus Riwayat Pembayaran (Owner / Admin)
  async function handleDeletePayment(payment: Payment) {
    if (!isOwner && !isAdmin) {
      alert('Hanya akun Owner atau Admin yang berhak menghapus riwayat pembayaran.');
      return;
    }

    const confirmMsg = `Hapus riwayat pembayaran "${payment.payment_number}" sebesar ${formatRupiah(payment.amount)}?\n\nJika pembayaran ini terkait dengan tagihan, sisa tagihan akan otomatis dikembalikan seperti semula.`;
    if (!confirm(confirmMsg)) return;

    try {
      // 1. Jika terhubung dengan tagihan, pulihkan sisa tagihan
      if (payment.bill_id) {
        const targetBill = bills.find(b => b.id === payment.bill_id);
        if (targetBill) {
          const newPaid = Math.max(0, Number(targetBill.paid_amount || 0) - Number(payment.amount));
          const newRemaining = Math.max(0, Number(targetBill.total_amount || 0) - newPaid);
          const newStatus = newPaid <= 0 ? 'UNPAID' : (newRemaining > 0 ? 'PARTIAL' : 'PAID');

          await supabase.from('rent_bills').update({
            paid_amount: newPaid,
            remaining_amount: newRemaining,
            status: newStatus
          }).eq('id', targetBill.id);

          setBills(prev => prev.map(b => b.id === targetBill.id ? {
            ...b,
            paid_amount: newPaid,
            remaining_amount: newRemaining,
            status: newStatus
          } : b));
        }
      }

      // 2. Jika rekening kas/bank terhubung, sesuaikan kembali saldo
      if (payment.account_id) {
        const targetAcc = accounts.find(a => a.id === payment.account_id);
        if (targetAcc) {
          const newBal = Math.max(0, Number(targetAcc.current_balance || 0) - Number(payment.amount));
          await supabase.from('cash_bank_accounts').update({
            current_balance: newBal
          }).eq('id', targetAcc.id);

          setAccounts(prev => prev.map(a => a.id === targetAcc.id ? { ...a, current_balance: newBal } : a));
        }
      }

      // 3. Hapus data pembayaran dari database
      const { error } = await supabase.from('payments').delete().eq('id', payment.id);
      if (error) throw error;

      // 4. Update state pembayaran
      setPayments(prev => prev.filter(p => p.id !== payment.id));
      alert(`Riwayat pembayaran ${payment.payment_number} berhasil dihapus.`);
    } catch (err: any) {
      alert('Gagal menghapus pembayaran: ' + err.message);
    }
  }

  // Hitung jumlah tagihan terlambat / mendekati jatuh tempo
  const urgentBills = bills.filter(b => {
    if (b.status === 'PAID') return false;
    const st = getDueDateStatus(b.due_date, b.status);
    return st.type === 'OVERDUE' || st.type === 'TODAY' || st.type === 'SOON';
  });

  const filteredBills = bills.filter((b) => {
    const tName = b.tenant?.full_name || '';
    const num = b.bill_number || '';
    const matchSearch = (tName + ' ' + num + ' ' + b.period_name).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;

    if (dueDateAlertOnly) {
      if (b.status === 'PAID') return false;
      const st = getDueDateStatus(b.due_date, b.status);
      return matchSearch && (st.type === 'OVERDUE' || st.type === 'TODAY' || st.type === 'SOON');
    }

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <Navbar title="Tagihan & Pembayaran" subtitle="Kirim struk tagihan & pelunasan WhatsApp, cetak kuitansi resmi, dan pantau jatuh tempo" />

      {/* PENGINGAT JATUH TEMPO BANNER */}
      {urgentBills.length > 0 && activeTab === 'BILLS' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-950">
                Perhatian: Terdapat {urgentBills.length} Tagihan Mendekati / Melewati Jatuh Tempo!
              </h4>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Kirimkan pengingat tagihan langsung ke nomor WhatsApp penghuni dengan sekali klik.
              </p>
            </div>
          </div>

          <button
            onClick={() => setDueDateAlertOnly(!dueDateAlertOnly)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm shrink-0 ${
              dueDateAlertOnly 
                ? 'bg-amber-700 text-white' 
                : 'bg-white text-amber-900 border border-amber-300 hover:bg-amber-100'
            }`}
          >
            {dueDateAlertOnly ? 'Tampilkan Semua Tagihan' : `Filter ${urgentBills.length} Tagihan Kritis`}
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => { setActiveTab('BILLS'); setDueDateAlertOnly(false); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'BILLS' ? 'bg-[#064e3b] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daftar Tagihan ({bills.length})
          </button>
          <button
            onClick={() => { setActiveTab('PAYMENTS'); setDueDateAlertOnly(false); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'PAYMENTS' ? 'bg-[#064e3b] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Riwayat Pembayaran ({payments.length})
          </button>
        </div>

        {/* Filter & Refresh */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSyncFromContracts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#064e3b] border border-emerald-200 text-xs font-bold transition shadow-sm"
            title="Tarik & Sinkronkan Tagihan dari Semua Kontrak Aktif"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Sinkron Kontrak</span>
          </button>

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

      {/* Main Content Table */}
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
                    <th className="py-4 px-6">Sisa Tagihan</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Aksi & Struk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredBills.map((b) => {
                    const dueInfo = getDueDateStatus(b.due_date, b.status);

                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition">
                        {/* No. Invoice */}
                        <td className="py-4 px-6 font-mono font-bold text-slate-800">
                          {b.bill_number}
                        </td>

                        {/* Penghuni & Kamar */}
                        <td className="py-4 px-6 font-semibold text-slate-900">
                          <div>{b.tenant?.full_name || 'Penghuni'}</div>
                          <div className="text-xs text-slate-400 font-normal">
                            Kamar: <strong>{b.room?.room_code || '-'}</strong>
                          </div>
                        </td>

                        {/* Periode */}
                        <td className="py-4 px-6 text-slate-600 text-xs">
                          {b.period_name}
                        </td>

                        {/* Jatuh Tempo & Pengingat */}
                        <td className="py-4 px-6 text-xs">
                          <div className="font-medium text-slate-700">{formatDateDisplay(b.due_date)}</div>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${dueInfo.badgeClass}`}>
                            {dueInfo.label}
                          </span>
                        </td>

                        {/* Total Tagihan */}
                        <td className="py-4 px-6 font-bold text-slate-900">
                          {formatRupiah(b.total_amount)}
                        </td>

                        {/* Sisa Bayar */}
                        <td className="py-4 px-6 font-bold text-rose-600">
                          {Number(b.remaining_amount) > 0 ? (
                            formatRupiah(b.remaining_amount)
                          ) : (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <Check className="w-4 h-4" /> Lunas
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${
                            b.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                            b.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {b.status === 'PAID' ? 'LUNAS' : b.status === 'PARTIAL' ? 'SEBAGIAN' : 'BELUM BAYAR'}
                          </span>
                        </td>

                        {/* AKSI & STRUK */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Tombol Kirim WhatsApp */}
                            {b.status === 'PAID' ? (
                              <button
                                onClick={() => sendWaReceipt(b)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition"
                                title="Kirim Struk Pelunasan WA ke Penghuni"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden sm:inline">Kirim Pelunasan (WA)</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => sendWaInvoiceReminder(b)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition"
                                title="Kirim Tagihan / Pengingat Jatuh Tempo via WA"
                              >
                                <Send className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden sm:inline">Kirim Tagihan (WA)</span>
                              </button>
                            )}

                            {/* Tombol Cetak Struk / Kuitansi Resmi */}
                            <button
                              onClick={() => openReceiptModal(b)}
                              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center gap-1"
                              title="Cetak Struk / Kuitansi Resmi"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Cetak</span>
                            </button>

                            {/* Tombol Catat Bayar & Cepat Lunas */}
                            {b.status !== 'PAID' && (
                              <>
                                <button
                                  onClick={() => handleOpenPayModal(b)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#064e3b] hover:bg-[#065f46] text-white text-xs font-bold transition shadow-sm"
                                  title="Buka Form Pembayaran"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Bayar</span>
                                </button>
                                <button
                                  onClick={() => handleQuickFullPayment(b)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                                  title="Langsung Lunaskan Tagihan Ini (1-Klik)"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Lunas</span>
                                </button>
                              </>
                            )}

                            {/* Tombol Hapus Tagihan (Owner/Admin) */}
                            {(isOwner || isAdmin) && (
                              <button
                                onClick={() => handleDeleteBill(b)}
                                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs transition flex items-center gap-1 shadow-sm"
                                title="Hapus Tagihan Ini (Owner/Admin)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Hapus</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* TAB PAYMENTS (RIWAYAT PEMBAYARAN) */
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
                    <th className="py-4 px-6">Rekening Tujuan</th>
                    <th className="py-4 px-6">Diterima Oleh</th>
                    <th className="py-4 px-6 text-right">Aksi</th>
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
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Tombol Kirim WA Kuitansi */}
                          <button
                            onClick={() => sendWaReceiptFromPayment(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition shadow-sm"
                            title="Kirim Struk Kuitansi Pembayaran via WA"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="hidden sm:inline">Kirim WA</span>
                          </button>

                          {/* Tombol Cetak Kuitansi Resmi */}
                          <button
                            onClick={() => openReceiptModalFromPayment(p)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition shadow-sm"
                            title="Cetak Kuitansi Resmi"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak</span>
                          </button>

                          {(isOwner || isAdmin) && (
                            <button
                              onClick={() => handleDeletePayment(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold text-xs transition shadow-sm"
                              title="Hapus Riwayat Pembayaran Ini (Owner/Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* MODAL CETAK STRUK / KUITANSI RESMI (PRINT & PDF READY) */}
      {receiptModalOpen && receiptData?.bill && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden"
          onClick={() => setReceiptModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[88vh] my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Action Bar Modal (Sticky Header) */}
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white z-10 no-print">
              <span className="font-bold text-sm text-slate-700 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-600" /> Pratinjau Cetak Struk Resmi
              </span>
              <button 
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-600 text-xs font-bold transition active:scale-95 shadow-sm"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </button>
            </div>

            {/* AREA STRUK CETAK (SCROLLABLE PRINTABLE AREA) */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-slate-800 font-sans">
              <div id="printable-receipt-area" className="space-y-6">
              {/* Header Struk */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#064e3b] text-white flex items-center justify-center font-bold text-xl shadow-md">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">KOS GRAHA ASRI</h2>
                    <p className="text-xs text-slate-500 font-medium">Finora Cloud Property Management</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Yogyakarta, Indonesia . WA: 0812-3456-7890</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-extrabold uppercase tracking-wider text-[#064e3b]">
                    {receiptData.isPaid ? 'KUITANSI PELUNASAN' : 'SURAT TAGIHAN SEWA'}
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-600 mt-1">
                    {receiptData.bill.bill_number}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Tanggal: {formatDateDisplay(new Date().toISOString())}
                  </div>
                </div>
              </div>

              {/* Data Penghuni & Kamar */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold">DITAGIHKAN KEPADA:</span>
                  <div className="text-sm font-bold text-slate-900 mt-1">{receiptData.bill.tenant?.full_name || 'Penghuni'}</div>
                  <div className="text-slate-600 mt-0.5">No. WA: {receiptData.bill.tenant?.phone || '-'}</div>
                  <div className="text-slate-500 mt-0.5">NIK: {receiptData.bill.tenant?.id_card_number || '-'}</div>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold">UNIT KAMAR & PERIODE:</span>
                  <div className="text-sm font-bold text-slate-900 mt-1">Kamar {receiptData.bill.room?.room_code || '-'}</div>
                  <div className="text-slate-600 mt-0.5">Periode: {receiptData.bill.period_name}</div>
                  <div className="text-slate-500 mt-0.5">Jatuh Tempo: {formatDateDisplay(receiptData.bill.due_date)}</div>
                </div>
              </div>

              {/* Rincian Biaya Tabel */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Rincian Deskripsi</th>
                      <th className="py-2.5 px-4 text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        Sewa Kamar ({receiptData.bill.period_name})
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatRupiah(receiptData.bill.rent_amount || receiptData.bill.total_amount)}
                      </td>
                    </tr>
                    {Number(receiptData.bill.other_charges) > 0 && (
                      <tr>
                        <td className="py-2.5 px-4 text-slate-600">Biaya Utilitas / Fasilitas Tambahan</td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          {formatRupiah(receiptData.bill.other_charges)}
                        </td>
                      </tr>
                    )}
                    {Number(receiptData.bill.discount_amount) > 0 && (
                      <tr>
                        <td className="py-2.5 px-4 text-emerald-700 font-medium">Potongan / Diskon Sewa</td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                          -{formatRupiah(receiptData.bill.discount_amount)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                    <tr>
                      <td className="py-3 px-4 text-slate-700 text-sm">TOTAL TAGIHAN</td>
                      <td className="py-3 px-4 text-right text-base text-[#064e3b] font-black">
                        {formatRupiah(receiptData.bill.total_amount)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-slate-600">Total Telah Dibayar</td>
                      <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">
                        {formatRupiah(receiptData.bill.paid_amount || (receiptData.isPaid ? receiptData.bill.total_amount : 0))}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-4 text-slate-600">Sisa Tagihan</td>
                      <td className="py-2.5 px-4 text-right text-rose-600 font-bold">
                        {formatRupiah(receiptData.bill.remaining_amount || (receiptData.isPaid ? 0 : receiptData.bill.total_amount))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Status Stamp & Tanda Tangan */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                {/* STEMPEL STATUS */}
                <div className="flex items-center gap-3">
                  {receiptData.isPaid ? (
                    <div className="border-4 border-emerald-600 text-emerald-700 font-black text-lg px-4 py-1.5 rounded-xl uppercase tracking-widest transform -rotate-6 shadow-sm">
                      ? LUNAS
                    </div>
                  ) : (
                    <div className="border-4 border-amber-600 text-amber-700 font-black text-lg px-4 py-1.5 rounded-xl uppercase tracking-widest transform -rotate-6 shadow-sm">
                      TAGIHAN
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 max-w-[200px] leading-tight">
                    Dokumen ini adalah bukti transaksi resmi yang diterbitkan secara sah oleh sistem Finora Cloud.
                  </div>
                </div>

                {/* Tanda Tangan */}
                <div className="text-center min-w-[150px]">
                  <div className="text-[11px] text-slate-400">Pengelola Kos,</div>
                  <div className="h-12 flex items-center justify-center">
                    <span className="font-serif italic text-xs text-slate-400">Owner / Admin</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 border-t border-slate-400 pt-1">
                    H. Budiman / Pengelola
                  </div>
                </div>
              </div>
              </div>
            </div>

            {/* Tombol Aksi Modal (Sticky Footer) */}
            <div className="px-5 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 bg-slate-50/90 backdrop-blur-sm z-10 no-print">
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-white transition"
              >
                Tutup
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (receiptData.isPaid) {
                      sendWaReceipt(receiptData.bill);
                    } else {
                      sendWaInvoiceReminder(receiptData.bill);
                    }
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Kirim ke WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white font-bold text-xs shadow-md transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Struk (PDF)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Catat Bayar */}
      {modalOpen && selectedBill && (
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
              <div>
                <h3 className="text-base font-bold text-slate-800 leading-tight">Catat Pembayaran Sewa</h3>
                <p className="text-[11px] text-slate-400 font-mono">{selectedBill.bill_number}</p>
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
            <form id="payForm" onSubmit={handlePaySubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5">
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-base font-extrabold text-[#064e3b] focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Metode Pembayaran</label>
                <select
                  value={payForm.payment_method}
                  onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600 bg-white"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600 bg-white"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Catatan / Keterangan</label>
                <input
                  type="text"
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-emerald-600"
                  placeholder="Bukti transfer terverifikasi..."
                />
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
                form="payForm"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-[#064e3b] hover:bg-[#065f46] text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Konfirmasi Bayar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
