import React from 'react';
import MemberAvatar from '../ui/MemberAvatar';
import { SectionCard } from './ChartCard';

// Capacidad de referencia: 5 proyectos abiertos = carga alta.
const LOAD_CAPACITY = 5;

const LEVELS = {
  'Carga alta': { label: 'Saturado', bar: 'bg-red-500', text: 'text-red-700 dark:text-red-400' },
  'Carga media': { label: 'Carga media', bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
  'Carga controlada': { label: 'Libre', bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
};

// Todo el equipo, con los proyectos abiertos que tiene en el mes (incluye grabaciones programadas).
const TeamLoad = ({ managerLoad = [] }) => (
  <SectionCard title="Carga del equipo" description="Proyectos abiertos del mes por persona">
    <ul className="flex flex-col gap-3">
      {managerLoad.map(({ manager, total, level }) => {
        const meta = LEVELS[level] || LEVELS['Carga controlada'];
        const pct = Math.min((total / LOAD_CAPACITY) * 100, 100);
        return (
          <li key={manager} className="flex items-center gap-3">
            {manager === 'Sin asignar' ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-white dark:bg-slate-600">?</span>
            ) : (
              <MemberAvatar name={manager} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold text-primary dark:text-white">{manager}</span>
                <span className="shrink-0 text-xs text-secondary dark:text-white/60">
                  {total} {total === 1 ? 'proyecto' : 'proyectos'} · <span className={`font-semibold ${meta.text}`}>{meta.label}</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" aria-hidden="true">
                <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  </SectionCard>
);

export default TeamLoad;
