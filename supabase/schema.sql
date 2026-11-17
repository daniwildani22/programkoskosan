-- ============================================================================
-- KOS MANAGEMENT SYSTEM (KMS) - SUPABASE POSTGRESQL SCHEMA
-- File: supabase/schema.sql
-- Description: Complete Relational Schema, RLS, Triggers, and Indexes
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. HELPER FUNCTION: AUTO UPDATE updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TABLES DEFINITION

-- 3.1 USERS
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password_hash TEXT,
    salt TEXT,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'STAFF' CHECK (role IN ('OWNER', 'ADMIN', 'STAFF')),
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 PROPERTIES
CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    property_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    owner_name TEXT,
    phone TEXT,
    total_floors INT DEFAULT 1,
    photo_url TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 ROOMS
CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    room_code TEXT NOT NULL,
    name TEXT NOT NULL,
    property_id TEXT REFERENCES properties(id) ON DELETE CASCADE,
    floor INT DEFAULT 1,
    room_type TEXT NOT NULL DEFAULT 'STANDARD',
    dimensions TEXT DEFAULT '3x4 m',
    base_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    facilities TEXT,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'KOSONG' CHECK (status IN ('KOSONG', 'TERISI', 'PERBAIKAN', 'DIPESAN')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_property_room_code UNIQUE (property_id, room_code)
);

