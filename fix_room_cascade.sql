-- ============================================================================
-- FIX CONSTRAINT: ON DELETE CASCADE UNTUK ROOMS & CONTRACTS
-- File: supabase/fix_room_cascade.sql
-- Description: Menghapus ON DELETE RESTRICT agar kamar dan kontrak dapat
--              dihapus oleh Owner tanpa error 'violates foreign key constraint'.
-- ============================================================================

-- 1. Tabel contracts: Ubah foreign key room_id agar ON DELETE CASCADE
ALTER TABLE IF EXISTS contracts 
  DROP CONSTRAINT IF EXISTS contracts_room_id_fkey;

ALTER TABLE IF EXISTS contracts 
  ADD CONSTRAINT contracts_room_id_fkey 
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- 2. Tabel rent_bills: Ubah foreign key room_id & contract_id agar ON DELETE CASCADE
ALTER TABLE IF EXISTS rent_bills 
  DROP CONSTRAINT IF EXISTS rent_bills_room_id_fkey;

ALTER TABLE IF EXISTS rent_bills 
  ADD CONSTRAINT rent_bills_room_id_fkey 
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS rent_bills 
  DROP CONSTRAINT IF EXISTS rent_bills_contract_id_fkey;

ALTER TABLE IF EXISTS rent_bills 
  ADD CONSTRAINT rent_bills_contract_id_fkey 
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- 3. Tabel payments: Pastikan ON DELETE CASCADE / SET NULL
ALTER TABLE IF EXISTS payments 
  DROP CONSTRAINT IF EXISTS payments_room_id_fkey;

ALTER TABLE IF EXISTS payments 
  ADD CONSTRAINT payments_room_id_fkey 
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS payments 
  DROP CONSTRAINT IF EXISTS payments_bill_id_fkey;

ALTER TABLE IF EXISTS payments 
  ADD CONSTRAINT payments_bill_id_fkey 
  FOREIGN KEY (bill_id) REFERENCES rent_bills(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS payments 
  DROP CONSTRAINT IF EXISTS payments_contract_id_fkey;

ALTER TABLE IF EXISTS payments 
  ADD CONSTRAINT payments_contract_id_fkey 
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- 4. Tabel deposits: Pastikan ON DELETE CASCADE
ALTER TABLE IF EXISTS deposits 
  DROP CONSTRAINT IF EXISTS deposits_room_id_fkey;

ALTER TABLE IF EXISTS deposits 
  ADD CONSTRAINT deposits_room_id_fkey 
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS deposits 
  DROP CONSTRAINT IF EXISTS deposits_contract_id_fkey;

ALTER TABLE IF EXISTS deposits 
  ADD CONSTRAINT deposits_contract_id_fkey 
  FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- 5. Tabel maintenance_tickets: Pastikan ON DELETE CASCADE
ALTER TABLE IF EXISTS maintenance_tickets 
  DROP CONSTRAINT IF EXISTS maintenance_tickets_room_id_fkey;

ALTER TABLE IF EXISTS maintenance_tickets 
  ADD CONSTRAINT maintenance_tickets_room_id_fkey 
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;

-- 6. Tabel meter_readings: Pastikan ON DELETE CASCADE
ALTER TABLE IF EXISTS meter_readings 
  DROP CONSTRAINT IF EXISTS meter_readings_room_id_fkey;

ALTER TABLE IF EXISTS meter_readings 
  ADD CONSTRAINT meter_readings_room_id_fkey 
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
