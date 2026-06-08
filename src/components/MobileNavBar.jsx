"use client";

import React from 'react';
import clsx from 'clsx';
import useStore from '../hooks/useStore';
import {
  Activity,
  FolderOpen,
  Calendar as CalendarIcon,
  Images,
  Layers,
  Plus,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

// Mismos ítems/íconos que la nav de escritorio (TopNav) para consistencia.
const NAV_ITEMS = [
  { id: 'Dashboard', icon: Activity, label: 'Inicio' },
  { id: 'Table', icon: FolderOpen, label: 'Proyectos' },
  { id: 'Calendar', icon: CalendarIcon, label: 'Calendario' },
  { id: 'Gallery', icon: Images, label: 'Galería' },
  { id: 'Edition', icon: Layers, label: 'Edición' },
];

const selectNavState = (state) => ({
  currentView: state.currentView,
  setCurrentView: state.setCurrentView,
  allowedViews: state.allowedViews,
  openModal: state.openModal,
});

// Barra de pestañas inferior estilo app nativa (solo mobile / tablet < md).
const MobileNavBar = () => {
  const { currentView, setCurrentView, allowedViews, openModal } = useStore(useShallow(selectNavState));
  const items = NAV_ITEMS.filter((item) => allowedViews.includes(item.id));

  if (items.length === 0) return null;

  return (
    <>
      {/* Tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(2,6,23,0.08)] md:hidden dark:border-white/10 dark:bg-[#0F0F11]/90 dark:shadow-[0_-12px_40px_rgba(0,0,0,0.6)]"
        aria-label="Navegación principal"
      >
        <div className="flex h-16 items-stretch justify-around px-1">
          {items.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentView(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors active:scale-95',
                  isActive ? 'text-accent' : 'text-secondary/70 dark:text-white/45'
                )}
              >
                {/* Indicador superior del tab activo */}
                <span
                  className={clsx(
                    'absolute top-0 h-0.5 w-7 rounded-full bg-accent transition-opacity',
                    isActive ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* FAB "+" — acción primaria, elevada justo sobre la tab bar */}
      <button
        type="button"
        onClick={() => openModal({ properties: {} })}
        aria-label="Crear nuevo proyecto"
        className="fixed right-5 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.9rem)] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_30px_rgba(255,75,42,0.45)] transition-all active:scale-90 md:hidden"
      >
        <Plus size={26} strokeWidth={3} />
      </button>
    </>
  );
};

export default MobileNavBar;
