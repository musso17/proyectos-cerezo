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
  <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-border/40 bg-slate-50/50 p-6 text-xs font-medium text-secondary/40 uppercase tracking-wide">
    {message}
  </div>
);

// Capacidad de referencia: 5 proyectos = carga alta (lleno)
const LOAD_CAPACITY = 5;

const getLoadColor = (level) => {
  switch (level) {
    case 'Carga alta':
      return 'bg-red-500';
    case 'Carga media':
      return 'bg-amber-400';
    default:
      return 'bg-emerald-500';
  }
};

const ManagerLoadTable = ({ managerLoad }) => {
  const overloaded = managerLoad.filter((m) => m.level === 'Carga alta').map((m) => m.manager);

  return (
    <div className="glass-panel col-span-1 flex flex-col gap-6 p-8 rounded-xl transition-all hover:shadow-2xl animate-fade-up">
      <Header title="Capacidad" subtitle="Carga por responsable" />

      {managerLoad.length > 0 ? (
        <div className="flex flex-col gap-4">
          {managerLoad.map(({ manager, total, level }) => {
            const pct = Math.min((total / LOAD_CAPACITY) * 100, 100);
            const barColor = getLoadColor(level);
            return (
              <div key={manager} className="group flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 rounded-full ${barColor}`} />
                    <span className="text-sm font-semibold text-primary dark:text-white/80 tracking-tight">
                      {manager}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-secondary/50 dark:text-white/40">
                    {total} / {LOAD_CAPACITY}
                  </span>
                </div>
                {/* micro-barra de progreso */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState message="Sin asignaciones" />
      )}

      {overloaded.length > 0 && (
        <div className="mt-auto flex items-start gap-3 rounded-lg bg-red-500/5 border border-red-500/15 p-4">
          <AlertTriangle size={14} className="mt-0.5 text-red-500 shrink-0" />
          <span className="text-[11px] font-medium text-red-600/90 dark:text-red-300/70 leading-relaxed">
            {overloaded.join(', ')} {overloaded.length > 1 ? 'están' : 'está'} al límite. Redistribuye para no comprometer entregas.
          </span>
        </div>
      )}
    </div>
  );
};

export default ManagerLoadTable;
