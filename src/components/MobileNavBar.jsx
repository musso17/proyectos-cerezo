"use client";

import React from 'react';
import useStore from '../hooks/useStore';
import { LayoutDashboard, List, Calendar, LayoutGrid, RefreshCcw } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';

const selectNavState = (state) => ({
  currentView: state.currentView,
  setCurrentView: state.setCurrentView,
  allowedViews: state.allowedViews,
});

const MobileNavBar = () => {
  const { currentView, setCurrentView, allowedViews } = useStore(useShallow(selectNavState));

  const navItems = [
    { id: 'Dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'Table', icon: List, label: 'Proyectos' },
    { id: 'Calendar', icon: Calendar, label: 'Calendario' },
    { id: 'Ciclos', icon: RefreshCcw, label: 'Ciclos' },
    { id: 'Gallery', icon: LayoutGrid, label: 'Galería' },
  ];

  const visibleItems = navItems.filter((item) => allowedViews.includes(item.id));

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-gray-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] md:hidden">
      <div className="grid h-full grid-cols-5">
        {visibleItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                isActive ? 'text-violet-600' : 'text-gray-500 hover:text-violet-600'
              }`}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileNavBar;