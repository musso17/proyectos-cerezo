"use client";

import React from 'react';
import clsx from 'clsx';
import {
  Activity,
  Calendar as CalendarIcon,
  FolderOpen,
  Images,
  Layers,
} from 'lucide-react';
import useStore from '../hooks/useStore';

const VOICE_ROOMS = [
  { id: 'General', emoji: '🎙️' },
  { id: 'Carbono', emoji: '🚗' },
];

const VoiceRoomList = () => {
  const activeVoiceRoom = useStore((state) => state.activeVoiceRoom);
  const setActiveVoiceRoom = useStore((state) => state.setActiveVoiceRoom);

  return (
    <ul className="flex flex-col gap-1">
      {VOICE_ROOMS.map(({ id, emoji }) => {
        const isActive = activeVoiceRoom === id;
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => setActiveVoiceRoom(isActive ? null : id)}
              className={clsx(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200',
                isActive
                  ? 'bg-green-500/10 dark:bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 font-medium shadow-[0_0_12px_rgba(34,197,94,0.1)]'
                  : 'text-slate-500 hover:bg-slate-50 dark:text-slate-500 dark:hover:bg-white/5 border border-transparent'
              )}
            >
              {/* Dot indicator */}
              <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5">
                <div
                  className={clsx(
                    'absolute top-1 right-1 w-1.5 h-1.5 rounded-full',
                    isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
                  )}
                />
                <span className="text-sm leading-none">{emoji}</span>
              </div>

              <span className="flex-1 text-left truncate">{id}</span>

              {isActive && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-green-500/80 shrink-0">
                  En vivo
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const Sidebar = () => {
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const allowedViews = useStore((state) => state.allowedViews);
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);
  const toggleMobileSidebar = useStore((state) => state.toggleMobileSidebar);
  const currentUser = useStore((state) => state.currentUser);
  useStore((state) => state.projects); // keep subscription

  const isFranciscoUser = (user) =>
    user?.email?.toString().trim().toLowerCase() === 'francisco@carbonomkt.com';

  const navItems = [
    { id: 'Dashboard', icon: Activity, label: 'Dashboard' },
    { id: 'Table', icon: FolderOpen, label: 'Proyectos' },
    { id: 'Calendar', icon: CalendarIcon, label: 'Calendar' },
    { id: 'Gallery', icon: Images, label: 'Gallery' },
    { id: 'Edition', icon: Layers, label: 'Edición' },
  ];

  const containerClasses = clsx(
    'hidden md:flex md:flex-col md:gap-6 md:overflow-y-auto md:rounded-xl md:p-6 md:transition-all md:duration-300',
    'md:sticky md:top-4 md:h-[calc(100vh-2rem)]',
    'bg-white text-slate-900 border border-[#edf2ff] shadow-[0_20px_55px_rgba(15,23,42,0.08)]',
    'dark:bg-[#16171D] dark:border-white/5 dark:shadow-[0_40px_80px_rgba(0,0,0,0.6)]'
  );

  const handleNavigate = (view) => {
    setCurrentView(view);
    if (isSidebarOpen) {
      toggleMobileSidebar();
    }
  };

  const SidebarContent = () => (
    <>
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#FF4B2A] dark:text-[#FF4B2A]/80">Cerezo</p>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Studio Planner</h1>
        <div className="h-0.5 w-12 brand-gradient rounded-full mt-2" />
      </div>

      <nav className="flex-1 pt-8">
        <ul className="flex flex-col gap-2">
          {navItems
            .filter((item) => allowedViews.includes(item.id))
            .map((item) => {
              const isActive = currentView === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-300',
                      isActive
                        ? 'bg-accent text-white shadow-[0_12px_40px_rgba(255,75,42,0.3)] scale-[1.02]'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5'
                    )}
                  >
                    <span
                      className={clsx(
                        'flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'
                      )}
                    >
                      <item.icon size={18} />
                    </span>
                    <div className="flex flex-1 items-center justify-between">
                      <span className={clsx(isActive ? 'font-semibold tracking-tight' : 'tracking-wide')}>{item.label}</span>
                    </div>
                  </button>
                </li>
              );
            })}
        </ul>

        {/* Salas de Voz */}
        <div className="mt-8">
          <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-2">Salas de Voz</p>
          <VoiceRoomList />
        </div>
      </nav>

      {!isFranciscoUser(currentUser) && (
        <a
          href="https://cotizacionescr.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            if (isSidebarOpen) {
              toggleMobileSidebar();
            }
          }}
          className="flex items-center justify-center rounded-lg bg-dark-bg text-white dark:bg-accent dark:text-white px-4 py-3.5 text-sm font-semibold uppercase tracking-wide shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
        >
          Cotización
        </a>
      )}
    </>
  );

  return (
    <>
      <aside className={containerClasses}>
        <SidebarContent />
      </aside>

      <div className="relative z-50 md:hidden">
        <div
          className={clsx(
            'fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300 ease-linear',
            isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={toggleMobileSidebar}
          aria-hidden="true"
        />

        <div
          className={clsx(
            'fixed inset-y-0 left-0 flex w-full max-w-[18rem] transform transition duration-300 ease-in-out',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex w-full grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-dark-surface p-6 pb-8 shadow-[0_22px_45px_rgba(15,23,42,0.28)]">
            <SidebarContent />
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
