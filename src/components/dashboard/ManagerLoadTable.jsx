import React from 'react';
import { AlertTriangle } from 'lucide-react';

const Header = ({ title, subtitle }) => (
  <div>
    <h2 className="text-xl font-semibold text-primary tracking-tight dark:text-white">{title}</h2>
    <div className="flex items-center gap-2 mt-1">
      <div className="h-1 w-6 rounded-full bg-accent" />
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-secondary/40">
        {subtitle}
      </p>
    </div>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex h-full items-center justify-center rounded-[2rem] border-2 border-dashed border-border/40 bg-slate-50/50 p-6 text-xs font-medium text-secondary/40 uppercase tracking-wide">
    {message}
  </div>
);

const getLoadColor = (level) => {
  switch (level) {
    case 'Carga alta':
      return 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]';
    case 'Carga media':
      return 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]';
    default:
      return 'bg-accent shadow-[0_0_20px_rgba(255,75,42,0.3)]';
  }
};

const ManagerLoadTable = ({ managerLoad }) => {
  return (
    <div className="glass-panel col-span-1 flex flex-col gap-6 p-8 rounded-[2.5rem] transition-all hover:shadow-2xl animate-fade-up">
      <Header title="Capacidad" subtitle="Carga por responsable" />
      
      {managerLoad.length > 0 ? (
        <div className="flex flex-col gap-3">
          {managerLoad.map(({ manager, total, level }) => (
            <div
              key={manager}
              className="group flex items-center justify-between rounded-2xl p-4 transition-all hover:bg-slate-50 dark:hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-4">
                <div className={`h-2.5 w-2.5 rounded-full ${getLoadColor(level)}`} />
                <p className="text-sm font-semibold text-primary dark:text-white/80 tracking-tight group-hover:text-accent transition-colors">
                  {manager}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary dark:text-white leading-none">{total}</p>
                  <p className="text-[9px] font-medium uppercase tracking-wide text-secondary/30 mt-1">{level}</p>
                </div>
                <div className="h-8 w-1 rounded-full bg-border/20 group-hover:bg-accent transition-colors" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="Sin asignaciones" />
      )}
      
      <div className="mt-auto flex items-center gap-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 p-4">
        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
        <span className="text-[10px] font-medium text-amber-600/80 dark:text-amber-200/50 uppercase tracking-wider leading-relaxed">
          Sugerencia: Redistribuye cargas críticas para optimizar tiempos.
        </span>
      </div>
    </div>
  );
};

export default ManagerLoadTable;
