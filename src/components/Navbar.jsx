"use client";

import React from 'react';
import { Search, Plus, Bell, User } from 'lucide-react';
import useStore from '../hooks/useStore';

const Navbar = () => {
  const openModal = useStore((state) => state.openModal);

  const handleAddNew = () => {
    openModal({ properties: {} });
  };

  return (
    <header className="glass-panel flex items-center justify-between gap-4 rounded-3xl px-6 py-4">
      <div className="flex flex-col">
        <p className="text-xs uppercase tracking-[0.35em] text-blue-200/80">Pipeline</p>
        <span className="text-lg font-semibold text-slate-100">Todos los proyectos</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative hidden w-72 items-center sm:flex">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar o filtrar…"
            className="w-full rounded-2xl border border-white/10 bg-white/10 py-2.5 pl-12 pr-4 text-sm text-slate-100 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          />
        </div>
        <button
          type="button"
          className="rounded-full bg-white/10 p-2.5 text-slate-100 transition hover:bg-white/20"
          title="Notificaciones"
        >
          <Bell size={18} />
        </button>
        <button
          type="button"
          className="rounded-full bg-gradient-to-br from-white/15 to-white/5 p-2.5 text-slate-100 shadow-inner transition hover:from-white/25 hover:to-white/10"
          title="Perfil"
        >
          <User size={18} />
        </button>
        <button
          onClick={handleAddNew}
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_10px_20px_rgba(56,189,248,0.35)] transition hover:shadow-[0_12px_24px_rgba(56,189,248,0.45)]"
        >
          <Plus size={16} />
          <span>Nuevo proyecto</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
