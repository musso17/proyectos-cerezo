"use client";

import React, { useMemo, useState } from 'react';
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

const STAGE_STYLES = {
  grabacion: 'bg-blue-500/80 border border-blue-300/60 text-white',
  edicion: 'bg-green-500/80 border border-green-300/60 text-white',
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

const VistaTimeline = () => {
  const projects = useStore((state) => state.projects);
  const searchTerm = useStore((state) => state.searchTerm);
  const openModal = useStore((state) => state.openModal);
  const teamMembers = useStore((state) => state.teamMembers);

  const [viewMode, setViewMode] = useState('month');
  const [currentDate, setCurrentDate] = useState(() => startOfMonth(new Date()));

  const filteredProjects = useMemo(() => {
    return filterProjects(projects, searchTerm).filter((project) => {
      const stage = getProjectStage(project);
      return stage === 'grabacion' || stage === 'edicion';
    });
  }, [projects, searchTerm]);

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
  );

  return (
    <>
      <div className="md:hidden text-center p-8">
        <p className="text-lg font-semibold">Vista no disponible</p>
        <p className="text-slate-400">La vista de línea de tiempo no está optimizada para dispositivos móviles. Por favor, usa una pantalla más grande.</p>
      </div>
      <div className="hidden md:block space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock className="text-accent" size={28} />
            <div>
              <h2 className="text-2xl font-bold text-primary">Disponibilidad por responsable</h2>
              <p className="text-sm text-secondary/80">Visualiza grabaciones y ediciones programadas.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                viewMode === 'week'
                  ? 'border-accent bg-accent/20 text-primary'
                  : 'border-border bg-slate-900/50 text-secondary hover:border-accent/40 hover:text-primary'
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`rounded-full border px-3 py-1 text-sm transition ${
                viewMode === 'month'
                  ? 'border-accent bg-accent/20 text-primary'
                  : 'border-border bg-slate-900/50 text-secondary hover:border-accent/40 hover:text-primary'
              }`}
            >
              Mes
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border/60 bg-slate-900/60 px-4 py-3">
          <div className="flex items-center gap-3 text-sm text-secondary">
            <CalendarIcon size={16} />
            <span className="text-primary font-medium">{timelineTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevious}
              className="rounded-full border border-border/60 bg-slate-900 p-2 text-secondary transition hover:-translate-y-0.5 hover:border-accent/60 hover:text-accent"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="rounded-full border border-border/60 bg-slate-900 px-4 py-1 text-xs font-medium text-secondary transition hover:-translate-y-0.5 hover:border-accent/60 hover:text-accent"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-full border border-border/60 bg-slate-900 p-2 text-secondary transition hover:-translate-y-0.5 hover:border-accent/60 hover:text-accent"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {visibleDates.length === 0 || memberOrder.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/60 bg-slate-900/60 p-6 text-center text-sm text-secondary">
            No hay proyectos con fechas asignadas en el periodo seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[1000px] rounded-3xl border border-border/60 bg-slate-950/70">
              <div
                className="grid text-xs uppercase tracking-wide text-secondary"
                style={{ gridTemplateColumns }}
              >
                <div className="sticky left-0 z-20 border-b border-border/60 bg-slate-900 px-4 py-3 text-left text-[11px] font-semibold text-secondary/80">
                  Responsable
                </div>
                {visibleDates.map((date) => (
                  <div
                    key={date.toISOString()}
                    className="border-b border-border/60 px-2 py-3 text-center text-[11px] font-semibold text-secondary"
                  >
                    <span className="block text-sm text-primary">{format(date, 'd')}</span>
                    <span className="text-[10px] text-secondary/70">{format(date, 'EEE', { locale: es })}</span>
                  </div>
                ))}

                {assignmentsByManager.map((row) => {
                  const palette = TEAM_STYLES[row.manager] || TEAM_STYLES.default;
                  return (
                    <React.Fragment key={row.manager}>
                      <div
                        className={`sticky left-0 z-20 border-b border-border/60 bg-slate-900 px-4 py-3 text-sm font-semibold text-primary ${palette.pill || ''}`}
                      >
                        {row.manager || 'Sin responsable'}
                      </div>
                      {row.dates.map((cell) => (
                        <div
                          key={cell.key}
                          className="border-b border-l border-border/50 px-1 py-2"
                        >
                          <div className="flex flex-col gap-1">
                            {cell.items.map(({ project, stage }) => {
                              const style = STAGE_STYLES[stage] || 'bg-slate-700/70 border border-slate-600/60 text-slate-100';
                              return (
                                <button
                                  key={`${project.id}-${cell.key}`}
                                  type="button"
                                  onClick={() => openModal(project)}
                                  className={`line-clamp-2 rounded-xl px-2 py-1 text-[11px] font-medium transition hover:-translate-y-0.5 hover:shadow-lg ${style}`}
                                  title={project.name}
                                >
                                  {project.name || 'Proyecto sin título'}
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
    </>
  );
};

export default VistaTimeline;
