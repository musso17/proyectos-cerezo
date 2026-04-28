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
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleAddNew = () => {
    openModal({ properties: {} });
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);

    const clearLocalState = () => {
      setProjects([]);
      setSearchTerm('');
      setCurrentUser(null);

      if (typeof window !== 'undefined') {
        const keysToClear = ['cerezo-projects', 'cerezo-retainers', 'cerezo-agent-state'];
        keysToClear.forEach((key) => {
          try {
            window.localStorage.removeItem(key);
          } catch (storageError) {
            console.warn(`No se pudo limpiar ${key}:`, storageError);
          }
        });

        try {
          Object.keys(window.localStorage).forEach((key) => {
            if (key.startsWith('sb-')) {
              window.localStorage.removeItem(key);
            }
          });
        } catch (supabaseStorageError) {
          console.warn('No se pudieron limpiar las credenciales de Supabase:', supabaseStorageError);
        }
        try {
          Object.keys(window.sessionStorage || {}).forEach((key) => {
            if (key.startsWith('sb-')) {
              window.sessionStorage.removeItem(key);
            }
          });
        } catch (sessionError) {
          console.warn('No se pudieron limpiar los tokens de sesión de Supabase:', sessionError);
        }
      }
    };

    const redirectToLogin = () => {
      router.replace('/login');
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          window.location.assign('/login');
        }, 150);
      }
    };

    try {
      if (supabase) {
        await supabase.auth.signOut({ scope: 'global' });
        await supabase.auth.signOut({ scope: 'local' });
      }

      clearLocalState();
      toast.success('Sesión cerrada');
      redirectToLogin();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      clearLocalState();
      toast.error('No se pudo cerrar la sesión (modo seguro)');
      redirectToLogin();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <header className="glass-panel animate-fade-up flex w-full flex-col gap-3 rounded-3xl px-4 py-4 transition-all duration-300 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 md:rounded-[2.5rem]">
        <div className="flex w-full items-center gap-2 sm:max-w-md">
          <button
            type="button"
            onClick={toggleMobileSidebar}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white text-secondary transition hover:bg-[#EEF1F6] hover:text-primary md:hidden dark:border-[#2B2D31] dark:bg-[#1E1F23] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white/90"
            aria-label="Abrir menú"
          >
            <Menu size={18} />
          </button>
          <div className="relative flex-1 items-center">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-accent/40" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar proyectos, clientes..."
              className="w-full rounded-2xl border border-[#D1D5DB] bg-white py-2.5 pl-12 pr-4 text-sm text-primary font-medium placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 dark:border-white/5 dark:bg-[#0B0C10] dark:text-white dark:placeholder:text-white/20 transition-all duration-300"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-secondary transition-all duration-300 hover:scale-110 active:scale-95 dark:border-white/5 dark:bg-[#1E1F23] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white/90"
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={18} className="text-accent" /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-secondary transition-all duration-300 hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/5 dark:bg-[#1E1F23] dark:text-white/60 dark:hover:bg-[#2A1C1C] dark:hover:text-red-300"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
          <button
            onClick={handleAddNew}
            type="button"
            className="hidden items-center justify-center gap-2 rounded-2xl bg-dark-bg px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[#FF4B2A]/20 sm:inline-flex dark:bg-accent dark:text-white dark:shadow-[#FF4B2A]/10"
          >
            <Plus size={18} strokeWidth={3} />
            <span>Nuevo</span>
          </button>
        </div>
      </header>
      <button
        type="button"
        onClick={handleAddNew}
        aria-label="Crear nuevo proyecto"
        className="fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-dark-bg text-white dark:bg-accent dark:text-white shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-110 active:scale-95 sm:hidden"
      >
        <Plus size={28} strokeWidth={3} />
      </button>
    </>
  );
};

export default Navbar;
