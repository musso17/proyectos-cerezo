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

  useEffect(() => {
    const initializeApp = async () => {
      await fetchProjects();
      // Now that projects are fetched, run the state check
      await checkAndAdvanceProjectStates();
    };

    initializeApp();
  }, [fetchProjects, checkAndAdvanceProjectStates]);

  return (
    <html lang="es">
      <body className={`${inter.className} bg-[#F7F8FA] text-[#2E2E2E] antialiased`}>
        <div className="relative flex min-h-screen flex-col">{children}</div>
      </body>
    </html>
  );
}
