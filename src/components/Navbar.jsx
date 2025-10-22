"use client";

import React from 'react';
import { Search, Plus, Menu } from 'lucide-react';
import useStore from '../hooks/useStore';

const Navbar = () => {
  const openModal = useStore((state) => state.openModal);
  const searchTerm = useStore((state) => state.searchTerm);
  const setSearchTerm = useStore((state) => state.setSearchTerm);
  const toggleSidebar = useStore((state) => state.toggleSidebar);

  const handleAddNew = () => {
    openModal({ properties: {} });
  };

  return (
    <header className="glass-panel animate-fade-up flex flex-col gap-3 rounded-3xl px-4 py-4 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex w-full items-center gap-2 sm:max-w-md">
        <button
          type="button"
          onClick={toggleSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-slate-900 text-secondary shadow-[inset_0_1px_0_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5 hover:border-accent/70 hover:text-accent lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu size={18} />
        </button>
        <div className="relative flex-1 items-center">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar proyectos, clientes o responsables…"
            className="w-full rounded-2xl border border-border/60 bg-slate-900/70 py-2.5 pl-12 pr-4 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
      </div>
      <button
        onClick={handleAddNew}
        type="button"
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-500 to-lime-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_16px_32px_rgba(16,185,129,0.35)] transition duration-200 ease-[var(--ease-ios-out)] hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(16,185,129,0.45)]"
      >
        <Plus size={16} />
        <span>Nuevo proyecto</span>
      </button>
    </header>
  );
};

export default Navbar;
