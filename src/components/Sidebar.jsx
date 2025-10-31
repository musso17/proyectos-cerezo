"use client";

import React, { Fragment, useEffect, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, Menu, List, Calendar, LayoutGrid, LayoutDashboard, RefreshCcw } from 'lucide-react';
import useStore from '../hooks/useStore';
import { Dialog, Transition } from '@headlessui/react';

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
    'glass-panel animate-fade-up flex flex-col gap-6 p-6 transition-all duration-300 ease-[var(--ease-ios-out)] soft-scroll',
    'h-[calc(100vh-6rem)]', isCollapsed ? 'w-[84px] p-4' : 'w-[260px]'
  );

  const handleCollapse = () => setIsCollapsed((prev) => !prev);

  const handleNavigate = (view) => {
    setCurrentView(view);
    toggleMobileSidebar(); // Cierra el sidebar al navegar en móvil
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
        <button
          type="button"
          onClick={handleCollapse}
          className="hidden rounded-full border border-[#E5E7EB] bg-white p-2 text-secondary transition hover:bg-[#EEF1F6] hover:text-primary md:block"
        >
          {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>
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
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex ${containerClasses}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Transition.Root show={isSidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 md:hidden" onClose={toggleMobileSidebar}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/60" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1">
                <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white p-6">
                  <SidebarContent />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
};

export default Sidebar;
