import React from 'react';
import { format, parseISO, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Clock, PlayCircle, AlertCircle } from 'lucide-react';
import { isProjectActiveInMonth, extractProjectInfo } from '../../utils/dashboardHelpers';

const getStatusDotColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('completado') || s.includes('entregado')) return 'bg-black dark:bg-white';
  if (s.includes('progreso') || s.includes('edicion')) return 'bg-[#FF4B2A]';
  if (s.includes('revision')) return 'bg-[#5F6468]';
  return 'bg-slate-300';
};

const ProjectDashboardList = ({ projects, selectedMonth, title = "Proyectos del periodo" }) => {
  const filteredProjects = projects.filter(p => {
    const info = extractProjectInfo(p);
    return isProjectActiveInMonth(info, selectedMonth);
  }).sort((a, b) => {
    const dateA = a.startDate ? new Date(a.startDate) : new Date(0);
    const dateB = b.startDate ? new Date(b.startDate) : new Date(0);
    return dateB - dateA;
  });

  return (
    <div className="glass-panel flex flex-col gap-6 p-8 rounded-[2.5rem] transition-all hover:shadow-2xl animate-fade-up">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-primary tracking-tight dark:text-white">{title}</h2>
        <span className="text-[10px] font-medium text-secondary/40 uppercase tracking-[0.2em] border border-border/40 px-3 py-1 rounded-full">
          {filteredProjects.length} ítems
        </span>
      </div>

      <div className="soft-scroll overflow-y-auto max-h-[400px] pr-2">
        {filteredProjects.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {filteredProjects.map((project) => (
              <li key={project.id} className="group relative rounded-2xl p-4 transition-all hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${getStatusDotColor(project.status)}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-primary group-hover:text-accent transition-colors dark:text-white/80">
                        {project.name || project.projectName || project.titulo || "Sin título"}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-[10px] font-medium uppercase tracking-wide text-secondary/40">
                        <span className="font-mono">{project.client}</span>
                        <div className="h-1 w-1 rounded-full bg-secondary/10" />
                        <span>{project.startDate ? format(parseISO(project.startDate), 'dd MMM', { locale: es }) : 'S/F'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 whitespace-nowrap">
                    <span className="text-[9px] font-medium uppercase tracking-widest text-secondary/40">
                      {project.status}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex h-32 flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-border/40 bg-slate-50/50 p-6">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary/30 text-center">No hay proyectos registrados</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDashboardList;
