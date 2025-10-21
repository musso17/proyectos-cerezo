"use client";

import React from 'react';
import { Search, Plus } from 'lucide-react';
import useStore from '../hooks/useStore';

const Navbar = () => {
  const openModal = useStore((state) => state.openModal);
  const searchTerm = useStore((state) => state.searchTerm);
  const setSearchTerm = useStore((state) => state.setSearchTerm);

  const handleAddNew = () => {
    openModal({ properties: {} });
  };

  return (
    <header className="glass-panel animate-fade-up flex flex-col gap-3 rounded-3xl px-6 py-4 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex w-full items-center sm:max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Buscar proyectos, clientes o responsables…"
          className="w-full rounded-2xl border border-white/10 bg-white/10 py-2.5 pl-12 pr-4 text-sm text-slate-100 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
        />
      </div>
      <button
        onClick={handleAddNew}
        type="button"
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_10px_20px_rgba(56,189,248,0.35)] transition duration-200 ease-[var(--ease-ios-out)] hover:-translate-y-0.5 hover:shadow-[0_18px_30px_rgba(56,189,248,0.45)]"
      >
        <Plus size={16} />
        <span>Nuevo proyecto</span>
      </button>
    </header>
  );
};

export default Navbar;
