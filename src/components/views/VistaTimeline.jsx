"use client";

import React, { useMemo } from 'react';
import useStore from '../../hooks/useStore';
import { Clock, AlertCircle } from 'lucide-react';
import { differenceInCalendarDays, eachMonthOfInterval, format, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { TEAM_STYLES, ensureMemberName } from '../../constants/team';
import { filterProjects } from '../../utils/filterProjects';
import { getClientBadgeClass } from '../../utils/clientStyles';

const parseDate = (value) => {
  if (!value) return null;
  const iso = value.length <= 10 ? `${value}T00:00:00` : value;
  const date = parseISO(iso);
  if (Number.isNaN(date.getTime())) return null;
  return startOfDay(date);
};

const getRangeForProject = (project) => {
  const start = parseDate(project.startDate) || parseDate(project.deadline);
  const end = parseDate(project.deadline) || parseDate(project.startDate);

  if (!start || !end) return null;

  const normalizedStart = start <= end ? start : end;
  const normalizedEnd = end >= start ? end : start;

  return { start: normalizedStart, end: normalizedEnd };
};

const getStatusKey = (status) => {
  if (!status) return 'Pendiente';
  const normalized = status.toString().trim().toLowerCase();
  if (normalized.includes('complet')) return 'Completado';
  if (normalized.includes('finaliz')) return 'Completado';
  if (normalized.includes('curso')) return 'En curso';
  if (normalized.includes('progr') || normalized.includes('progreso')) return 'En progreso';
  if (normalized.includes('revisión') || normalized.includes('revision')) return 'En revisión';
  if (normalized.includes('cancel')) return 'Cancelado';
  return status;
};

const STATUS_ACCENTS = {
  Completado: 'bg-blue-500/15 border-blue-400/40',
  'En curso': 'bg-amber-500/15 border-amber-400/40',
  'En progreso': 'bg-amber-500/15 border-amber-400/40',
  'En revisión': 'bg-purple-500/15 border-purple-400/40',
  Cancelado: 'bg-red-500/15 border-red-400/40',
  Pendiente: 'bg-slate-600/20 border-slate-500/40',
};

const getStatusAccent = (status) => STATUS_ACCENTS[getStatusKey(status)] || STATUS_ACCENTS.Pendiente;

const STATUS_DOTS = {
  Completado: 'bg-blue-400',
  'En curso': 'bg-amber-400',
  'En progreso': 'bg-amber-400',
  'En revisión': 'bg-purple-400',
  Cancelado: 'bg-red-400',
  Pendiente: 'bg-slate-400',
};

const getStatusDot = (status) => STATUS_DOTS[getStatusKey(status)] || STATUS_DOTS.Pendiente;

const placeAssignmentsInLanes = (assignments) => {
  if (!assignments || assignments.length === 0) {
    return { placed: [], laneCount: 0 };
  }

  const sorted = [...assignments].sort((a, b) => a.range.start - b.range.start);
  const laneEndTimes = [];
  const placed = sorted.map((item) => {
    const startTime = item.range.start.getTime();
    const endTime = item.range.end.getTime();

    let laneIndex = laneEndTimes.findIndex((end) => startTime > end);
    if (laneIndex === -1) {
      laneIndex = laneEndTimes.length;
      laneEndTimes.push(endTime);
    } else {
      laneEndTimes[laneIndex] = Math.max(laneEndTimes[laneIndex], endTime);
    }

    const durationDays = differenceInCalendarDays(item.range.end, item.range.start) + 1;

    return {
      ...item,
      laneIndex,
      durationDays,
    };
  });

  return {
    placed,
    laneCount: laneEndTimes.length || 1,
  };
};

const VistaTimeline = () => {
  const projects = useStore((state) => state.projects);
  const searchTerm = useStore((state) => state.searchTerm);
  const openModal = useStore((state) => state.openModal);
  const teamMembers = useStore((state) => state.teamMembers);

  const filteredProjects = useMemo(
    () => filterProjects(projects, searchTerm),
    [projects, searchTerm]
  );

  const processedProjects = useMemo(
    () =>
      filteredProjects.map((project) => {
        const range = getRangeForProject(project);
        const memberName = ensureMemberName(project.manager);
        return { project, range, memberName };
      }),
    [filteredProjects]
  );

  const projectsWithRange = useMemo(
    () => processedProjects.filter((item) => item.range),
    [processedProjects]
  );

  const projectsWithoutRange = useMemo(
    () => processedProjects.filter((item) => !item.range),
    [processedProjects]
  );

  const timelineBounds = useMemo(() => {
    if (projectsWithRange.length === 0) return null;

    const start = projectsWithRange.reduce(
      (earliest, item) => (item.range.start < earliest ? item.range.start : earliest),
      projectsWithRange[0].range.start
    );
    const end = projectsWithRange.reduce(
      (latest, item) => (item.range.end > latest ? item.range.end : latest),
      projectsWithRange[0].range.end
    );

    return { start, end };
  }, [projectsWithRange]);

  const totalDaysSpan = useMemo(() => {
    if (!timelineBounds) return 0;
    return differenceInCalendarDays(timelineBounds.end, timelineBounds.start) + 1;
  }, [timelineBounds]);

  const memberOrder = useMemo(() => {
    const predefined = teamMembers || [];
    const dynamicMembers = processedProjects
      .map((item) => item.memberName)
      .filter((name) => !predefined.includes(name));

    return Array.from(new Set([...predefined, ...dynamicMembers]));
  }, [teamMembers, processedProjects]);

  const groupedByMember = useMemo(
    () =>
      memberOrder.map((member) => ({
        member,
        assignments: projectsWithRange.filter((item) => item.memberName === member),
        withoutDates: projectsWithoutRange.filter((item) => item.memberName === member),
      })),
    [memberOrder, projectsWithRange, projectsWithoutRange]
  );

  const monthTicks = useMemo(() => {
    if (!timelineBounds) return [];
    return eachMonthOfInterval({ start: timelineBounds.start, end: timelineBounds.end });
  }, [timelineBounds]);

  const statusLegend = useMemo(() => {
    const available = new Set();
    filteredProjects.forEach((item) => {
      available.add(getStatusKey(item.status));
    });
    const order = ['Completado', 'En curso', 'En progreso', 'En revisión', 'Pendiente', 'Cancelado'];
    return order.filter((item) => available.has(item));
  }, [filteredProjects]);

  const getMemberStyles = (member) => TEAM_STYLES[member] || TEAM_STYLES.default;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <Clock className="text-accent" size={28} />
        <h2 className="text-2xl font-bold text-primary">Timeline por Responsable</h2>
      </div>

      {filteredProjects.length === 0 ? (
        <div className="bg-surface rounded-lg border border-border p-8 text-center">
          <Clock size={48} className="mx-auto text-secondary mb-4" />
          <p className="text-secondary">Aún no hay proyectos registrados.</p>
        </div>
      ) : projectsWithRange.length === 0 ? (
        <div className="bg-surface rounded-lg border border-border p-6 flex items-center gap-4">
          <AlertCircle className="text-orange-400" size={32} />
          <div>
            <p className="text-primary font-semibold">Sin fechas definidas.</p>
            <p className="text-secondary text-sm">
              Asigna fechas de inicio y fin a los proyectos para visualizarlos en el timeline estilo
              Gantt.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface/70 px-5 py-4 text-xs text-secondary">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-primary">
                Cada barra indica el periodo activo del proyecto para el responsable.
              </span>
              <span>La franja lateral coloreada corresponde al integrante asignado.</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {statusLegend.map((status) => (
                <span key={status} className="flex items-center gap-2 whitespace-nowrap">
                  <span className={`h-2 w-6 rounded-full ${getStatusDot(status)}`} />
                  <span>{status}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[720px] space-y-6">
              <div className="grid grid-cols-[200px_1fr] items-end gap-4">
                <div />
                <div className="relative border-b border-border pb-6">
                  {monthTicks.map((tick) => {
                    const offset =
                      (differenceInCalendarDays(tick, timelineBounds.start) / totalDaysSpan) * 100;
                    const safeOffset = Math.max(0, Math.min(offset, 100));
                    const label = format(tick, 'MMM yyyy', { locale: es });
                    return (
                      <div key={tick.toISOString()}>
                        <div
                          className="absolute bottom-0 top-6 w-px bg-border/60"
                          style={{ left: `${safeOffset}%` }}
                        />
                        <span
                          className="absolute -top-1 text-xs text-secondary"
                          style={{ left: `${safeOffset}%`, transform: 'translateX(-50%)' }}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-border/10" />
                </div>
              </div>

              {groupedByMember.map(({ member, assignments, withoutDates }) => {
                const styles = getMemberStyles(member);
                const { placed, laneCount } = placeAssignmentsInLanes(assignments);
                const hasAssignments = placed.length > 0;
                const hasNotes = withoutDates.length > 0;
                const laneHeight = 64;
            const containerHeight = Math.max(1, laneCount) * laneHeight;

            return (
              <div
                key={member}
                className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface/60 p-4 transition-all duration-200 ease-[var(--ease-ios-out)] hover:border-cyan-400/50 hover:shadow-[0_18px_36px_rgba(8,47,73,0.35)] md:grid-cols-[200px_1fr] md:items-center">
                <div>
                  <h3 className="text-primary font-semibold text-lg">{member}</h3>
                  <p className="text-secondary text-sm">
                    {assignments.length} proyecto{assignments.length === 1 ? '' : 's'} asignado{assignments.length === 1 ? '' : 's'}
                  </p>
                </div>

                <div className="relative overflow-hidden rounded-lg border border-border bg-background/60 p-4">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[length:48px_100%] opacity-40 pointer-events-none" />

                  {hasAssignments ? (
                    <div className="relative" style={{ height: `${containerHeight}px` }}>
                      {placed.map(({ project, range, laneIndex, durationDays }) => {
                        const startOffset = differenceInCalendarDays(range.start, timelineBounds.start);
                        const duration = differenceInCalendarDays(range.end, range.start) + 1;
                        const rawLeft = (startOffset / totalDaysSpan) * 100;
                        const rawWidth = (duration / totalDaysSpan) * 100;
                        const left = Math.max(0, Math.min(rawLeft, 100));
                        const width = Math.max(4, Math.min(rawWidth + (rawLeft - left), 100 - left));
                        const statusAccent = getStatusAccent(project.status);
                        const statusLabel = getStatusKey(project.status);
                        const durationLabel = durationDays === 1 ? '1 día' : `${durationDays} días`;

                        return (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => openModal(project)}
                            className={`absolute flex h-[52px] flex-col justify-center gap-1 overflow-hidden rounded-xl border px-4 text-left text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${statusAccent}`}
                            style={{ left: `${left}%`, width: `${width}%`, top: `${laneIndex * laneHeight}px` }}>
                            <span className={`absolute inset-y-0 left-0 w-1 ${styles.bg}`} />
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-semibold text-primary">{project.name}</p>
                              <span className="text-[11px] uppercase tracking-wide text-secondary/80">
                                {durationLabel}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-xs text-secondary/80">
                              <span>
                                {format(range.start, 'd MMM', { locale: es })} –{' '}
                                {format(range.end, 'd MMM', { locale: es })}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                                  {statusLabel}
                                </span>
                                {project.client && (
                                  <span className={getClientBadgeClass(project.client, 'sm')}>
                                    {project.client}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-24 items-center justify-center text-sm text-secondary">
                      Sin proyectos con fechas asignadas.
                    </div>
                  )}
                </div>

                {hasNotes && (
                  <div className="md:col-span-2">
                    <div className="mt-3 rounded-lg border border-dashed border-border/60 bg-background/40 p-3 text-xs text-secondary">
                      <p className="font-semibold text-primary">
                        Proyectos sin fechas para {member}:
                      </p>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {withoutDates.map(({ project }) => (
                          <li key={project.id}>
                            <button
                              type="button"
                              onClick={() => openModal(project)}
                              className="underline decoration-dotted decoration-accent/60 hover:text-primary">
                              {project.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VistaTimeline;
