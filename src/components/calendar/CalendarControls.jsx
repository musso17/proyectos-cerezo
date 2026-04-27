import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const MonthNavigator = ({ currentMonth, handlePrevMonth, handleNextMonth }) => (
  <div className="flex flex-wrap items-center justify-between gap-4">
    <button
      type="button"
      onClick={handlePrevMonth}
      className="rounded-full border border-border p-2 text-secondary hover:border-accent hover:text-primary dark:border-[#2B2D31] dark:text-white/60 dark:hover:border-purple-400/60 dark:hover:text-white"
      aria-label="Mes anterior">
      <ChevronLeft size={18} />
    </button>
    <span className="text-lg font-semibold text-primary capitalize dark:text-white/85">
      {format(currentMonth, 'MMMM yyyy', { locale: es })}
    </span>
    <button
      type="button"
      onClick={handleNextMonth}
      className="rounded-full border border-border p-2 text-secondary hover:border-accent hover:text-primary dark:border-[#2B2D31] dark:text-white/60 dark:hover:border-purple-400/60 dark:hover:text-white"
      aria-label="Mes siguiente">
      <ChevronRight size={18} />
    </button>
  </div>
);

const MemberFilters = ({ filterOptions, selectedMember, setSelectedMember }) => (
  <div className="flex flex-wrap gap-2">
    {filterOptions.map((option) => {
      const isActive = option === selectedMember;
      return (
        <button
          key={option}
          type="button"
          onClick={() => setSelectedMember(option)}
          className={`rounded-full border px-4 py-2 text-sm transition-colors ${isActive
            ? 'border-accent bg-accent/20 text-primary dark:border-purple-400 dark:bg-purple-500/20 dark:text-white'
            : 'border-border bg-[#F7F8FA] text-secondary hover:border-accent/40 hover:text-primary dark:border-[#2B2D31] dark:bg-[#1E1F23] dark:text-white/60 dark:hover:border-purple-400/60 dark:hover:text-white'
            }`}>
          {option === 'Todos' ? 'Todos los responsables' : option}
        </button>
      );
    })}
  </div>
);

export { MonthNavigator, MemberFilters };
