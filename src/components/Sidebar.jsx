"use client";

import React from 'react';
import clsx from 'clsx';
import {
  Activity,
  Calendar as CalendarIcon,
  FolderOpen,
  Images,
  Layers,
  RefreshCcw,
} from 'lucide-react';
import useStore from '../hooks/useStore';

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
    'hidden md:flex md:flex-col md:gap-6 md:overflow-y-auto md:rounded-[28px] md:p-6 md:transition-all md:duration-300',
    'md:sticky md:top-4 md:h-[calc(100vh-2rem)]',
    'bg-white text-slate-900 border border-[#edf2ff] shadow-[0_20px_55px_rgba(15,23,42,0.08)]'
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
        <p className="text-[11px] uppercase tracking-[0.4em] text-slate-400">Cerezo</p>
        <h1 className="text-2xl font-semibold text-slate-900">Studio Planner</h1>
      </div>

      <nav className="flex-1 pt-4">
        <ul className="flex flex-col gap-1.5">
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
                      'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-[#A855F7] via-[#7C3AED] to-[#6366F1] text-white shadow-[0_12px_40px_rgba(111,76,255,0.35)]'
                        : 'text-[#1F2937] hover:bg-slate-50'
                    )}
                  >
                    <span
                      className={clsx(
                        'flex h-9 w-9 items-center justify-center rounded-xl border text-base transition-all duration-200',
                        isActive
                          ? 'border-transparent bg-white/20 text-white'
                          : 'border-[#E4E7EB] text-[#1F2937]'
                      )}
                    >
                      <item.icon size={18} />
                    </span>
                    <div className="flex flex-1 items-center justify-between">
                      <span>{item.label}</span>
                    </div>
                  </button>
                </li>
              );
            })}
        </ul>
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
          className="flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#A855F7] via-[#7C3AED] to-[#6366F1] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_40px_rgba(111,76,255,0.35)] transition-all duration-200 hover:brightness-105"
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
          <div className="flex w-full grow flex-col gap-y-5 overflow-y-auto bg-white p-6 pb-8 shadow-[0_22px_45px_rgba(15,23,42,0.28)]">
            <SidebarContent />
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