-- 3.4 TENANTS
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    tenant_code TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    id_card_number TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    origin_address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    occupation TEXT,
    photo_url TEXT,
    id_card_photo_url TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ALUMNI')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.5 CASH & BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS cash_bank_accounts (
    id TEXT PRIMARY KEY,
    account_code TEXT UNIQUE NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'BANK' CHECK (account_type IN ('CASH', 'BANK', 'EWALLET')),
    bank_name TEXT DEFAULT '-',
    account_number TEXT DEFAULT '-',
    holder_name TEXT DEFAULT '-',
    initial_balance NUMERIC(15, 2) DEFAULT 0,
    current_balance NUMERIC(15, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.6 CONTRACTS
CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    contract_number TEXT UNIQUE NOT NULL,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_price NUMERIC(15, 2) NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'BULANAN',
    due_day INT DEFAULT 1,
    deposit_amount NUMERIC(15, 2) DEFAULT 0,
    terms_and_conditions TEXT,
    contract_doc_url TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXTENDED', 'TERMINATED', 'EXPIRED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.7 RENT BILLS
CREATE TABLE IF NOT EXISTS rent_bills (
    id TEXT PRIMARY KEY,
    bill_number TEXT UNIQUE NOT NULL,
    contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    property_id TEXT NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
    period_name TEXT NOT NULL,
    period_start DATE,
    period_end DATE,
    due_date DATE NOT NULL,
    rent_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    other_charges NUMERIC(15, 2) DEFAULT 0,
    discount_amount NUMERIC(15, 2) DEFAULT 0,
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(15, 2) DEFAULT 0,
    remaining_amount NUMERIC(15, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.8 PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    payment_number TEXT UNIQUE NOT NULL,
    bill_id TEXT REFERENCES rent_bills(id) ON DELETE SET NULL,
    contract_id TEXT REFERENCES contracts(id) ON DELETE SET NULL,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
    property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
    payment_date DATE NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'TRANSFER_BANK' CHECK (payment_method IN ('TUNAI', 'TRANSFER_BANK', 'QRIS', 'OTHER')),
    account_id TEXT REFERENCES cash_bank_accounts(id) ON DELETE SET NULL,
    proof_url TEXT,
    receipt_number TEXT,
    notes TEXT,
    received_by TEXT,
    status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.9 CASH MUTATIONS (AUDIT TRAIL ARUS KAS)
CREATE TABLE IF NOT EXISTS cash_mutations (
    id TEXT PRIMARY KEY,
    mutation_number TEXT UNIQUE NOT NULL,
    mutation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    from_account_id TEXT REFERENCES cash_bank_accounts(id) ON DELETE SET NULL,
    to_account_id TEXT REFERENCES cash_bank_accounts(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL,
    mutation_type TEXT NOT NULL CHECK (mutation_type IN ('IN', 'OUT', 'TRANSFER')),
    reference_type TEXT,
    reference_id TEXT,
    description TEXT,
    recorded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.10 EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    expense_number TEXT UNIQUE NOT NULL,
    property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
    expense_date DATE NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    payment_method TEXT DEFAULT 'TRANSFER',
    account_id TEXT REFERENCES cash_bank_accounts(id) ON DELETE SET NULL,
    receipt_doc_url TEXT,
    recorded_by TEXT,
    status TEXT NOT NULL DEFAULT 'PAID' CHECK (status IN ('PAID', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.11 DEPOSITS (UANG JAMINAN)
CREATE TABLE IF NOT EXISTS deposits (
    id TEXT PRIMARY KEY,
    deposit_number TEXT UNIQUE NOT NULL,
    contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
    property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
    received_date DATE NOT NULL,
    deposit_amount NUMERIC(15, 2) NOT NULL,
    account_id TEXT REFERENCES cash_bank_accounts(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD', 'REFUNDED', 'PARTIALLY_REFUNDED', 'DEDUCTED')),
    deduction_amount NUMERIC(15, 2) DEFAULT 0,
    deduction_reason TEXT,
    refund_amount NUMERIC(15, 2) DEFAULT 0,
    refund_date DATE,
    refund_account_id TEXT REFERENCES cash_bank_accounts(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.12 MAINTENANCE TICKETS
CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id TEXT PRIMARY KEY,
    ticket_number TEXT UNIQUE NOT NULL,
    tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
    room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
    property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
    category TEXT NOT NULL,
    issue_description TEXT NOT NULL,
    photo_url TEXT,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    assigned_to TEXT,
    estimated_cost NUMERIC(15, 2) DEFAULT 0,
    actual_cost NUMERIC(15, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'BARU' CHECK (status IN ('BARU', 'DIPROSES', 'MENUNGGU_SPAREPART', 'SELESAI', 'DIBATALKAN')),
    resolution_notes TEXT,
    completion_date DATE,
    expense_id TEXT REFERENCES expenses(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.13 METER READINGS (LISTRIK & AIR)
CREATE TABLE IF NOT EXISTS meter_readings (
    id TEXT PRIMARY KEY,
    room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
    property_id TEXT REFERENCES properties(id) ON DELETE CASCADE,
    reading_date DATE NOT NULL,
    utility_type TEXT NOT NULL CHECK (utility_type IN ('ELECTRICITY', 'WATER')),
    previous_meter NUMERIC(12, 2) NOT NULL DEFAULT 0,
    current_meter NUMERIC(12, 2) NOT NULL DEFAULT 0,
    usage_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    rate_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
    recorded_by TEXT,
    meter_photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.14 SETTINGS
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    category TEXT DEFAULT 'GENERAL',
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.15 ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    username TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    target_id TEXT,
    details TEXT,
    ip_address TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ATTACH UPDATED_AT TRIGGERS
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.columns WHERE column_name = 'updated_at' AND table_schema = 'public' LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_update_timestamp_%I ON %I;', t, t);
        EXECUTE format('CREATE TRIGGER trg_update_timestamp_%I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();', t, t);
    END LOOP;
END;
$$;

-- 5. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_rooms_property_id ON rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contracts_room ON contracts(room_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_rent_bills_contract ON rent_bills(contract_id);
CREATE INDEX IF NOT EXISTS idx_rent_bills_status ON rent_bills(status);
CREATE INDEX IF NOT EXISTS idx_rent_bills_due_date ON rent_bills(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON tenants(phone);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_cash_mutations_date ON cash_mutations(mutation_date);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- Aktifkan RLS di setiap tabel publik
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses: Akses penuh untuk authenticated user dan service_role, serta baca publik dengan anon key
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', 'Allow full access to authenticated and service_role', tbl);
        EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (true) WITH CHECK (true);', 'Allow full access to authenticated and service_role', tbl);
    END LOOP;
END;
$$;

-- 7. DEFAULT SEED DATA
INSERT INTO users (id, username, email, full_name, role, phone, status)
VALUES ('USR_OWNER_01', 'admin', 'owner@kosmanagement.com', 'Owner / Administrator', 'OWNER', '081234567890', 'ACTIVE')
ON CONFLICT (username) DO NOTHING;

INSERT INTO settings (id, key, value, category, description)
VALUES 
    ('SET_APP_NAME', 'APP_NAME', 'Kos Management System', 'GENERAL', 'Nama Aplikasi'),
    ('SET_OWNER_WA', 'WHATSAPP_OWNER_NUMBER', '081234567890', 'NOTIFICATION', 'Nomor WhatsApp Owner untuk notifikasi otomatis transaksi'),
    ('SET_ELECTRIC_RATE', 'ELECTRICITY_DEFAULT_RATE', '2000', 'RATES', 'Tarif Listrik per kWh'),
    ('SET_WATER_RATE', 'WATER_DEFAULT_RATE', '5000', 'RATES', 'Tarif Air per m3')
ON CONFLICT (key) DO NOTHING;

INSERT INTO cash_bank_accounts (id, account_code, account_name, account_type, bank_name, account_number, holder_name, initial_balance, current_balance, status)
VALUES
    ('ACC_CASH_01', 'KAS-TUNAI', 'Kas Tunai Pengelola', 'CASH', 'Kas Operasional', '-', 'Pengelola Kos', 1000000, 1000000, 'ACTIVE'),
    ('ACC_BANK_01', 'BCA-OPS', 'Rekening BCA Operasional', 'BANK', 'Bank Central Asia (BCA)', '8720192831', 'H. Budiman', 5000000, 5000000, 'ACTIVE')
ON CONFLICT (account_code) DO NOTHING;


-- ============================================================================
-- 8. SUPABASE STORAGE BUCKET UNTUK FOTO (PENGHUNI, KAMAR, PROPERTI)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kos-photos', 'kos-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Kebijakan Akses Storage Publik
DROP POLICY IF EXISTS "Public View kos-photos" ON storage.objects;
CREATE POLICY "Public View kos-photos" ON storage.objects FOR SELECT USING (bucket_id = 'kos-photos');

DROP POLICY IF EXISTS "Public Upload kos-photos" ON storage.objects;
CREATE POLICY "Public Upload kos-photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kos-photos');

DROP POLICY IF EXISTS "Public Update kos-photos" ON storage.objects;
CREATE POLICY "Public Update kos-photos" ON storage.objects FOR UPDATE USING (bucket_id = 'kos-photos');
