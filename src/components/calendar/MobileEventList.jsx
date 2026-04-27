import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const MobileEventList = ({ selectedDayDetails, selectedDayDate, openModal }) => {
  if (!selectedDayDate) {
    return (
      <div className="sm:hidden px-4 py-8 text-center text-secondary dark:text-white/40">
        <p className="text-sm">Selecciona un día para ver los detalles.</p>
      </div>
    );
  }

  if (selectedDayDetails.length === 0) {
    return (
      <div className="sm:hidden px-4 py-8 text-center text-secondary dark:text-white/40">
        <p className="text-sm font-medium">No hay eventos para este día.</p>
      </div>
    );
  }

  return (
    <div className="sm:hidden flex flex-col divide-y divide-gray-100 dark:divide-white/5">
      <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 sticky top-0 z-10 border-b border-gray-100 dark:border-white/10">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          {format(selectedDayDate, "EEEE d 'de' MMMM", { locale: es })}
        </h3>
      </div>
      
      {selectedDayDetails.map((event) => (
        <div
          key={`${event.id}-${event.sortTime}`}
          onClick={() => openModal(event.project)}
          className="flex items-start gap-4 p-4 active:bg-gray-100 dark:active:bg-white/10 transition-colors"
        >
          <div className="flex flex-col items-center min-w-[50px]">
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              {event.timeLabel && event.timeLabel.includes(':') ? event.timeLabel : 'Todo el día'}
            </span>
          </div>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${event.typeMeta?.className.includes('blue') ? 'bg-blue-500' : 'bg-accent'}`} />
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{event.title}</h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {event.description || event.eventLabel}
            </p>
            {event.manager && (
              <p className="text-[10px] text-accent font-medium uppercase">{event.manager}</p>
            )}
          </div>
          
          <div className="text-[10px] text-gray-400 font-medium">
             {event.client}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MobileEventList;
