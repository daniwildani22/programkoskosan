'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface NavContextType {
  mobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
}

const NavContext = createContext<NavContextType>({
  mobileMenuOpen: false,
  toggleMobileMenu: () => {},
  closeMobileMenu: () => {}
});

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Otomatis tutup menu drawer saat pengguna berpindah halaman
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Kunci scroll body saat mobile menu drawer terbuka
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  function toggleMobileMenu() {
    setMobileMenuOpen(prev => !prev);
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <NavContext.Provider value={{ mobileMenuOpen, toggleMobileMenu, closeMobileMenu }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  return useContext(NavContext);
}
