import React from 'react';
import { Calendar, Plus } from 'lucide-react';

const CALENDAR_LEGEND = [
  { label: 'Grabación', className: 'border-[#C7DAFF] bg-[#E7F1FF] text-[#1D4ED8] dark:border-blue-500/60 dark:bg-blue-500/15 dark:text-blue-300' },
  { label: 'Ausente', className: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-white/80' },
];

const CalendarHeader = ({ primaryView, setPrimaryView, onAddAbsence }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Calendar className="text-accent" size={28} />
        <div>
          <h2 className="text-2xl font-medium text-primary dark:text-white/90">
            {primaryView === 'timeline' ? (
              <>
                <span className="md:hidden">Calendario de Proyectos</span>
                <span className="hidden md:inline">Timeline de disponibilidad</span>
              </>
            ) : 'Calendario de Proyectos'}
          </h2>
          <p className="text-secondary text-sm dark:text-white/60">
            {primaryView === 'timeline' ? (
              <>
                <span className="md:hidden">Grabaciones y ausencias por integrante.</span>
                <span className="hidden md:inline">Grabaciones, ediciones y ausencias por persona.</span>
              </>
            ) : 'Grabaciones y ausencias por integrante.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {CALENDAR_LEGEND.map((item) => (
              <span
                key={item.label}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.className}`}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onAddAbsence && (
          <button
            type="button"
            onClick={onAddAbsence}
            className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-1.5 text-sm font-semibold text-primary transition hover:bg-slate-50 dark:border-[#2B2D31] dark:bg-[#1B1C20] dark:text-white/85"
          >
            <Plus size={15} />
            Registrar ausencia
          </button>
        )}
        {/* En móvil siempre se muestra la agenda: el Timeline necesita pantalla ancha. */}
        <div className="hidden flex-wrap items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F7F8FA] p-1 md:flex dark:border-[#2B2D31] dark:bg-[#1B1C20]" role="group" aria-label="Vista">
          <button
            type="button"
            aria-pressed={primaryView === 'calendar'}
            onClick={() => setPrimaryView('calendar')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${primaryView === 'calendar'
              ? 'bg-white text-primary shadow-sm dark:bg-white/15 dark:text-white'
              : 'text-secondary hover:text-primary dark:text-white/60 dark:hover:text-white'
              }`}
          >
            Calendario
          </button>
          <button
            type="button"
            aria-pressed={primaryView === 'timeline'}
            onClick={() => setPrimaryView('timeline')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${primaryView === 'timeline'
              ? 'bg-white text-primary shadow-sm dark:bg-white/15 dark:text-white'
              : 'text-secondary hover:text-primary dark:text-white/60 dark:hover:text-white'
              }`}
          >
            Timeline
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
