import React from 'react';
import { Calendar } from 'lucide-react';

const CALENDAR_LEGEND = [
  { label: 'Grabación', className: 'border border-[#C7DAFF] bg-[#E7F1FF] text-[#4C8EF7] dark:border-blue-500/60 dark:bg-blue-500/15 dark:text-blue-300' },
];

const CalendarHeader = ({ primaryView, setPrimaryView }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Calendar className="text-accent" size={28} />
        <div>
          <h2 className="text-2xl font-medium text-primary dark:text-white/90">
            {primaryView === 'timeline' ? 'Timeline de disponibilidad' : 'Calendario de Proyectos'}
          </h2>
          <p className="text-secondary text-sm dark:text-white/60">
            {primaryView === 'timeline'
              ? 'Explora grabaciones y ediciones programadas en formato de línea de tiempo.'
              : 'Visualiza entregas y responsabilidades por integrante.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {CALENDAR_LEGEND.map((item) => (
              <span
                key={item.label}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${item.className}`}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F7F8FA] p-1 dark:border-[#2B2D31] dark:bg-[#1B1C20]">
        <button
          type="button"
          onClick={() => setPrimaryView('calendar')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${primaryView === 'calendar'
            ? 'bg-emerald-500/20 text-primary shadow-[inset_0_1px_0_rgba(34,197,94,0.35)] dark:bg-emerald-500/15 dark:text-white/85'
            : 'text-secondary hover:text-primary dark:text-white/60 dark:hover:text-white'
            }`}
        >
          Calendario
        </button>
        <button
          type="button"
          onClick={() => setPrimaryView('timeline')}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${primaryView === 'timeline'
            ? 'bg-emerald-500/20 text-primary shadow-[inset_0_1px_0_rgba(34,197,94,0.35)] dark:bg-emerald-500/15 dark:text-white/85'
            : 'text-secondary hover:text-primary dark:text-white/60 dark:hover:text-white'
            }`}
        >
          Timeline
        </button>
      </div>
    </div>
  );
};

export default CalendarHeader;
