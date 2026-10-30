"use client";

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useStore from '../../hooks/useStore';
import { ensureMemberName } from '../../constants/team';
import { filterProjects } from '../../utils/filterProjects';
import {
  computeTurnaroundByFormat,
  estimateDeliveryDate,
  getProjectBlockingDays,
  getProjectManagers,
  getProjectRecordingDates,
} from '../../utils/dashboardHelpers';
import { ABSENCE_STAGE, isAbsenceProject } from '../../utils/absences';
import { getUIPreference, setUIPreference } from '../../utils/uiPreferences';

const STAGE_STYLES = {
  grabacion: 'bg-[#2F6FE0] border border-blue-400/30 text-white shadow-sm',
  fotografia: 'bg-[#2F6FE0] border border-blue-400/30 text-white shadow-sm',
  edicion: 'bg-[#1F2937] border border-black/10 text-white shadow-sm dark:bg-[#E5E7EB] dark:text-[#111827]',
  [ABSENCE_STAGE]: 'bg-slate-300 border border-slate-400/40 text-slate-800 dark:bg-white/20 dark:text-white',
  estimate: 'border border-dashed border-slate-400 bg-transparent text-slate-600 dark:border-white/30 dark:text-white/60',
};

const STAGE_LABELS = {
  [ABSENCE_STAGE]: 'Ausente',
  estimate: 'Edición estimada',
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
      if (isAbsenceProject(project)) return true;
      const stage = getProjectStage(project);
      return stage === 'grabacion' || stage === 'fotografia' || stage === 'edicion';
    });
  }, [displayedProjects, searchTerm]);

  const turnaround = useMemo(() => computeTurnaroundByFormat(projects), [projects]);

  // Ocupación por proyecto: TODOS sus responsables y TODOS sus días reales.
  // Grabación → días de rodaje (pueden ser salteados); edición → rango
  // inicio→entrega; ausencias → sus días. Para grabaciones sin fecha de entrega
  // se muestra la edición estimada (promedio del formato), sin sumar a la carga.
  const occupancy = useMemo(() => {
    const entries = [];
    filteredProjects.forEach((project) => {
      const absence = isAbsenceProject(project);
      const stage = absence ? ABSENCE_STAGE : getProjectStage(project);
      const managers = Array.from(
        new Set(getProjectManagers(project).map((m) => ensureMemberName(m)).filter(Boolean))
      );
      if (managers.length === 0) return;

      let days = [];
      if (absence || stage === 'grabacion' || stage === 'fotografia') {
        days = absence ? getProjectBlockingDays(project) : getProjectRecordingDates(project);
        if (days.length === 0) {
          const single = parseDate(project.startDate);
          if (single) days = [single];
        }
      } else {
        const start = parseDate(project.startDate);
        const end = parseDate(project.deadline) || start;
        if (start && end && end >= start) days = eachDayOfInterval({ start, end });
      }
      if (days.length === 0) return;

      entries.push({
        project,
        stage,
        managers,
        days,
        daySet: new Set(days.map((d) => format(d, 'yyyy-MM-dd'))),
        blocking: absence || stage === 'grabacion' || stage === 'fotografia',
        countsAsLoad: !absence,
      });

      if (!absence && (stage === 'grabacion' || stage === 'fotografia')) {
        const estimate = estimateDeliveryDate(project, turnaround);
        if (estimate) {
          const start = addDays(days[days.length - 1], 1);
          if (estimate.date >= start) {
            const estimateDays = eachDayOfInterval({ start, end: estimate.date });
            entries.push({
              project,
              stage: 'estimate',
              managers,
              days: estimateDays,
              daySet: new Set(estimateDays.map((d) => format(d, 'yyyy-MM-dd'))),
              blocking: false,
              countsAsLoad: false,
              estimate,
            });
          }
        }
      }
    });
    return entries;
  }, [filteredProjects, turnaround]);

  const memberOrder = useMemo(() => {
    const predefined = teamMembers || [];
    const dynamic = occupancy
      .flatMap((o) => o.managers)
      .filter((manager) => manager && !predefined.includes(manager));
    return Array.from(new Set([...predefined, ...dynamic]));
  }, [teamMembers, occupancy]);

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

  const rows = useMemo(() => {
    const dateKeys = visibleDates.map((date) => format(date, 'yyyy-MM-dd'));
    return memberOrder.map((manager) => {
      const cells = visibleDates.map((date, index) => {
        const key = dateKeys[index];
        const items = occupancy
          .filter((o) => o.managers.includes(manager) && o.daySet.has(key))
          .map((o) => ({
            project: o.project,
            stage: o.stage,
            blocking: o.blocking,
            countsAsLoad: o.countsAsLoad,
            estimate: o.estimate,
            // ¿el día contiguo también está ocupado por el mismo proyecto? → barra continua
            continuesPrev: o.daySet.has(format(addDays(date, -1), 'yyyy-MM-dd')),
            continuesNext: o.daySet.has(format(addDays(date, 1), 'yyyy-MM-dd')),
            runStartTime: o.days[0].getTime(),
          }))
          .sort(
            (a, b) =>
              a.runStartTime - b.runStartTime ||
              String(a.project?.id || a.project?.name || '').localeCompare(
                String(b.project?.id || b.project?.name || '')
              )
          );
        // Cruce: dos compromisos de día completo (rodajes / ausencia) el mismo día.
        const blockingIds = new Set(items.filter((it) => it.blocking).map((it) => it.project?.id || it.project?.name));
        return { key, date, index, items, hasConflict: blockingIds.size > 1 };
      });

      // Métrica de carga en la ventana visible (sin ausencias ni estimados)
      const occupiedDays = cells.filter((c) => c.items.some((it) => it.countsAsLoad)).length;
      const absentDays = cells.filter((c) => c.items.some((it) => it.stage === ABSENCE_STAGE)).length;
      const projectIds = new Set();
      cells.forEach((c) => c.items.forEach((it) => {
        if (it.countsAsLoad) projectIds.add(it.project?.id || it.project?.name);
      }));
      const loadPct = visibleDates.length ? Math.round((occupiedDays / visibleDates.length) * 100) : 0;

      return { manager, cells, occupiedDays, absentDays, projectCount: projectIds.size, loadPct };
    });
  }, [memberOrder, occupancy, visibleDates]);

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

  // Semana: las 7 columnas se reparten el ancho disponible (antes el domingo
  // quedaba cortado). Mes: columnas con ancho mínimo y scroll horizontal.
  const gridTemplateColumns = useMemo(
    () =>
      viewMode === 'week'
        ? `minmax(140px, 180px) repeat(${visibleDates.length}, minmax(0, 1fr))`
        : `200px repeat(${visibleDates.length}, minmax(110px, 1fr))`,
    [visibleDates, viewMode]
  );  return (
    <div className="flex h-full flex-col gap-6 p-4 md:p-6 animate-fade-up">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-end">

          <div className="flex items-center gap-4">
            <div className="glass-panel flex p-1 rounded-lg">
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
                aria-label={viewMode === 'week' ? 'Semana anterior' : 'Mes anterior'}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-white text-secondary transition-all hover:scale-110 active:scale-95 dark:border-white/10 dark:bg-white/5"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={handleToday}
                className="glass-panel px-5 py-2 rounded-lg text-sm font-semibold text-secondary hover:text-primary dark:text-white/70 dark:hover:text-white"
              >
                Hoy
              </button>
              <button
                onClick={handleNext}
                aria-label={viewMode === 'week' ? 'Semana siguiente' : 'Mes siguiente'}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-white text-secondary transition-all hover:scale-110 active:scale-95 dark:border-white/10 dark:bg-white/5"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl">
          <div className="mb-6 flex flex-col items-center gap-3">
            <span className="text-base font-semibold text-primary dark:text-white">
              {timelineTitle}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium text-secondary dark:text-white/60">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-3.5 rounded-sm bg-[#2F6FE0]" /> Grabación
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-3.5 rounded-sm bg-[#1F2937] dark:bg-[#E5E7EB]" /> Edición
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-3.5 rounded-sm border border-dashed border-slate-400" /> Edición estimada
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-3.5 rounded-sm bg-slate-300 dark:bg-white/20" /> Ausente
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-3.5 rounded-sm ring-2 ring-red-500" /> Cruce de agenda
              </span>
              <span className="hidden h-3 w-px bg-border/60 sm:block" />
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-3.5 rounded-full bg-emerald-400" /> Libre
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-3.5 rounded-full bg-amber-400" /> Carga media
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-3.5 rounded-full bg-red-500" /> Carga alta
              </span>
            </div>
          </div>

          {visibleDates.length === 0 || memberOrder.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border/40 p-12 text-center">
              <p className="text-sm font-medium text-secondary dark:text-white/60">
                Sin proyectos programados en este periodo
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto soft-scroll">
              <div className={clsx('rounded-xl border border-border/40 overflow-hidden bg-slate-50 dark:bg-[#0B0C10]/50', viewMode === 'month' && 'min-w-[1000px]')}>
                <div
                  className="grid text-xs uppercase tracking-wide"
                  style={{ gridTemplateColumns }}
                >
                  <div className="sticky left-0 z-20 border-b border-border/40 bg-white dark:bg-dark-surface px-4 py-4 text-left text-xs font-semibold normal-case tracking-normal text-secondary dark:text-white/60">
                    Responsable
                  </div>
                  {visibleDates.map((date) => (
                    <div
                      key={date.toISOString()}
                      className="border-b border-border/40 px-2 py-4 text-center"
                    >
                      <span className="block text-lg font-semibold text-primary dark:text-white leading-none">{format(date, 'd')}</span>
                      <span className="text-xs font-medium normal-case tracking-normal text-secondary dark:text-white/60">{format(date, 'EEE', { locale: es })}</span>
                    </div>
                  ))}

                  {rows.map((row) => {
                    return (
                      <React.Fragment key={row.manager}>
                        <div
                          className="sticky left-0 z-20 flex flex-col justify-center gap-1 border-b border-border/40 bg-white dark:bg-dark-surface px-4 py-4"
                        >
                          <span className="text-xs font-semibold normal-case text-primary tracking-tight dark:text-white/80">
                            {row.manager || 'Sin responsable'}
                          </span>
                          <span className="text-xs font-medium normal-case tracking-normal text-secondary dark:text-white/60">
                            {row.occupiedDays > 0
                              ? `${row.occupiedDays} ${row.occupiedDays === 1 ? 'día' : 'días'} · ${row.projectCount} ${row.projectCount === 1 ? 'proyecto' : 'proyectos'}`
                              : 'Disponible'}
                            {row.absentDays > 0 && ` · ${row.absentDays} ${row.absentDays === 1 ? 'día' : 'días'} ausente`}
                          </span>
                          <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
                            <div
                              className={clsx(
                                'h-full rounded-full transition-all',
                                row.loadPct >= 80 ? 'bg-red-500' : row.loadPct >= 40 ? 'bg-amber-400' : 'bg-emerald-400'
                              )}
                              style={{ width: `${row.loadPct}%` }}
                            />
                          </div>
                        </div>
                        {row.cells.map((cell) => {
                          const weekday = cell.date.getDay();
                          return (
                            <div
                              key={cell.key}
                              className={clsx(
                                'relative min-w-0 border-b border-l border-border/40 px-1 py-2 dark:bg-white/[0.02]',
                                (weekday === 0 || weekday === 6) && 'bg-slate-100/50 dark:bg-white/[0.04]',
                                cell.hasConflict && 'bg-red-50 ring-2 ring-inset ring-red-500 dark:bg-red-500/10'
                              )}
                              title={cell.hasConflict ? `Cruce de agenda: ${row.manager} tiene dos compromisos este día` : undefined}
                            >
                              {cell.hasConflict && (
                                <span className="mb-1 block text-[11px] font-semibold normal-case tracking-normal text-red-700 dark:text-red-400">Cruce</span>
                              )}
                              <div className="flex flex-col gap-1.5">
                                {cell.items.map((item) => {
                                  const { project, stage } = item;
                                  const style = STAGE_STYLES[stage] || 'bg-slate-700/70 text-slate-100';
                                  const baseTitle = project.name || 'Proyecto';
                                  const title = STAGE_LABELS[stage] ? `${STAGE_LABELS[stage]}: ${baseTitle}` : baseTitle;
                                  const extendLeft = item.continuesPrev && cell.index > 0;
                                  const extendRight = item.continuesNext && cell.index < row.cells.length - 1;
                                  const showTitle = !item.continuesPrev || cell.index === 0;
                                  return (
                                    <button
                                      key={`${project.id || baseTitle}-${cell.key}-${stage}`}
                                      type="button"
                                      onClick={() => openModal(project)}
                                      className={clsx(
                                        'group relative flex h-7 min-w-0 items-center px-2 text-[11px] font-semibold normal-case tracking-normal transition-all hover:z-10 hover:shadow-lg',
                                        style,
                                        extendLeft ? '-ml-1 border-l-0' : 'rounded-l-xl',
                                        extendRight ? '-mr-1 border-r-0' : 'rounded-r-xl'
                                      )}
                                      title={item.estimate ? `${title} (${item.estimate.formatLabel} suele tardar ${item.estimate.days} días)` : title}
                                    >
                                      <span className="block truncate">{showTitle ? (stage === ABSENCE_STAGE ? 'Ausente' : baseTitle) : ''}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
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
