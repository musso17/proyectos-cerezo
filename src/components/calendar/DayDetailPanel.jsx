import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const DayDetailPanel = ({
  selectedDayDate,
  selectedDayDetails,
  setSelectedDayKey,
  handleIsaDragStart,
  handleIsaDragEnd,
  openModal,
}) => {
  if (!selectedDayDate) return null;

  return (
    <div className="mt-6 rounded-3xl border border-[#E5E7EB] bg-white p-6 dark:border-[#2B2D31] dark:bg-[#1E1F23]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-primary dark:text-white/90">
            {format(selectedDayDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
          </h3>
          <p className="text-xs text-secondary dark:text-white/60">
            {selectedDayDetails.length} {selectedDayDetails.length === 1 ? 'actividad' : 'actividades'} programadas
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSelectedDayKey(null)}
          className="rounded-full border border-[#E5E7EB] px-3 py-1 text-xs text-secondary transition hover:border-accent/70 hover:text-accent dark:border-[#2B2D31] dark:text-white/60 dark:hover:border-purple-400/60 dark:hover:text-white">
          Cerrar
        </button>
      </div>

      {selectedDayDetails.length === 0 ? (
        <p className="mt-4 text-sm text-secondary dark:text-white/60">Sin eventos para este día.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {selectedDayDetails.map((item) => (
            <div
              key={`${item.id}-${item.sortTime}`}
              className="rounded-2xl border border-[#E5E7EB] bg-white p-4 transition hover:border-accent/60 hover:bg-[#F1F5F9] dark:border-[#2B2D31] dark:bg-[#0F0F11] dark:hover:border-purple-400/60 dark:hover:bg-white/10"
              draggable={item.type === 'isa_estimate'}
              onDragStart={(event) => {
                if (item.type === 'isa_estimate') {
                  handleIsaDragStart(event, {
                    projectKey: item.projectKey,
                    milestoneType: item.milestoneType,
                  });
                }
              }}
              onDragEnd={item.type === 'isa_estimate' ? handleIsaDragEnd : undefined}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[200px] max-w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${item.colorClass}`}>
                      {item.eventLabel}
                    </span>
                    {item.timeLabel && (
                      <span className="text-xs text-secondary dark:text-white/60">{item.timeLabel}</span>
                    )}
                  </div>
                  <h4 className="mt-2 text-lg font-bold text-primary dark:text-white/90">{item.title}</h4>
                  {item.description && (
                    <p className="mt-1 text-sm text-secondary/80 dark:text-white/60">{item.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-4 text-xs">
                    {item.manager && (
                      <div>
                        <p className="font-semibold text-secondary dark:text-white/50">Responsable</p>
                        <p className="text-primary dark:text-white/85">{item.manager}</p>
                      </div>
                    )}
                    {item.client && (
                      <div>
                        <p className="font-semibold text-secondary dark:text-white/50">Cliente</p>
                        <p className="text-primary dark:text-white/85">{item.client}</p>
                      </div>
                    )}
                    {item.status && (
                      <div>
                        <p className="font-semibold text-secondary dark:text-white/50">Estado</p>
                        <p className="text-primary dark:text-white/85">{item.status}</p>
                      </div>
                    )}
                  </div>
                </div>
                {item.project && (
                  <button
                    type="button"
                    onClick={() => openModal(item.project)}
                    className="rounded-full bg-[#F1F5F9] px-4 py-2 text-xs font-semibold text-primary transition hover:bg-accent/10 hover:text-accent dark:bg-white/5 dark:text-white/80 dark:hover:bg-purple-500/15 dark:hover:text-purple-300">
                    Ver Detalles
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DayDetailPanel;
