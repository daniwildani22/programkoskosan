import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Client untuk frontend (menggunakan Anon Key dengan batasan RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper untuk format rupiah
export function formatRupiah(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return "Rp 0";
  return "Rp " + Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Helper untuk format tanggal Indonesia
export function formatDateDisplay(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const parts = String(dateStr).substring(0, 10).split("-");
  if (parts.length === 3) {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
    const mIdx = parseInt(parts[1], 10) - 1;
    return `${parts[2]} ${months[mIdx] || parts[1]} ${parts[0]}`;
  }
  return dateStr;
}
