'use client';

import { useEffect } from 'react';
import useStore from '../hooks/useStore';

// Maneja la inicialización y aplicación del tema (clase .dark / data-theme en <html>).
// Aislado en un client component para que el RootLayout pueda ser server component
// y exportar `metadata` / `viewport` (PWA, apple-mobile-web-app, etc.).
export default function ThemeManager({ children }) {
  const initializeTheme = useStore((state) => state.initializeTheme);
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return children;
}
