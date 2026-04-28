"use client";

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import useStore from '../../hooks/useStore';
import { ensureMemberName, TEAM_STYLES } from '../../constants/team';
import { filterProjects } from '../../utils/filterProjects';
import { getUIPreference, setUIPreference } from '../../utils/uiPreferences';

const STAGE_STYLES = {
  grabacion: 'bg-[#4C8EF7] border border-blue-400/30 text-white shadow-lg shadow-blue-500/10',
  edicion: 'bg-accent border border-accent/20 text-dark-bg shadow-lg shadow-accent/10',
};

const parseDate = (value) => {
  if (!value) return null;
  const iso = value.length <= 10 ? `${value}T00:00:00` : value;
  const date = parseISO(iso);
  if (Number.isNaN(date.getTime())) return null;
  return startOfDay(date);
};

const getProjectStage = (project) =>
  (project.stage || project.properties?.stage || '').toString().trim().toLowerCase();

const getStoredTimelineViewMode = () => {
  const stored = getUIPreference('timelineViewMode', 'week');
  if (typeof stored !== 'string') return 'week';
  const normalized = stored.trim().toLowerCase();
  return normalized === 'month' ? 'month' : 'week';
};

const VistaTimeline = () => {
  const projects = useStore((state) => state.projects);
  const searchTerm = useStore((state) => state.searchTerm);
  const openModal = useStore((state) => state.openModal);
  const teamMembers = useStore((state) => state.teamMembers);
  const currentUser = useStore((state) => state.currentUser);

  const [viewMode, setViewMode] = useState(() => getStoredTimelineViewMode());
  const [currentDate, setCurrentDate] = useState(() => {
    const initialMode = getStoredTimelineViewMode();
    const today = new Date();
    return initialMode === 'week'
      ? startOfWeek(today, { weekStartsOn: 1 })
      : startOfMonth(today);
  });

  useEffect(() => {
    setUIPreference('timelineViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    const today = new Date();
    setViewMode('week');
    setCurrentDate(startOfWeek(today, { weekStartsOn: 1 }));
  }, []);

  const isFranciscoUser = (user) => user?.email?.toString().trim().toLowerCase() === 'francisco@carbonomkt.com';

  const displayedProjects = useMemo(() => {
    if (isFranciscoUser(currentUser)) {
      return projects.filter(p =>
        (p.client?.toLowerCase() === 'carbono' || p.cliente?.toLowerCase() === 'carbono' || p.properties?.tag === 'carbono')
      );
    }
    return projects;
  }, [projects, currentUser]);

  const filteredProjects = useMemo(() => {
    return filterProjects(displayedProjects, searchTerm).filter((project) => {
      const stage = getProjectStage(project);
      return stage === 'grabacion' || stage === 'edicion';
    });
  }, [displayedProjects, searchTerm]);

  const processedAssignments = useMemo(() => {
    return filteredProjects
      .map((project) => {
        const start = parseDate(project.startDate);
        const end = parseDate(project.deadline);
        if (!start && !end) return null;
        const rangeStart = start || end;
        const rangeEnd = end || start;
        if (!rangeStart || !rangeEnd) return null;
        return {
          project,
          stage: getProjectStage(project),
          manager: ensureMemberName(project.manager),
          range: { start: rangeStart, end: rangeEnd },
        };
      })
      .filter(Boolean);
  }, [filteredProjects]);

  const memberOrder = useMemo(() => {
    const predefined = teamMembers || [];
    const dynamic = processedAssignments
      .map((item) => item.manager)
      .filter((manager) => manager && !predefined.includes(manager));
    return Array.from(new Set([...predefined, ...dynamic]));
  }, [teamMembers, processedAssignments]);

  const visibleInterval = useMemo(() => {
    if (viewMode === 'week') {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      };
    }
    return {
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate),
    };
  }, [currentDate, viewMode]);

  const visibleDates = useMemo(
    () => eachDayOfInterval({ start: visibleInterval.start, end: visibleInterval.end }),
    [visibleInterval]
  );

  const assignmentsByManager = useMemo(() => {
    const dateKeys = visibleDates.map((date) => format(date, 'yyyy-MM-dd'));
    const map = memberOrder.map((manager) => ({
      manager,
      dates: dateKeys.map((key) => ({ key, items: [] })),
    }));

    const indices = Object.fromEntries(map.map((row, index) => [row.manager, index]));

    processedAssignments.forEach((assignment) => {
      const managerIndex = indices[assignment.manager];
      if (managerIndex === undefined) return;

      if (assignment.range.end < visibleInterval.start || assignment.range.start > visibleInterval.end) {
        return;
      }

      map[managerIndex].dates.forEach((cell, cellIndex) => {
        const date = visibleDates[cellIndex];
        if (isWithinInterval(date, assignment.range)) {
          cell.items.push({
            project: assignment.project,
            stage: assignment.stage,
            isaMeta: assignment.isaMeta,
          });
        }
      });
    });

    return map;
  }, [memberOrder, processedAssignments, visibleDates, visibleInterval]);

  const handlePrevious = () => {
    setCurrentDate((prev) => (viewMode === 'week' ? addWeeks(prev, -1) : addMonths(prev, -1)));
  };

  const handleNext = () => {
    setCurrentDate((prev) => (viewMode === 'week' ? addWeeks(prev, 1) : addMonths(prev, 1)));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const timelineTitle = useMemo(() => {
    if (viewMode === 'week') {
      const startLabel = format(visibleInterval.start, "d 'de' MMM", { locale: es });
      const endLabel = format(visibleInterval.end, "d 'de' MMM yyyy", { locale: es });
      return `${startLabel} – ${endLabel}`;
    }
    return format(currentDate, "MMMM yyyy", { locale: es });
  }, [currentDate, viewMode, visibleInterval]);

  const gridTemplateColumns = useMemo(
    () => `220px repeat(${visibleDates.length}, minmax(120px, 1fr))`,
    [visibleDates]
  );  return (
    <div className="flex h-full flex-col gap-6 p-4 md:p-6 animate-fade-up">
      {/* Mobile warning */}
      <div className="md:hidden flex flex-col items-center justify-center p-12 glass-panel">
        <div className="rounded-2xl bg-amber-500/10 p-4 mb-4">
          <CalendarIcon className="text-amber-500" size={32} />
        </div>
        <h2 className="text-xl font-semibold text-primary tracking-tight">Vista de escritorio</h2>
        <p className="mt-2 text-center text-xs font-medium text-secondary/60 uppercase tracking-wide">
          Timeline requiere una pantalla más grande
        </p>
      </div>

      <div className="hidden md:flex flex-col gap-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-4xl font-semibold text-primary tracking-tight">Timeline</h2>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-1 w-8 rounded-full bg-accent" />
              <p className="text-xs font-medium text-secondary/60 uppercase tracking-[0.2em]">
                Disponibilidad por responsable
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="glass-panel flex p-1 rounded-2xl">
              <button
                onClick={() => setViewMode('week')}
                className={clsx(
                  'rounded-xl px-6 py-2 text-xs font-semibold uppercase tracking-wide transition-all',
                  viewMode === 'week' ? 'bg-dark-bg text-white dark:bg-accent dark:text-dark-bg shadow-lg' : 'text-secondary/50 hover:bg-slate-50 dark:hover:bg-white/5'
                )}
              >
                Semana
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={clsx(
                  'rounded-xl px-6 py-2 text-xs font-semibold uppercase tracking-wide transition-all',
                  viewMode === 'month' ? 'bg-dark-bg text-white dark:bg-accent dark:text-dark-bg shadow-lg' : 'text-secondary/50 hover:bg-slate-50 dark:hover:bg-white/5'
                )}
              >
                Mes
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-white text-secondary transition-all hover:scale-110 active:scale-95 dark:border-white/10 dark:bg-white/5"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleToday}
                className="glass-panel px-6 py-2 rounded-2xl text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary/70 hover:text-primary dark:hover:text-white"
              >
                Hoy
              </button>
              <button
                onClick={handleNext}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-white text-secondary transition-all hover:scale-110 active:scale-95 dark:border-white/10 dark:bg-white/5"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-[2.5rem]">
          <div className="flex items-center justify-center mb-6">
            <span className="text-sm font-semibold uppercase tracking-[0.4em] text-primary dark:text-accent">
              {timelineTitle}
            </span>
          </div>

          {visibleDates.length === 0 || memberOrder.length === 0 ? (
            <div className="rounded-[2rem] border-2 border-dashed border-border/40 p-12 text-center">
              <p className="text-xs font-medium text-secondary/50 uppercase tracking-wide">
                Sin proyectos programados en este periodo
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto soft-scroll">
              <div className="min-w-[1000px] rounded-[2rem] border border-border/40 overflow-hidden bg-slate-50 dark:bg-[#0B0C10]/50">
                <div
                  className="grid text-xs uppercase tracking-wide"
                  style={{ gridTemplateColumns }}
                >
                  <div className="sticky left-0 z-20 border-b border-border/40 bg-white dark:bg-dark-surface px-6 py-4 text-left text-[10px] font-semibold text-secondary/40 tracking-[0.2em]">
                    Responsable
                  </div>
                  {visibleDates.map((date) => (
                    <div
                      key={date.toISOString()}
                      className="border-b border-border/40 px-2 py-4 text-center"
                    >
                      <span className="block text-lg font-semibold text-primary dark:text-white leading-none">{format(date, 'd')}</span>
                      <span className="text-[9px] font-medium text-secondary/40 uppercase tracking-wide">{format(date, 'EEE', { locale: es })}</span>
                    </div>
                  ))}

                  {assignmentsByManager.map((row) => {
                    return (
                      <React.Fragment key={row.manager}>
                        <div
                          className="sticky left-0 z-20 border-b border-border/40 bg-white dark:bg-dark-surface px-6 py-4 text-xs font-semibold text-primary tracking-tight dark:text-white/80"
                        >
                          {row.manager || 'Sin responsable'}
                        </div>
                        {row.dates.map((cell) => (
                          <div
                            key={cell.key}
                            className="border-b border-l border-border/40 px-1 py-2 dark:bg-white/[0.02]"
                          >
                            <div className="flex flex-col gap-1.5">
                              {cell.items.map(({ project, stage }) => {
                                const style = STAGE_STYLES[stage] || 'bg-slate-700/70 text-slate-100';
                                const title = project.name || 'Proyecto';
                                return (
                                  <button
                                    key={`${project.id || title}-${cell.key}-${stage}`}
                                    type="button"
                                    onClick={() => openModal(project)}
                                    className={`group relative line-clamp-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold uppercase tracking-tight transition-all hover:scale-[1.05] hover:z-10 hover:shadow-2xl ${style}`}
                                    title={title}
                                  >
                                    <span className="block truncate">{title}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VistaTimeline;
