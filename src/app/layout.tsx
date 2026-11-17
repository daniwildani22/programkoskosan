import './globals.css';
import type { Metadata } from 'next';
import AppLayoutWrapper from '@/components/AppLayoutWrapper';

export const metadata: Metadata = {
  title: 'Kos Management System - Finora Cloud',
  description: 'Aplikasi Manajemen Rumah Kos Terpadu dengan Supabase & Vercel',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[#f8fafc]">
        <AppLayoutWrapper>
          {children}
        </AppLayoutWrapper>
      </body>
    </html>
  );
}
