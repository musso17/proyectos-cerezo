import React, { useMemo } from 'react';
import { format, parseISO, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { extractProjectInfo } from '../../utils/dashboardHelpers';

const getStatusDotColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('completado') || s.includes('entregado')) return 'bg-emerald-500';
  if (s.includes('progreso') || s.includes('edicion')) return 'bg-[#FF4B2A]';
  if (s.includes('revision')) return 'bg-[#5F6468]';
  return 'bg-slate-300';
};

const CarbonoMonthList = ({ projects, selectedMonth, title = "Proyectos Carbono del Mes" }) => {
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const isCarbono = p.client?.toLowerCase() === 'carbono' || p.cliente?.toLowerCase() === 'carbono' || p.properties?.tag === 'carbono';
      if (!isCarbono) return false;
      
      const info = extractProjectInfo(p);
      if (!info.startDate) return false;
      
      return isSameMonth(info.startDate, selectedMonth);
    }).sort((a, b) => {
      const infoA = extractProjectInfo(a);
      const infoB = extractProjectInfo(b);
      const dateA = infoA.startDate ? new Date(infoA.startDate) : new Date(0);
      const dateB = infoB.startDate ? new Date(infoB.startDate) : new Date(0);
      return dateB - dateA;
    });
  }, [projects, selectedMonth]);

  return (
    <div className="glass-panel flex flex-col gap-6 p-8 rounded-xl transition-all hover:shadow-2xl animate-fade-up border border-emerald-500/10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-primary tracking-tight dark:text-white">{title}</h2>
        <span className="text-[10px] font-medium text-emerald-600/80 uppercase tracking-[0.2em] border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 rounded-full">
          {filteredProjects.length} ítems
        </span>
      </div>

      <div className="soft-scroll overflow-y-auto max-h-[400px] pr-2">
        {filteredProjects.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {filteredProjects.map((project) => {
              const info = extractProjectInfo(project);
              return (
                <li key={project.id} className="group relative rounded-lg p-4 transition-all hover:bg-slate-50 dark:hover:bg-white/[0.03] border border-transparent hover:border-border/30">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${getStatusDotColor(project.status)}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-primary group-hover:text-emerald-500 transition-colors dark:text-white/80">
                          {project.name || project.projectName || project.titulo || "Sin título"}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-[10px] font-medium uppercase tracking-wide text-secondary/40">
                          <span className="font-mono">{info.clientLabel}</span>
                          <div className="h-1 w-1 rounded-full bg-secondary/10" />
                          <span>{info.startDate ? format(info.startDate, 'dd MMM', { locale: es }) : 'S/F'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      <span className={`text-[9px] font-medium uppercase tracking-widest px-2 py-1 rounded-md ${
                        info.isCompleted ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-secondary/5 text-secondary/60'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/40 bg-slate-50/50 p-6">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary/30 text-center">No hay proyectos de Carbono en este mes</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CarbonoMonthList;
