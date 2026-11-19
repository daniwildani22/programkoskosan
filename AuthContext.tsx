'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, UserRole } from '@/types/database';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  isOwner: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  canAccessRoute: (routePath: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  updateUserPassword: async () => ({ success: false }),
  isOwner: false,
  isAdmin: false,
  isStaff: false,
  canAccessRoute: () => false
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Muat session tersimpan dari localStorage saat aplikasi dibuka
    const saved = localStorage.getItem('kms_session_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentUser(parsed);
      } catch (e) {
        localStorage.removeItem('kms_session_user');
      }
    }
    setLoading(false);
  }, []);

  // Proteksi rute: jika belum login dan bukan di halaman /login, lempar ke /login
  useEffect(() => {
    if (!loading) {
      if (!currentUser && pathname !== '/login') {
        router.push('/login');
      } else if (currentUser && pathname === '/login') {
        router.push('/');
      }
    }
  }, [currentUser, loading, pathname, router]);

  // Hak Akses Berdasarkan Role
  const currentRole = (currentUser?.role || 'STAFF').toUpperCase() as UserRole;
  const isOwner = currentRole === 'OWNER';
  const isAdmin = currentRole === 'ADMIN' || isOwner;
  const isStaff = currentRole === 'STAFF' || currentRole === 'USER';

  // Pemeriksaan izin akses rute halaman (Route Guard)
  function canAccessRoute(routePath: string): boolean {
    if (!currentUser) return false;
    if (isOwner) return true; // Owner memiliki akses ke 100% semua halaman

    // Rute yang dapat diakses oleh ADMIN (Operasional)
    const adminRoutes = [
      '/',
      '/properties',
      '/rooms',
      '/tenants',
      '/contracts',
      '/payments',
      '/utilities',
      '/expenses',
      '/finance',
      '/deposits',
      '/maintenance',
      '/settings' // Hanya tab ganti password sendiri
    ];

    // Rute yang dapat diakses oleh USER / STAFF (Lapangan / Frontline)
    const staffRoutes = [
      '/',
      '/properties', // Hanya lihat & bagikan maps
      '/rooms',      // Hanya lihat ketersediaan
      '/tenants',    // Hanya lihat identitas
      '/utilities',  // Catat meteran listrik & air
      '/maintenance',// Catat keluhan fasilitas
      '/settings'    // Hanya ganti password sendiri
    ];

    if (currentRole === 'ADMIN') {
      return adminRoutes.includes(routePath);
    }

    if (isStaff) {
      return staffRoutes.includes(routePath);
    }

    return false;
  }

  async function login(usernameInput: string, passwordInput: string): Promise<{ success: boolean; message?: string }> {
    const uName = usernameInput.trim().toLowerCase();
    const pWord = passwordInput.trim();

    try {
      // 1. Cari user di database Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('username', uName)
        .eq('status', 'ACTIVE')
        .single();

      if (error || !data) {
        // Fallback akun default jika tabel users di Supabase belum dibuat / kosong
        if (uName === 'admin' && (pWord === 'admin123' || pWord === 'admin')) {
          const fallbackUser: User = {
            id: 'USR_OWNER_01',
            username: 'admin',
            full_name: 'H. Budiman (Owner)',
            email: 'owner@kosmanagement.com',
            role: 'OWNER',
            phone: '081234567890',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setCurrentUser(fallbackUser);
          localStorage.setItem('kms_session_user', JSON.stringify(fallbackUser));
          return { success: true };
        }

        if (uName === 'pengelola' && (pWord === 'admin123' || pWord === 'pengelola')) {
          const fallbackUser: User = {
            id: 'USR_ADMIN_01',
            username: 'pengelola',
            full_name: 'Siti Rahma (Admin Operasional)',
            email: 'admin@kosmanagement.com',
            role: 'ADMIN',
            phone: '081298765432',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setCurrentUser(fallbackUser);
          localStorage.setItem('kms_session_user', JSON.stringify(fallbackUser));
          return { success: true };
        }

        if ((uName === 'user' || uName === 'staf') && (pWord === 'user123' || pWord === 'staf123' || pWord === 'user')) {
          const fallbackUser: User = {
            id: 'USR_STAFF_01',
            username: uName,
            full_name: 'Budi Santoso (Staf Lapangan)',
            email: 'staff@kosmanagement.com',
            role: 'USER',
            phone: '081345678901',
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          setCurrentUser(fallbackUser);
          localStorage.setItem('kms_session_user', JSON.stringify(fallbackUser));
          return { success: true };
        }

        return { success: false, message: 'Username tidak ditemukan atau akun dinonaktifkan.' };
      }

      // 2. Verifikasi Password
      // Jika password_hash di database masih null, password default adalah admin123 atau admin
      const isPasswordCorrect = data.password_hash 
        ? data.password_hash === pWord 
        : (pWord === 'admin123' || pWord === 'admin');

      if (!isPasswordCorrect) {
        return { success: false, message: 'Password yang Anda masukkan salah.' };
      }

      // 3. Update waktu login terakhir
      const now = new Date().toISOString();
      await supabase.from('users').update({ last_login: now }).eq('id', data.id);

      const loggedInUser: User = { ...data, last_login: now };
      setCurrentUser(loggedInUser);
      localStorage.setItem('kms_session_user', JSON.stringify(loggedInUser));

      return { success: true };
    } catch (err: any) {
      return { success: false, message: 'Terjadi kesalahan sistem: ' + err.message };
    }
  }

  function logout() {
    setCurrentUser(null);
    localStorage.removeItem('kms_session_user');
    router.push('/login');
  }

  async function updateUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          password_hash: newPassword.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      loading, 
      login, 
      logout, 
      updateUserPassword,
      isOwner,
      isAdmin,
      isStaff,
      canAccessRoute
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
