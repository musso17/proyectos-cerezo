import React from 'react';
import { format, isSameMonth, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MAX_ITEMS_PER_DAY = 3;

const RECORDING_PILL = 'border border-[#C7DAFF] bg-[#E7F1FF] text-[#4C8EF7] dark:border-blue-500/60 dark:bg-blue-500/15 dark:text-blue-300';
const CalendarGrid = ({
  calendarDays,
  currentMonth,
  calendarItemsByDay,
  selectedDayKey,
  handleDaySelect,
  handleDayDragOver,
  handleDayDrop,
  openModal,
}) => {
  const today = startOfDay(new Date());

  return (
    <div className="hidden grid-cols-7 gap-px overflow-hidden rounded-2xl border border-border bg-border/40 sm:grid">
      {WEEKDAYS.map((weekday) => (
        <div
          key={weekday}
          className="bg-white px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-secondary dark:bg-[#0F0F11] dark:text-white/60">
          {weekday}
        </div>
      ))}
      {calendarDays.map((day) => {
        const key = startOfDay(day).toISOString();
        const dayItems = (calendarItemsByDay.get(key) || []).sort(
          (a, b) => a.range.start.getTime() - b.range.start.getTime()
        );
        const visibleItems = dayItems.slice(0, MAX_ITEMS_PER_DAY);
        const extraItems = dayItems.length - visibleItems.length;
        const isCurrentMonth = isSameMonth(day, currentMonth);
        const isToday = isSameDay(day, today);
        const isSelected = selectedDayKey === key;

        return (
          <div
            key={key}
            onClick={() => handleDaySelect(day)}
            onDragOver={handleDayDragOver(day)}
            onDrop={handleDayDrop(day)}
            className={`min-h-[110px] cursor-pointer bg-white p-2 shadow-[0_12px_24px_rgba(15,23,42,0.05)] transition-all duration-200 ease-[var(--ease-ios-out)] dark:bg-[#0F0F11] dark:shadow-[0_14px_28px_rgba(0,0,0,0.45)] ${isCurrentMonth ? 'text-primary dark:text-white/85' : 'text-secondary/60 dark:text-white/40'
              } ${isToday
                ? 'border border-accent/60 bg-accent/10 shadow-[0_18px_40px_rgba(34,197,94,0.3)] dark:border-purple-400/60 dark:bg-purple-500/20 dark:shadow-[0_20px_40px_rgba(128,90,213,0.35)]'
                : 'border border-[#E5E7EB] hover:border-accent/60 hover:bg-white hover:shadow-[0_12px_30px_rgba(2,6,23,0.55)] dark:border-[#2B2D31] dark:hover:border-purple-300/60 dark:hover:bg-white/10 dark:hover:shadow-[0_16px_30px_rgba(0,0,0,0.45)]'
              } ${isSelected ? 'ring-2 ring-accent/60 dark:ring-purple-400/60' : ''}`}>
            <div className="flex items-center justify-between text-xs">
              <span className={`text-sm font-semibold ${isCurrentMonth ? 'text-primary dark:text-white/85' : ''}`}>
                {format(day, 'd', { locale: es })}
              </span>
              {dayItems.length > 0 && (
                <span className="rounded-full bg-[#F7F8FA] px-2 py-0.5 text-[10px] text-secondary dark:bg-[#1B1C20] dark:text-white/60">
                  {dayItems.length}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {visibleItems.map((item) => {
                if (item.type === 'recording_event') {
                  const { project } = item;
                  const title = project?.name || 'Grabación';
                  return (
                    <button
                      key={`recording-${project?.id || title}-${day.toISOString()}`}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (project) openModal(project);
                      }}
                      className={`group rounded-md border px-2 py-1 text-left text-xs shadow-sm transition-all duration-200 ease-[var(--ease-ios-out)] hover:shadow-lg hover:-translate-y-0.5 ${RECORDING_PILL}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{title}</span>
                        <span className="whitespace-nowrap text-[10px] opacity-75">
                          {format(item.range.start, 'dd/MM')}
                        </span>
                      </div>
                    </button>
                  );
                }

                return null;
              })}
              {extraItems > 0 && (
                <div className="rounded-md bg-[#F7F8FA] px-2 py-1 text-[10px] text-secondary dark:bg-[#1B1C20] dark:text-white/60">
                  +{extraItems} más
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CalendarGrid;
