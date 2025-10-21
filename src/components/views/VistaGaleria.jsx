"use client";

import React from 'react';
import useStore from '../../hooks/useStore';
import { LayoutGrid } from 'lucide-react';

const VistaGaleria = () => {
  const projects = useStore((state) => state.projects);
  const openModal = useStore((state) => state.openModal);

  return (
    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {projects.map(p => (
        <div key={p.id} className="bg-surface rounded-lg overflow-hidden border border-border hover:border-accent cursor-pointer transition-all duration-200" onClick={() => openModal(p)}>
          <div className="h-40 bg-background flex items-center justify-center text-secondary">
            <LayoutGrid size={48} />
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-primary">{p.name}</h3>
            <p className="text-sm text-secondary mt-1">{p.client}</p>
            <div className="mt-4 flex justify-between items-center">
              <span className={`px-2 py-1 text-xs font-medium rounded-full bg-border text-secondary`}>{p.status}</span>
              <span className="text-sm text-secondary">{p.deadline}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VistaGaleria;
