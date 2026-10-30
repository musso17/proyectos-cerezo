import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { addDays, addWeeks, eachDayOfInterval, format, isSameDay, startOfDay, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isAbsenceProject } from '../../utils/absences';
import { extractProjectInfo, getProjectBlockingDays, getProjectManagers } from '../../utils/dashboardHelpers';
import { findUpcomingConflicts } from '../../utils/scheduleConflicts';
import { ensureMemberName } from '../../constants/team';
import MemberAvatar from '../ui/MemberAvatar';
import { SectionCard } from './ChartCard';

const dayKey = (date) => format(date, 'yyyy-MM-dd');

// Rodajes y ausencias por día y persona, más las entregas que vencen ese día.
const WeekAgenda = ({ projects, openModal }) => {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const today = startOfDay(new Date());
  const days = useMemo(() => eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }), [weekStart]);

  const agenda = useMemo(() => {
    const keys = new Set(days.map(dayKey));
    const byDay = new Map(days.map((day) => [dayKey(day), { recordings: [], absences: [], deliveries: [] }]));
    (projects || []).forEach((project) => {
      const absence = isAbsenceProject(project);
      getProjectBlockingDays(project).forEach((day) => {
        const key = dayKey(day);
        if (!keys.has(key)) return;
        byDay.get(key)[absence ? 'absences' : 'recordings'].push(project);
      });
      if (!absence) {
        const info = extractProjectInfo(project);
        if (!info.isCompleted && info.deadlineDate && keys.has(dayKey(info.deadlineDate))) {
          byDay.get(dayKey(info.deadlineDate)).deliveries.push(project);
        }
      }
    });
    return byDay;
  }, [projects, days]);

  const conflictKeys = useMemo(() => {
    const set = new Set();
    findUpcomingConflicts(projects || [], weekStart).forEach((conflict) => set.add(`${conflict.member}|${conflict.day}`));
    return set;
  }, [projects, weekStart]);

  const rangeLabel = `${format(days[0], "d MMM", { locale: es })} – ${format(days[6], "d MMM yyyy", { locale: es })}`;

  return (
    <SectionCard
      title="Esta semana"
      description={`Rodajes por día y persona · ${rangeLabel}`}
      action={
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWeekStart((prev) => addWeeks(prev, -1))}
            aria-label="Semana anterior"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-secondary transition hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white/70"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="h-9 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-secondary transition hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white/70"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((prev) => addWeeks(prev, 1))}
            aria-label="Semana siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-secondary transition hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white/70"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      }
    >
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => {
          const key = dayKey(day);
          const { recordings, absences, deliveries } = agenda.get(key);
          const isToday = isSameDay(day, today);
          const isEmpty = recordings.length + absences.length + deliveries.length === 0;
          return (
            <li
              key={key}
              className={clsx(
                'flex min-h-[120px] flex-col gap-2 rounded-lg border p-2.5',
                isToday ? 'border-accent/60 bg-accent/[0.04]' : 'border-border/70 bg-white/60 dark:border-white/10 dark:bg-white/[0.02]'
              )}
            >
              <p className={clsx('text-sm font-semibold capitalize', isToday ? 'text-[#C2321A] dark:text-accent' : 'text-primary dark:text-white')}>
                {format(day, 'EEE d', { locale: es })}
                {isToday && <span className="ml-1 text-xs font-medium normal-case">· hoy</span>}
              </p>

              {recordings.map((project) => {
                const members = getProjectManagers(project);
                const hasConflict = members.some((m) => conflictKeys.has(`${ensureMemberName(m)}|${key}`));
                return (
                  <button
                    key={`rec-${project.id}`}
                    type="button"
                    onClick={() => openModal(project)}
                    title={hasConflict ? 'Cruce de agenda: alguien tiene otro compromiso este día' : project.name}
                    className={clsx(
                      'flex flex-col gap-1 rounded-md border-l-4 bg-white px-2 py-1.5 text-left shadow-sm transition hover:shadow dark:bg-white/5',
                      hasConflict ? 'border-red-500 ring-1 ring-red-500/60' : 'border-[#2a78d6]'
                    )}
                  >
                    <span className="line-clamp-2 text-xs font-semibold leading-snug text-primary dark:text-white">{project.name}</span>
                    <span className="flex items-center gap-1">
                      {members.map((m) => <MemberAvatar key={m} name={m} size="sm" />)}
                      {hasConflict && <span className="ml-auto text-[11px] font-semibold text-red-700 dark:text-red-400">Cruce</span>}
                    </span>
                  </button>
                );
              })}

              {absences.map((project) => (
                <button
                  key={`abs-${project.id}`}
                  type="button"
                  onClick={() => openModal(project)}
                  className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-left text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-white/80"
                >
                  {getProjectManagers(project).map((m) => <MemberAvatar key={m} name={m} size="sm" />)}
                  Ausente
                </button>
              ))}

              {deliveries.map((project) => (
                <button
                  key={`del-${project.id}`}
                  type="button"
                  onClick={() => openModal(project)}
                  className="rounded-md border border-dashed border-border px-2 py-1 text-left text-xs text-secondary hover:text-primary dark:border-white/15 dark:text-white/70"
                >
                  Entrega: <span className="font-semibold text-primary dark:text-white">{project.name}</span>
                </button>
              ))}

              {isEmpty && <p className="text-xs text-secondary dark:text-white/50">Sin rodajes</p>}
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
};

export default WeekAgenda;
