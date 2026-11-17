-- ============================================================================
-- FIX CONSTRAINT & DUPLIKASI KOS MANAGEMENT SYSTEM
-- Jalankan skrip ini di Supabase > SQL Editor lalu klik "RUN"
-- ============================================================================

-- 1. Hapus constraint UNIQUE yang menyebabkan error HTTP 409 pada migrasi ulang
ALTER TABLE IF EXISTS tenants DROP CONSTRAINT IF EXISTS tenants_tenant_code_key;
ALTER TABLE IF EXISTS contracts DROP CONSTRAINT IF EXISTS contracts_contract_number_key;
ALTER TABLE IF EXISTS rent_bills DROP CONSTRAINT IF EXISTS rent_bills_bill_number_key;
ALTER TABLE IF EXISTS payments DROP CONSTRAINT IF EXISTS payments_payment_number_key;
ALTER TABLE IF EXISTS properties DROP CONSTRAINT IF EXISTS properties_property_code_key;
ALTER TABLE IF EXISTS cash_bank_accounts DROP CONSTRAINT IF EXISTS cash_bank_accounts_account_code_key;

-- 2. Pastikan foreign key aman dengan ON DELETE SET NULL atau CASCADE
ALTER TABLE IF EXISTS contracts 
  DROP CONSTRAINT IF EXISTS contracts_tenant_id_fkey,
  ADD CONSTRAINT contracts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS rent_bills 
  DROP CONSTRAINT IF EXISTS rent_bills_contract_id_fkey,
  ADD CONSTRAINT rent_bills_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS payments 
  DROP CONSTRAINT IF EXISTS payments_bill_id_fkey,
  ADD CONSTRAINT payments_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES rent_bills(id) ON DELETE SET NULL;

-- 3. (OPSIONAL jika ingin reset total semua tabel agar bersih 100% sebelum migrasi ulang):
-- Hapus tanda komentar (--) pada baris di bawah ini jika Anda ingin mengosongkan semua data lama terlebih dahulu:
-- TRUNCATE TABLE payments, rent_bills, contracts, tenants, rooms, properties, cash_bank_accounts, utility_readings, expenses, deposits, maintenance_tickets CASCADE;
