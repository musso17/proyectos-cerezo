import React, { useState } from 'react';
import { ChevronLeft, Menu, Kanban, List, Calendar, GanttChart, LayoutGrid } from 'lucide-react';
import useStore from '../hooks/useStore';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentView = useStore((state) => state.currentView);
  const setCurrentView = useStore((state) => state.setCurrentView);

  const navItems = [
    { id: 'Table', icon: List, label: 'Table' },
    { id: 'Kanban', icon: Kanban, label: 'Kanban' },
    { id: 'Calendar', icon: Calendar, label: 'Calendar' },
    { id: 'Timeline', icon: GanttChart, label: 'Timeline' },
    { id: 'Gallery', icon: LayoutGrid, label: 'Gallery' },
  ];

  return (
    <aside className={`bg-surface text-secondary transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className={`flex items-center p-4 border-b border-border ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && <h1 className="text-xl font-bold text-primary">Cerezo</h1>}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 hover:bg-border rounded-full text-primary">
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      <nav className="p-2">
        <ul>
          {navItems.map((item) => (
            <li key={item.id} title={item.label}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentView(item.id);
                }}
                className={`flex items-center gap-4 p-3 my-1 rounded-lg transition-colors font-medium ${isCollapsed ? 'justify-center' : ''} ${
                  currentView === item.id
                    ? 'bg-accent text-background'
                    : 'hover:bg-border text-primary'
                }`}>
                <item.icon size={20} />
                {!isCollapsed && <span>{item.label}</span>}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
