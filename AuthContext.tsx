'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/database';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  updateUserPassword: async () => ({ success: false })
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
        // Fallback jika database Supabase users masih kosong saat awal setup
        if (uName === 'admin' && (pWord === 'admin123' || pWord === 'admin')) {
          const fallbackUser: User = {
            id: 'USR_OWNER_01',
            username: 'admin',
            full_name: 'Owner / Administrator',
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
    <AuthContext.Provider value={{ currentUser, loading, login, logout, updateUserPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
