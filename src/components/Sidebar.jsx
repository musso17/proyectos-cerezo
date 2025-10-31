"use client";

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, Menu, List, Calendar, LayoutGrid, LayoutDashboard, RefreshCcw } from 'lucide-react';
import useStore from '../hooks/useStore';

const Sidebar = ({ variant = 'desktop', className, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const allowedViews = useStore((state) => state.allowedViews);

  useEffect(() => {
    if (variant === 'mobile') {
      setIsCollapsed(false);
    }
  }, [variant]);

  const navItems = [
    { id: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'Table', icon: List, label: 'Table' },
    { id: 'Calendar', icon: Calendar, label: 'Calendar' },
    { id: 'Ciclos', icon: RefreshCcw, label: 'Ciclos' },
    { id: 'Gallery', icon: LayoutGrid, label: 'Gallery' },
  ];

  const containerClasses = clsx(
    'glass-panel animate-fade-up flex flex-col gap-6 p-6 transition-all duration-300 ease-[var(--ease-ios-out)] soft-scroll',
    variant === 'desktop'
      ? ['h-[calc(100vh-6rem)]', isCollapsed ? 'w-[84px] p-4' : 'w-[260px]']
      : ['h-full w-full p-3'],
    className
  );

  const handleCollapse = () => setIsCollapsed((prev) => !prev);

  const handleNavigate = (view) => {
    setCurrentView(view);
    if (variant === 'mobile' && typeof onNavigate === 'function') {
      onNavigate(view);
    }
  };

  return (
    <aside className={containerClasses}>
      <div className={clsx('flex items-center justify-between', variant === 'desktop' ? 'px-0 pt-0' : 'px-1 pt-1')}>
        {!isCollapsed && (
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-secondary/60">Cerezo</p>
            <h1 className="mt-1 text-xl font-semibold text-primary">Studio Planner</h1>
          </div>
        )}
        {variant === 'desktop' ? (
          <button
            type="button"
            onClick={handleCollapse}
            className="rounded-full border border-[#E5E7EB] bg-white p-2 text-secondary transition hover:bg-[#EEF1F6] hover:text-primary"
          >
            {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        ) : null}
      </div>

      <nav className={clsx('flex-1', variant === 'desktop' ? 'px-0' : 'px-1')}>
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
                      ? 'bg-accent/10 text-accent shadow-none'
                      : 'text-secondary hover:bg-[#EEF1F6] hover:text-primary'
                  } ${isCollapsed ? 'justify-center px-0 py-3' : ''}`}
                >
                  <span
                    className={`flex items-center justify-center rounded-lg border border-transparent bg-[#EEF1F6] p-2 text-secondary transition ${
                      isActive
                        ? 'bg-accent text-white shadow-[0_10px_22px_rgba(108,99,255,0.3)]'
                        : 'group-hover:border-accent/30 group-hover:bg-accent/10 group-hover:text-accent'
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

    </aside>
  );
};

export default Sidebar;
