"use client";

import React, { useState } from 'react';
import { ChevronLeft, Menu, List, Calendar, GanttChart, LayoutGrid } from 'lucide-react';
import useStore from '../hooks/useStore';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);

  const navItems = [
    { id: 'Table', icon: List, label: 'Table' },
    { id: 'Calendar', icon: Calendar, label: 'Calendar' },
    { id: 'Timeline', icon: GanttChart, label: 'Timeline' },
    { id: 'Gallery', icon: LayoutGrid, label: 'Gallery' },
  ];

  return (
    <aside
      className={`glass-panel flex h-[calc(100vh-6rem)] flex-col gap-6 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-[84px]' : 'w-[260px]'
      }`}
    >
      <div className="flex items-center justify-between px-5 pt-6">
        {!isCollapsed && (
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Cerezo</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-100">Studio Planner</h1>
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded-full bg-white/10 p-2 text-slate-100 shadow-inner transition hover:bg-white/20"
        >
          {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex-1 px-3">
        <ul className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <li key={item.id} title={item.label}>
                <button
                  type="button"
                  onClick={() => setCurrentView(item.id)}
                  className={`group relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-white/20 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] backdrop-blur-xl'
                      : 'text-slate-200 hover:bg-white/10'
                  } ${isCollapsed ? 'justify-center px-0 py-3' : ''}`}
                >
                  <span
                    className={`flex items-center justify-center rounded-xl bg-white/10 p-2 text-slate-100 transition ${
                      isActive ? 'bg-white text-slate-900 shadow-md' : 'group-hover:bg-white/20'
                    } ${isCollapsed ? 'h-10 w-10' : 'h-9 w-9'}`}
                  >
                    <item.icon size={isCollapsed ? 18 : 16} />
                  </span>
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {!isCollapsed && (
        <div className="mx-5 mb-6 rounded-2xl bg-gradient-to-r from-blue-500/20 to-cyan-400/20 p-4 text-xs text-slate-100">
          <p className="font-semibold">Sincronización en vivo</p>
          <p className="mt-1 text-slate-300">
            Actualiza Supabase para compartir tu pipeline con el equipo en tiempo real.
          </p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
