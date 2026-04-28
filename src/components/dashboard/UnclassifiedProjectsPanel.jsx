import React from 'react';
import { AlertCircle, Calendar } from 'lucide-react';

const UnclassifiedProjectsPanel = ({ projects, onAssign }) => {
  const unclassified = (projects || []).filter(
    (p) => !p.startDate && (p.status || '').toLowerCase() !== 'completado'
  );

  if (unclassified.length === 0) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-[2rem] border border-[#FF4B2A]/20 bg-[#FF4B2A]/5 shadow-sm dark:border-[#FF4B2A]/10 dark:bg-[#FF4B2A]/5">
      <div className="flex items-center gap-3 border-b border-[#FF4B2A]/10 px-6 py-4 dark:border-[#FF4B2A]/10">
        <AlertCircle className="text-[#FF4B2A]" size={18} />
        <h3 className="text-sm font-semibold uppercase tracking-tight text-[#FF4B2A] dark:text-white">
          {unclassified.length} {unclassified.length === 1 ? 'proyecto' : 'proyectos'} sin fecha asignada
        </h3>
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-[#FF4B2A]/50 dark:text-white/30">
          Pendientes de programación
        </span>
      </div>
      <div className="p-4">
        <ul className="space-y-3">
          {unclassified.map((project) => (
            <li
              key={project.id}
              className="flex items-center justify-between rounded-2xl bg-white/50 px-5 py-3 transition hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
            >
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-primary dark:text-white/80">
                  {project.client || 'Sin cliente'} — {project.name || 'Sin título'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onAssign && onAssign(project)}
                className="flex items-center gap-2 rounded-xl bg-[#FF4B2A] px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#FF4B2A]/90 active:scale-95"
              >
                <Calendar size={12} strokeWidth={2} />
                Asignar
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default UnclassifiedProjectsPanel;
