import React from 'react';
import { AlertTriangle } from 'lucide-react';

const Header = ({ title, subtitle }) => (
  <div>
    <h2 className="text-sm sm:text-lg font-semibold text-primary">{title}</h2>
    <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.32em] text-secondary/60">
      {subtitle}
    </p>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[#CBD5F5] bg-[#F9FAFF] p-6 text-xs text-secondary dark:border-[#2B2D31] dark:bg-[#1B1C20] dark:text-white/50">
    {message}
  </div>
);

const getLoadColor = (level) => {
  switch (level) {
    case 'Carga alta':
      return 'bg-rose-400 shadow-[0_0_0_4px_rgba(248,113,113,0.12)]';
    case 'Carga media':
      return 'bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.12)]';
    default:
      return 'bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]';
  }
};

const ManagerLoadTable = ({ managerLoad }) => {
  return (
    <div className="glass-panel col-span-1 flex flex-col gap-3 p-4 sm:gap-4 sm:p-6 transition-all">
      <Header title="Semáforo de carga" subtitle="Asignaciones activas" />
      {managerLoad.length > 0 ? (
        <ul className="space-y-2">
          {managerLoad.map(({ manager, total, level }) => (
            <li
              key={manager}
              className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 sm:px-4 sm:py-3 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full ${getLoadColor(level)}`} />
                <p className="text-xs sm:text-sm font-medium text-primary truncate max-w-[100px] sm:max-w-none">{manager}</p>
              </div>
              <div className="text-right">
                <p className="text-xs sm:text-sm font-bold text-secondary dark:text-white/70">{total} <span className="hidden sm:inline">activos</span></p>
                <p className="text-[9px] sm:text-xs text-secondary/70 dark:text-white/60">{level}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState message="No hay encargados asignados" />
      )}
      <div className="flex items-center gap-2 rounded-lg border border-[#FFE4C4] bg-[#FFF4E6] px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs text-[#C07A00] dark:border-[#FCD34D]/30 dark:bg-[#422006] dark:text-[#FCD34D]">
        <AlertTriangle size={12} className="text-[#FFB020] dark:text-[#FCD34D] shrink-0" />
        <span className="line-clamp-1">Verifica la carga para redistribuir si es necesario.</span>
      </div>
    </div>
  );
};

export default ManagerLoadTable;
