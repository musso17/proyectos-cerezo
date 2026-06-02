"use client";

import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import {
  Search,
  Plus,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  Settings,
  Activity,
  FolderOpen,
  Calendar as CalendarIcon,
  Images,
  Layers,
  Radio,
  ChevronDown,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { supabase } from '../supabaseclient';
import useStore from '../hooks/useStore';
import UserSettingsPanel from './UserSettingsPanel';

const NAV_ITEMS = [
  { id: 'Dashboard', icon: Activity, label: 'Inicio' },
  { id: 'Table', icon: FolderOpen, label: 'Proyectos' },
  { id: 'Calendar', icon: CalendarIcon, label: 'Calendario' },
  { id: 'Gallery', icon: Images, label: 'Galería' },
  { id: 'Edition', icon: Layers, label: 'Edición' },
];

const VOICE_ROOMS = [
  { id: 'General', emoji: '🎙️' },
  { id: 'Carbono', emoji: '🚗' },
];

const isFranciscoUser = (user) =>
  user?.email?.toString().trim().toLowerCase() === 'francisco@carbonomkt.com';

// ─── Salas de voz (popover) ───────────────────────────────────────────────────
const VoiceRoomsButton = () => {
  const activeVoiceRoom = useStore((state) => state.activeVoiceRoom);
  const setActiveVoiceRoom = useStore((state) => state.setActiveVoiceRoom);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          'flex h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-all',
          activeVoiceRoom
            ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400'
            : 'border-slate-200 bg-white text-secondary hover:bg-slate-50 dark:border-white/5 dark:bg-[#1E1F23] dark:text-white/70 dark:hover:bg-white/10'
        )}
        aria-label="Salas de voz"
      >
        <Radio size={16} className={activeVoiceRoom ? 'animate-pulse' : ''} />
        <span className="hidden lg:inline">{activeVoiceRoom || 'Salas'}</span>
        <ChevronDown size={13} className="opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#16171D]">
          <p className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary/50 dark:text-white/30">
            Salas de voz
          </p>
          {VOICE_ROOMS.map(({ id, emoji }) => {
            const isActive = activeVoiceRoom === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setActiveVoiceRoom(isActive ? null : id); setOpen(false); }}
                className={clsx(
                  'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-all',
                  isActive
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400 font-medium'
                    : 'text-secondary hover:bg-slate-50 dark:text-white/60 dark:hover:bg-white/5'
                )}
              >
                <span className="text-base leading-none">{emoji}</span>
                <span className="flex-1 text-left">{id}</span>
                {isActive && <span className="text-[10px] font-semibold uppercase text-green-500">En vivo</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Top navigation ───────────────────────────────────────────────────────────
const TopNav = () => {
  const openModal = useStore((state) => state.openModal);
  const searchTerm = useStore((state) => state.searchTerm);
  const setSearchTerm = useStore((state) => state.setSearchTerm);
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);
  const setProjects = useStore((state) => state.setProjects);
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const currentUser = useStore((state) => state.currentUser);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const allowedViews = useStore((state) => state.allowedViews);
  const userAvailability = useStore((state) => state.userAvailability);
  const setUserAvailability = useStore((state) => state.setUserAvailability);

  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = NAV_ITEMS.filter((item) => allowedViews.includes(item.id));

  const handleAddNew = () => openModal({ properties: {} });

  const handleNavigate = (view) => {
    setCurrentView(view);
    setMobileOpen(false);
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);

    const clearLocalState = () => {
      setProjects([]);
      setSearchTerm('');
      setCurrentUser(null);
      if (typeof window !== 'undefined') {
        ['cerezo-projects', 'cerezo-retainers', 'cerezo-agent-state'].forEach((k) => {
          try { window.localStorage.removeItem(k); } catch {}
        });
        try {
          Object.keys(window.localStorage).forEach((k) => { if (k.startsWith('sb-')) window.localStorage.removeItem(k); });
        } catch {}
      }
    };

    const redirectToLogin = () => {
      router.replace('/login');
      if (typeof window !== 'undefined') {
        window.setTimeout(() => window.location.assign('/login'), 150);
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

  const iconBtn =
    'flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-secondary transition-all hover:scale-105 active:scale-95 dark:border-white/5 dark:bg-[#1E1F23] dark:text-white/70 dark:hover:bg-white/10';

  return (
    <>
      <header className="glass-panel sticky top-0 z-40 animate-fade-up rounded-lg px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Brand */}
          <div className="flex shrink-0 items-center gap-3 pr-1">
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-accent">Cerezo</span>
              <span className="text-sm font-semibold text-primary dark:text-white">Studio Planner</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative ml-auto hidden min-w-0 flex-1 items-center sm:flex sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm font-medium text-primary placeholder:text-secondary/50 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 dark:border-white/5 dark:bg-[#0B0C10] dark:text-white dark:placeholder:text-white/20"
            />
          </div>

          {/* Right cluster — desktop */}
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <select
              value={userAvailability}
              onChange={(e) => setUserAvailability(e.target.value)}
              className="hidden h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-accent focus:outline-none xl:block dark:border-white/5 dark:bg-[#1E1F23] dark:text-white/80"
            >
              <option value="Activo - Editando">🟢 Activo</option>
              <option value="Ocupado">🟡 Ocupado</option>
              <option value="Fuera de la oficina">⚪ Fuera</option>
            </select>

            <div className="hidden sm:block"><VoiceRoomsButton /></div>

            <button type="button" onClick={toggleTheme} className={clsx(iconBtn, 'hidden sm:flex')} aria-label="Tema">
              {theme === 'dark' ? <Sun size={18} className="text-accent" /> : <Moon size={18} />}
            </button>
            <button type="button" onClick={() => setShowSettings(true)} className={clsx(iconBtn, 'hidden sm:flex')} aria-label="Ajustes">
              <Settings size={18} />
            </button>
            <button type="button" onClick={handleSignOut} disabled={signingOut} className={clsx(iconBtn, 'hidden sm:flex disabled:opacity-60')} aria-label="Cerrar sesión">
              <LogOut size={18} />
            </button>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className={clsx(iconBtn, 'sm:hidden')}
              aria-label="Menú"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Row 2 — barra de navegación (desktop) */}
        <nav className="mt-3 hidden items-center gap-1 border-t border-slate-200/70 pt-3 md:flex dark:border-white/5">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={clsx(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all lg:px-4',
                  isActive
                    ? 'bg-accent text-white shadow-[0_6px_20px_rgba(255,75,42,0.25)]'
                    : 'text-secondary hover:bg-slate-100 dark:text-white/55 dark:hover:bg-white/5'
                )}
              >
                <item.icon size={16} />
                <span className="hidden lg:inline">{item.label}</span>
              </button>
            );
          })}

          {/* Cotización + Nuevo a la derecha */}
          <div className="ml-auto flex items-center gap-2">
            {!isFranciscoUser(currentUser) && (
              <a
                href="https://cotizacionescr.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-secondary transition-all hover:bg-slate-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
              >
                Cotización
              </a>
            )}
            <button
              onClick={handleAddNew}
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-dark-bg px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition-all hover:-translate-y-0.5 dark:bg-accent"
            >
              <Plus size={18} strokeWidth={3} />
              <span>Nuevo</span>
            </button>
          </div>
        </nav>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="mt-3 flex flex-col gap-2 border-t border-slate-200 pt-3 sm:hidden dark:border-white/5">
            <div className="relative flex items-center">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-primary focus:border-accent focus:outline-none dark:border-white/5 dark:bg-[#0B0C10] dark:text-white"
              />
            </div>
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive ? 'bg-accent text-white' : 'text-secondary dark:text-white/60'
                  )}
                >
                  <item.icon size={17} />
                  {item.label}
                </button>
              );
            })}
            <VoiceRoomsButton />
            <div className="flex items-center gap-2 pt-1">
              <button onClick={toggleTheme} className={iconBtn}>{theme === 'dark' ? <Sun size={18} className="text-accent" /> : <Moon size={18} />}</button>
              <button onClick={() => { setShowSettings(true); setMobileOpen(false); }} className={iconBtn}><Settings size={18} /></button>
              <button onClick={handleSignOut} disabled={signingOut} className={clsx(iconBtn, 'disabled:opacity-60')}><LogOut size={18} /></button>
              {!isFranciscoUser(currentUser) && (
                <a href="https://cotizacionescr.netlify.app/" target="_blank" rel="noopener noreferrer" className="ml-auto rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase text-secondary dark:border-white/10 dark:text-white/70">Cotización</a>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Floating "+" on mobile */}
      <button
        type="button"
        onClick={handleAddNew}
        aria-label="Crear nuevo proyecto"
        className="fixed bottom-6 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-dark-bg text-white shadow-2xl transition-all hover:-translate-y-2 hover:scale-110 active:scale-95 sm:hidden dark:bg-accent"
      >
        <Plus size={28} strokeWidth={3} />
      </button>

      {showSettings && <UserSettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  );
};

export default TopNav;
