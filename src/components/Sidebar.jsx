"use client";

import React, { useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, Menu, List, Calendar, LayoutGrid, LayoutDashboard, RefreshCcw } from 'lucide-react';
import useStore from '../hooks/useStore';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const allowedViews = useStore((state) => state.allowedViews);
  const isSidebarOpen = useStore((state) => state.isSidebarOpen);
  const toggleMobileSidebar = useStore((state) => state.toggleMobileSidebar);

  const navItems = [
    { id: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'Table', icon: List, label: 'Proyectos' },
    { id: 'Calendar', icon: Calendar, label: 'Calendar' },
    { id: 'Ciclos', icon: RefreshCcw, label: 'Ciclos' },
    { id: 'Gallery', icon: LayoutGrid, label: 'Gallery' },
  ];

  const containerClasses = clsx(
    'glass-panel animate-fade-up hidden md:flex md:flex-col md:gap-6 md:overflow-y-auto md:rounded-3xl md:p-6 md:shadow-lg md:transition-all md:duration-300 md:ease-[var(--ease-ios-out)]',
    'md:sticky md:top-4 md:h-[calc(100vh-2rem)]',
    isCollapsed ? 'md:w-[84px] md:p-4' : 'md:w-[260px]'
  );

  const handleCollapse = () => setIsCollapsed((prev) => !prev);

  const handleNavigate = (view) => {
    setCurrentView(view);
    if (isSidebarOpen) {
      toggleMobileSidebar();
    }
  };
  const SidebarContent = () => (
    <>
      <div className={clsx('flex items-center justify-between', 'px-0 pt-0')}>
        {!isCollapsed && (
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-secondary/60">Cerezo</p>
            <h1 className="mt-1 text-xl font-semibold text-primary">Studio Planner</h1>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMobileSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white text-secondary transition hover:bg-[#EEF1F6] hover:text-primary md:hidden dark:border-[#2B2D31] dark:bg-[#1E1F23] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white/90"
            aria-label="Cerrar menú"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={handleCollapse}
            className="hidden rounded-full border border-[#E5E7EB] bg-white p-2 text-secondary transition hover:bg-[#EEF1F6] hover:text-primary md:block dark:border-[#2B2D31] dark:bg-[#1E1F23] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white/90"
          >
            {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>
      <nav className={clsx('flex-1', 'px-0')}>
        <ul className="flex flex-col gap-2">
          {navItems
            .filter((item) => allowedViews.includes(item.id))
            .map((item) => {
              const isActive = currentView === item.id;
              return (
                <li key={item.id} title={item.label}>
                  <button
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'bg-accent/10 text-accent shadow-none dark:bg-white/5 dark:text-white'
                        : 'text-[#4B5563] hover:bg-[#EEF1F6] hover:text-primary dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white'
                    } ${isCollapsed ? 'justify-center px-0 py-3' : ''}`}
                  >
                    <span
                      className={`flex items-center justify-center rounded-lg border p-2 text-secondary transition ${
                        isActive
                          ? 'border-transparent bg-accent text-white shadow-[0_10px_22px_rgba(108,99,255,0.3)]'
                          : 'border-[#E5E7EB] bg-[#F1F5F9] text-[#4B5563] group-hover:border-accent/30 group-hover:bg-accent/10 group-hover:text-accent dark:border-[#2B2D31] dark:bg-white/5 dark:text-white/50 dark:group-hover:bg-white/10 dark:group-hover:text-white'
                      } ${isCollapsed ? 'h-10 w-10' : 'h-9 w-9'}`}
                    >
                      <item.icon size={isCollapsed ? 18 : 16} className={isActive ? 'text-white' : ''} />
                    </span>
                    {!isCollapsed && <span>{item.label}</span>}
                  </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={containerClasses}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className="relative z-50 md:hidden">
        {/* Backdrop */}
        <div
          className={clsx(
            'fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300 ease-linear',
            isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={toggleMobileSidebar}
          aria-hidden="true"
        />
        {/* Panel */}
        <div
          className={clsx(
            'fixed inset-y-0 left-0 flex w-full max-w-[18rem] transform transition duration-300 ease-in-out',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex w-full grow flex-col gap-y-5 overflow-y-auto bg-white p-6 pb-8 shadow-[0_22px_45px_rgba(15,23,42,0.28)] dark:bg-[#17181C] dark:shadow-[0_26px_52px_rgba(5,6,8,0.55)]">
            <SidebarContent />
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
