"use client";

import React, { useState } from 'react';
import { Search, Plus, Menu, LogOut, Sun, Moon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseclient';
import useStore from '../hooks/useStore';

const Navbar = () => {
  const openModal = useStore((state) => state.openModal);
  const searchTerm = useStore((state) => state.searchTerm);
  const setSearchTerm = useStore((state) => state.setSearchTerm);
  const toggleMobileSidebar = useStore((state) => state.toggleMobileSidebar);
  const setProjects = useStore((state) => state.setProjects);
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleAddNew = () => {
    openModal({ properties: {} });
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      setProjects([]);
      setSearchTerm('');
      toast.success('Sesión cerrada');
      router.replace('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('No se pudo cerrar la sesión');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <header className="glass-panel animate-fade-up flex w-full flex-col gap-3 rounded-3xl px-4 py-4 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 md:rounded-[32px]">
        <div className="flex w-full items-center gap-2 sm:max-w-md">
          <button
            type="button"
            onClick={toggleMobileSidebar}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-secondary transition hover:bg-[#EEF1F6] hover:text-primary md:hidden dark:border-[#2B2D31] dark:bg-[#1E1F23] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white/90"
            aria-label="Abrir menú"
          >
            <Menu size={18} />
          </button>
          <div className="relative flex-1 items-center">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-white/40" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar proyectos, clientes o responsables…"
              className="w-full rounded-xl border border-[#D1D5DB] bg-white py-2.5 pl-12 pr-4 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-[#2B2D31] dark:bg-[#1B1C20] dark:text-white/70 dark:placeholder:text-white/40"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-secondary transition hover:bg-[#EEF1F6] hover:text-primary dark:border-[#2B2D31] dark:bg-[#1E1F23] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white/90"
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-secondary transition hover:bg-[#FDECEC] hover:text-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2B2D31] dark:bg-[#1E1F23] dark:text-white/60 dark:hover:bg-[#2A1C1C] dark:hover:text-red-300"
            aria-label="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
          <button
            onClick={handleAddNew}
            type="button"
            className="hidden items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(108,99,255,0.25)] transition duration-200 ease-[var(--ease-ios-out)] hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(108,99,255,0.35)] sm:inline-flex dark:bg-accent dark:text-white dark:shadow-[0_12px_30px_rgba(108,99,255,0.35)]"
          >
            <Plus size={16} />
            <span>Nuevo proyecto</span>
          </button>
        </div>
      </header>
      <button
        type="button"
        onClick={handleAddNew}
        aria-label="Crear nuevo proyecto"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_18px_36px_rgba(108,99,255,0.35)] transition hover:-translate-y-1 hover:shadow-[0_26px_48px_rgba(108,99,255,0.45)] sm:hidden"
      >
        <Plus size={22} />
      </button>
    </>
  );
};

export default Navbar;
