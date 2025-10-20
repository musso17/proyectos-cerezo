import React, { useEffect, useState } from 'react';
import { Search, Plus, Bell, User } from 'lucide-react';
import useStore from '../hooks/useStore';

const Navbar = () => {
  const openModal = useStore((state) => state.openModal);
  const setSearchTerm = useStore((state) => state.setSearchTerm);
  const storeSearchTerm = useStore((state) => state.searchTerm);
  const [query, setQuery] = useState(storeSearchTerm);

  useEffect(() => {
    setQuery(storeSearchTerm);
  }, [storeSearchTerm]);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setSearchTerm(query);
    }, 300);

    return () => {
      window.clearTimeout(handler);
    };
  }, [query, setSearchTerm]);

  const handleAddNew = () => {
    openModal({ properties: {} });
  };

  return (
    <header className="bg-surface/80 backdrop-blur-lg sticky top-0 z-10 p-4 border-b border-border flex justify-between items-center">
      <div>
        {/* Breadcrumbs will go here */}
        <span className="text-sm text-secondary">Proyectos / Todos</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={20} />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar... (Ctrl+K)"
            className="bg-background border border-border rounded-lg pl-10 pr-4 py-2 w-80 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <button className="p-2 hover:bg-border rounded-full text-secondary hover:text-primary transition-colors">
          <Bell size={20} />
        </button>
        <button className="p-2 hover:bg-border rounded-full text-secondary hover:text-primary transition-colors">
          <User size={20} />
        </button>
        <button 
          onClick={handleAddNew}
          className="bg-accent text-background font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-accent-hover transition-colors">
          <Plus size={20} />
          <span>Nuevo</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
