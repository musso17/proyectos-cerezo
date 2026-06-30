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
  ExternalLink,
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

const AVAILABILITY = [
  { value: 'Activo - Editando', label: 'Activo', dot: 'bg-green-500', emoji: '🟢' },
  { value: 'Ocupado', label: 'Ocupado', dot: 'bg-amber-500', emoji: '🟡' },
  { value: 'Fuera de la oficina', label: 'Fuera', dot: 'bg-slate-400', emoji: '⚪' },
];

const isFranciscoUser = (user) =>
  user?.email?.toString().trim().toLowerCase() === 'francisco@carbonomkt.com';

// ─── Presencia / disponibilidad del usuario (avatar + popover) ─────────────────
const PresenceButton = () => {
  const currentUser = useStore((state) => state.currentUser);
  const userAvailability = useStore((state) => state.userAvailability);
  const setUserAvailability = useStore((state) => state.setUserAvailability);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = AVAILABILITY.find((a) => a.value === userAvailability) || AVAILABILITY[0];
  // Preferir el nombre de usuario (display_name) sobre el email para el avatar/inicial.
  const meta = currentUser?.user_metadata || {};
  const emailLocal = currentUser?.email ? currentUser.email.toString().trim().split('@')[0] : '';
  const name = (meta.display_name || meta.full_name || meta.name || emailLocal || 'Tú').toString().trim();
  const initial = (name.charAt(0) || '?').toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white pl-1.5 pr-2 text-sm font-medium text-secondary transition-all hover:bg-slate-50 dark:border-white/5 dark:bg-[#1E1F23] dark:text-white/70 dark:hover:bg-white/10"
        title={`Tu estado: ${current.label}`}
        aria-label={`Tu estado: ${current.label}`}
      >
        <span className="relative inline-flex">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-bold uppercase text-accent">
            {initial}
          </span>
          <span className={clsx('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#1E1F23]', current.dot)} />
        </span>
        <span className="hidden text-xs xl:inline">{current.label}</span>
        <ChevronDown size={13} className="hidden opacity-60 xl:inline" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-[#16171D]">
          <div className="flex items-center gap-2 px-2 pb-2 pt-1">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-bold uppercase text-accent">{initial}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-primary dark:text-white">{name}</p>
              <p className="text-[11px] text-secondary/70 dark:text-white/40">Tu disponibilidad</p>
            </div>
          </div>
          <div className="h-px bg-slate-100 dark:bg-white/5" />
          {AVAILABILITY.map(({ value, label, dot }) => {
            const isActive = userAvailability === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => { setUserAvailability(value); setOpen(false); }}
                className={clsx(
                  'mt-1 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-all',
                  isActive
                    ? 'bg-slate-100 font-medium text-primary dark:bg-white/10 dark:text-white'
                    : 'text-secondary hover:bg-slate-50 dark:text-white/60 dark:hover:bg-white/5'
                )}
              >
                <span className={clsx('h-2.5 w-2.5 rounded-full', dot)} />
                <span className="flex-1 text-left">{label}</span>
                {isActive && <span className="text-[10px] font-semibold uppercase text-secondary/60 dark:text-white/30">Actual</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

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
        title={activeVoiceRoom ? `En vivo: ${activeVoiceRoom}` : 'Salas de voz'}
        aria-label="Salas de voz"
      >
        <Radio size={16} className={activeVoiceRoom ? 'animate-pulse' : ''} />
        <span className="hidden lg:inline">{activeVoiceRoom || 'Salas de voz'}</span>
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

  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  const navItems = NAV_ITEMS.filter((item) => allowedViews.includes(item.id));

  const handleAddNew = () => openModal({ properties: {} });

  const handleNavigate = (view) => {
    setCurrentView(view);
    setMobileOpen(false);
  };

  // ⌘K / Ctrl+K / "/" enfocan la búsqueda (sin robar el foco de otros inputs)
  useEffect(() => {
    const onKeyDown = (e) => {
      const el = document.activeElement;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      const slash = e.key === '/' && !typing;
      if (cmdK || slash) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
          <div className="flex shrink-0 flex-col leading-none pr-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-accent">Cerezo</span>
            <span className="text-[15px] font-bold tracking-tight text-primary dark:text-white">Studio Planner</span>
          </div>

          {/* Search — compacta, se expande al enfocar (⌘K / "/") */}
          <div className="relative hidden shrink-0 items-center sm:flex">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30" size={16} />
            <input
              ref={searchRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Buscar..."
              className="w-44 rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-12 text-sm font-medium text-primary transition-[width] duration-300 ease-[var(--ease-ios-out)] placeholder:text-secondary/50 focus:w-72 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 lg:w-52 lg:focus:w-80 dark:border-white/5 dark:bg-[#0B0C10] dark:text-white dark:placeholder:text-white/20"
            />
            {!searchTerm && (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-secondary/60 lg:flex dark:border-white/10 dark:bg-white/5 dark:text-white/30">
                ⌘K
              </kbd>
            )}

            {/* Hint de filtros rápidos — solo al enfocar con el campo vacío */}
            {searchFocused && !searchTerm && (
              <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-lg border border-slate-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-[#16171D]">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary/50 dark:text-white/30">
                  Filtros rápidos
                </p>
                <ul className="space-y-1.5 text-xs text-secondary/70 dark:text-white/50">
                  <li><code className="font-semibold text-accent">cliente:</code> Carbono</li>
                  <li><code className="font-semibold text-accent">estado:</code> vencido</li>
                  <li><code className="font-semibold text-accent">tipo:</code> spot</li>
                  <li><code className="font-semibold text-accent">responsable:</code> Marcelo</li>
                </ul>
              </div>
            )}
          </div>

          {/* Right cluster — desktop */}
          <div className="ml-auto flex items-center gap-2">
            {/* Presencia + colaboración en vivo */}
            <div className="hidden items-center gap-2 sm:flex">
              <PresenceButton />
              <VoiceRoomsButton />
            </div>

            {/* Separador entre presencia y utilidades */}
            <div className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-white/10" />

            <button type="button" onClick={toggleTheme} className={clsx(iconBtn, 'hidden sm:flex')} title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'} aria-label="Cambiar tema">
              {theme === 'dark' ? <Sun size={18} className="text-accent" /> : <Moon size={18} />}
            </button>
            <button type="button" onClick={() => setShowSettings(true)} className={clsx(iconBtn, 'hidden sm:flex')} title="Ajustes" aria-label="Ajustes">
              <Settings size={18} />
            </button>
            <button type="button" onClick={handleSignOut} disabled={signingOut} className={clsx(iconBtn, 'hidden sm:flex disabled:opacity-60')} title="Cerrar sesión" aria-label="Cerrar sesión">
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

        {/* Row 2 — navegación de la app (track segmentado, separado de los controles de sesión) */}
        <nav className="mt-3 hidden items-center gap-3 border-t border-slate-200/70 pt-3 md:flex dark:border-white/5">
          <div className="flex items-center gap-1 rounded-xl bg-slate-100/70 p-1 dark:bg-white/5">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={clsx(
                    'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all lg:px-4',
                    isActive
                      ? 'bg-white font-semibold text-primary shadow-sm dark:bg-white/10 dark:text-white'
                      : 'font-medium text-secondary hover:text-primary dark:text-white/55 dark:hover:text-white/80'
                  )}
                >
                  <item.icon size={16} className={isActive ? 'text-accent' : ''} />
                  <span className="hidden lg:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Cotización (secundario, discreto) + Nuevo (CTA primario) */}
          <div className="ml-auto flex items-center gap-1">
            {!isFranciscoUser(currentUser) && (
              <a
                href="https://cotizacionescr.netlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                title="Abre Cotizaciones en una nueva pestaña (app externa)"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-secondary transition-all hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/5"
              >
                Cotización
                <ExternalLink size={13} className="opacity-60" />
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
            <div className="flex flex-col gap-2 pt-1">
              <PresenceButton />
              <VoiceRoomsButton />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button onClick={toggleTheme} className={iconBtn} title="Cambiar tema">{theme === 'dark' ? <Sun size={18} className="text-accent" /> : <Moon size={18} />}</button>
              <button onClick={() => { setShowSettings(true); setMobileOpen(false); }} className={iconBtn} title="Ajustes"><Settings size={18} /></button>
              <button onClick={handleSignOut} disabled={signingOut} className={clsx(iconBtn, 'disabled:opacity-60')} title="Cerrar sesión"><LogOut size={18} /></button>
              {!isFranciscoUser(currentUser) && (
                <a href="https://cotizacionescr.netlify.app/" target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold uppercase text-secondary dark:border-white/10 dark:text-white/70">Cotización <ExternalLink size={12} className="opacity-60" /></a>
              )}
            </div>
          </div>
        )}
      </header>

      {showSettings && <UserSettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  );
};

export default TopNav;
