"use client";

import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, Menu, List, Calendar, GanttChart, LayoutGrid } from 'lucide-react';
import useStore from '../hooks/useStore';

const Sidebar = ({ variant = 'desktop', className, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);

  useEffect(() => {
    if (variant === 'mobile') {
      setIsCollapsed(false);
    }
  }, [variant]);

  const navItems = [
    { id: 'Table', icon: List, label: 'Table' },
    { id: 'Calendar', icon: Calendar, label: 'Calendar' },
    { id: 'Timeline', icon: GanttChart, label: 'Timeline' },
    { id: 'Gallery', icon: LayoutGrid, label: 'Gallery' },
  ];

  const containerClasses = clsx(
    'glass-panel animate-fade-up flex flex-col gap-6 transition-all duration-300 ease-[var(--ease-ios-out)] soft-scroll',
    variant === 'desktop'
      ? ['h-[calc(100vh-6rem)]', isCollapsed ? 'w-[84px]' : 'w-[260px]']
      : ['h-full w-full p-2'],
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
      <div className={clsx('flex items-center justify-between px-5 pt-6', variant === 'mobile' && 'px-2 pt-2')}> 
        {!isCollapsed && (
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Cerezo</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-100">Studio Planner</h1>
          </div>
        )}
        {variant === 'desktop' ? (
          <button
            type="button"
            onClick={handleCollapse}
            className="rounded-full bg-white/10 p-2 text-slate-100 shadow-inner transition hover:bg-white/20"
          >
            {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
          </button>
        ) : null}
      </div>

      <nav className={clsx('flex-1', variant === 'desktop' ? 'px-3' : 'px-1')}> 
        <ul className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <li key={item.id} title={item.label}>
                <button
                  type="button"
                  onClick={() => handleNavigate(item.id)}
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

    </aside>
  );
};

export default Sidebar;
