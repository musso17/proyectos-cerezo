import React from 'react';
import { format, isSameMonth, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

const WEEKDAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const MobileCalendarGrid = ({
  calendarDays,
  currentMonth,
  calendarItemsByDay,
  selectedDayKey,
  handleDaySelect,
}) => {
  const today = startOfDay(new Date());

  // Agrupar días en semanas para el grid
  const weeks = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="w-full bg-white dark:bg-[#0F0F11] px-2 py-4">
      {/* Header de días de la semana */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((day, i) => (
          <div key={i} className="text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Cuadrícula de días */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day) => {
          const dayKey = startOfDay(day).toISOString();
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);
          const isSelected = selectedDayKey === dayKey;
          const items = calendarItemsByDay.get(dayKey) || [];

          return (
            <button
              type="button"
              key={dayKey}
              onClick={() => handleDaySelect(day)}
              aria-label={`${format(day, "EEEE d 'de' MMMM", { locale: es })}${items.length ? `, ${items.length} evento${items.length === 1 ? '' : 's'}` : ''}`}
              aria-pressed={isSelected}
              className="relative flex flex-col items-center justify-center py-3"
            >
              <div
                className={`
                  flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all
                  ${isToday && !isSelected ? 'bg-red-500 text-white font-medium' : ''}
                  ${isSelected && !isToday ? 'bg-gray-200 text-black dark:bg-gray-700 dark:text-white' : ''}
                  ${isSelected && isToday ? 'bg-red-500 text-white font-medium' : ''}
                  ${!isSelected && !isToday && isCurrentMonth ? 'text-gray-900 dark:text-gray-100' : ''}
                  ${!isSelected && !isToday && !isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : ''}
                `}
              >
                {format(day, 'd')}
              </div>

              {/* Indicadores de eventos (puntos/líneas estilo iOS) */}
              <div className="mt-1 flex gap-0.5 h-1 items-center justify-center">
                {items.length > 0 && (
                  <div className={`h-1 w-1 rounded-full ${isToday || isSelected ? 'bg-gray-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                )}
                {items.length > 2 && (
                  <div className={`h-1 w-1 rounded-full ${isToday || isSelected ? 'bg-gray-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileCalendarGrid;
