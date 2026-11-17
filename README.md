# 🏢 Kos Management System (KMS) - Finora Cloud Edition
### Modern Next.js + Tailwind CSS + Supabase (PostgreSQL) + Vercel Deployment

Aplikasi Sistem Manajemen Rumah Kos Terpadu dengan arsitektur modern berbasis **Supabase PostgreSQL** sebagai basis data berkecepatan tinggi dan **Vercel** sebagai serverless hosting global.

---

## 🚀 Panduan Migrasi Lengkap (4 Tahap)

### Tahap 1: Eksekusi Skema Database di Supabase
1. Buka [Supabase Dashboard](https://supabase.com/dashboard) dan buat project baru (atau gunakan project yang ada).
2. Di menu sidebar kiri, buka **SQL Editor** (ikon `>_`).
3. Buka file `supabase/schema.sql` dari project ini, salin seluruh isinya, lalu tempel (*paste*) ke SQL Editor Supabase.
4. Klik tombol **Run** (Jalankan).
   *Seluruh 15 tabel relasional (`tenants`, `rooms`, `properties`, `contracts`, `cash_bank_accounts`, `rent_bills`, `payments`, dll) beserta trigger `updated_at`, index performa, dan Row Level Security (RLS) akan otomatis terbentuk!*

---

### Tahap 2: Migrasi Data Eksisting (Google Spreadsheet ➡️ Supabase)
Jika Anda sudah memiliki data penghuni (misalnya ke-22 data penghuni Anda), kamar, dan rekening bank di Google Spreadsheet:
1. Buka project Google Apps Script Anda.
2. Buat file script baru bernama `MigrateToSupabase.gs`.
3. Salin isi dari file `gas/MigrateToSupabase.gs` di repo ini.
4. Di baris 17-21, masukkan:
   - `SUPABASE_URL`: (Dapatkan dari Supabase > Project Settings > API > Project URL)
   - `SUPABASE_SERVICE_KEY`: (Dapatkan dari Supabase > Project Settings > API > `service_role` secret key)
5. Pilih fungsi **`runFullMigrationToSupabase`**, lalu klik tombol **Jalankan (Run)**.
6. Seluruh data penghuni beserta foto, nomor WA, catatan, kamar, dan rekening bank akan otomatis diunggah langsung ke database Supabase Anda dalam hitungan detik!

---

### Tahap 3: Menjalankan Frontend Secara Lokal (Opsional)
```bash
# Masuk ke folder project
cd kos-management-vercel

# Pasang dependencies
npm install
# atau
pnpm install

# Buat file konfigurasi lingkungan (.env.local)
cp .env.example .env.local

# Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local

# Jalankan server development
npm run dev
```
Buka browser Anda di `http://localhost:3000`.

---

### Tahap 4: Deploy 1-Klik ke Vercel (Produksi)
1. Unggah folder `kos-management-vercel` ini ke repositori **GitHub** atau **GitLab** Anda.
2. Buka [Vercel Dashboard](https://vercel.com/new).
3. Klik **Add New...** > **Project**, lalu impor repositori GitHub Anda.
4. Di bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL` = URL Project Supabase Anda
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Public Anon Key Supabase Anda
5. Klik **Deploy**.
6. Dalam waktu kurang dari 1 menit, aplikasi Kos Management System Finora Anda akan langsung aktif di domain Vercel global (contoh: `https://kos-management-system.vercel.app`)!

---

## 🎨 Fitur Unggulan Versi Vercel + Supabase:
- **Desain Finora Emerald Fintech:** Skema warna hijau zamrud `#064e3b` dan `#059669` dengan sudut kartu membulat modern (*squircle 24px*).
- **Kolom Foto Penghuni & Avatar Dinamis:** Menampilkan foto profil asli atau inisial avatar Finora jika belum ada foto.
- **Pencatatan Rekening Manual:** Owner dapat menambah dan mengganti nomor rekening bank transfer, kas tunai, maupun QRIS/E-Wallet kapan saja.
- **Pencarian Cepat & Filter Status:** Pencarian instan untuk nama penghuni, nomor WA, catatan, dan NIK tanpa loading lambat.
- **Keamanan Skala Enterprise:** Dilengkapi Row Level Security (RLS) PostgreSQL dan enkripsi SSL end-to-end.
