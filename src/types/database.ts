export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface User {
  id: string;
  username: string;
  email?: string;
  full_name: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF';
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE';
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  property_code: string;
  name: string;
  address: string;
  owner_name?: string;
  phone?: string;
  total_floors?: number;
  photo_url?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  room_code: string;
  name: string;
  property_id: string;
  floor: number;
  room_type: string;
  dimensions?: string;
  base_price: number;
  facilities?: string;
  photo_url?: string;
  status: 'KOSONG' | 'TERISI' | 'PERBAIKAN' | 'DIPESAN';
  notes?: string;
  created_at: string;
  updated_at: string;
  property?: Property;
}

export interface Tenant {
  id: string;
  tenant_code: string;
  full_name: string;
  id_card_number?: string;
  phone: string;
  email?: string;
  origin_address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  occupation?: string;
  photo_url?: string;
  id_card_photo_url?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ALUMNI';
  created_at: string;
  updated_at: string;
  active_contract?: Contract;
}

export interface CashBankAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: 'CASH' | 'BANK' | 'EWALLET';
  bank_name: string;
  account_number: string;
  holder_name: string;
  initial_balance: number;
  current_balance: number;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  contract_number: string;
  tenant_id: string;
  room_id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  rent_price: number;
  billing_cycle: string;
  due_day: number;
  deposit_amount: number;
  terms_and_conditions?: string;
  contract_doc_url?: string;
  status: 'ACTIVE' | 'EXTENDED' | 'TERMINATED' | 'EXPIRED';
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
  room?: Room;
}

export interface RentBill {
  id: string;
  bill_number: string;
  contract_id: string;
  tenant_id: string;
  room_id: string;
  property_id: string;
  period_name: string;
  period_start?: string;
  period_end?: string;
  due_date: string;
  rent_amount: number;
  other_charges: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  notes?: string;
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
  room?: Room;
}

export interface Payment {
  id: string;
  payment_number: string;
  bill_id?: string;
  contract_id?: string;
  tenant_id: string;
  room_id?: string;
  property_id?: string;
  payment_date: string;
  amount: number;
  payment_method: 'TUNAI' | 'TRANSFER_BANK' | 'QRIS' | 'OTHER';
  account_id?: string;
  proof_url?: string;
  receipt_number?: string;
  notes?: string;
  received_by?: string;
  status: 'CONFIRMED' | 'CANCELLED';
  created_at: string;
  account?: CashBankAccount;
}

export interface CashMutation {
  id: string;
  mutation_number: string;
  mutation_date: string;
  from_account_id?: string;
  to_account_id?: string;
  amount: number;
  mutation_type: 'IN' | 'OUT' | 'TRANSFER';
  reference_type?: string;
  reference_id?: string;
  description?: string;
  recorded_by?: string;
  created_at: string;
  from_account?: CashBankAccount;
  to_account?: CashBankAccount;
}

export interface Expense {
  id: string;
  expense_number: string;
  property_id?: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  account_id?: string;
  receipt_doc_url?: string;
  recorded_by?: string;
  status: 'PAID' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface Deposit {
  id: string;
  deposit_number: string;
  contract_id?: string;
  tenant_id: string;
  room_id?: string;
  property_id?: string;
  received_date: string;
  deposit_amount: number;
  account_id?: string;
  status: 'HELD' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'DEDUCTED';
  deduction_amount: number;
  deduction_reason?: string;
  refund_amount: number;
  refund_date?: string;
  refund_account_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
  room?: Room;
}

export interface MaintenanceTicket {
  id: string;
  ticket_number: string;
  tenant_id?: string;
  room_id?: string;
  property_id?: string;
  category: string;
  issue_description: string;
  photo_url?: string;
  report_date: string;
  assigned_to?: string;
  estimated_cost: number;
  actual_cost: number;
  status: 'BARU' | 'DIPROSES' | 'MENUNGGU_SPAREPART' | 'SELESAI' | 'DIBATALKAN';
  resolution_notes?: string;
  completion_date?: string;
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
  room?: Room;
}

export interface MeterReading {
  id: string;
  room_id: string;
  property_id?: string;
  reading_date: string;
  utility_type: 'ELECTRICITY' | 'WATER';
  previous_meter: number;
  current_meter: number;
  usage_amount: number;
  rate_per_unit: number;
  total_cost: number;
  recorded_by?: string;
  meter_photo_url?: string;
  notes?: string;
  created_at: string;
  room?: Room;
}

export interface Setting {
  id: string;
  key: string;
  value: string;
  category?: string;
  description?: string;
  updated_at: string;
}
