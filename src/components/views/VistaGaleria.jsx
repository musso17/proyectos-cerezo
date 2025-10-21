"use client";

import React, { useMemo } from 'react';
import useStore from '../../hooks/useStore';
import { LayoutGrid } from 'lucide-react';
import { filterProjects } from '../../utils/filterProjects';
import { getClientStyles } from '../../utils/clientStyles';

const VistaGaleria = () => {
  const projects = useStore((state) => state.projects);
  const searchTerm = useStore((state) => state.searchTerm);
  const openModal = useStore((state) => state.openModal);

  const filteredProjects = useMemo(
    () => filterProjects(projects, searchTerm),
    [projects, searchTerm]
  );

  return (
    <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {filteredProjects.map((p) => (
        <div
          key={p.id}
          className="ios-card rounded-2xl border border-border bg-surface/80 overflow-hidden cursor-pointer transition-all duration-200 hover:border-cyan-400/60"
          onClick={() => openModal(p)}
        >
          <div className="h-40 bg-background flex items-center justify-center text-secondary">
            <LayoutGrid size={48} />
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-primary">{p.name}</h3>
            <div className="mt-2 flex items-center justify-between">
              {(() => {
                const clientLabel = p.client || 'Sin cliente';
                const color = getClientStyles(clientLabel);
                return (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color.badge}`}>
                    {clientLabel}
                  </span>
                );
              })()}
              <span className="text-xs text-slate-400">{p.deadline || 'Sin fecha'}</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] uppercase tracking-wide">{p.status}</span>
              <span>{p.manager || 'Sin responsable'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VistaGaleria;
