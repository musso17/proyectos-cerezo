'use client';
import { useEffect } from 'react';
import useStore from '../hooks/useStore';
import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

// Metadata is now exported from page.jsx or specific layouts, not here in a client component.

export default function RootLayout({ children }) {
  const fetchProjects = useStore((state) => state.fetchProjects);
  const checkAndAdvanceProjectStates = useStore((state) => state.checkAndAdvanceProjectStates);
  const initializeTheme = useStore((state) => state.initializeTheme);
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    const initializeApp = async () => {
      await fetchProjects();
      // Now that projects are fetched, run the state check
      await checkAndAdvanceProjectStates();
    };

    initializeApp();
  }, [fetchProjects, checkAndAdvanceProjectStates]);

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.theme = theme;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <html lang="es">
      <body className={`${inter.className} bg-background text-primary antialiased transition-colors duration-300`}>
        <div className="relative flex min-h-screen flex-col">{children}</div>
      </body>
    </html>
  );
}
