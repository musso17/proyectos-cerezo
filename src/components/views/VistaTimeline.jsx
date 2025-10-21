"use client";

import React, { useMemo } from 'react';
import useStore from '../../hooks/useStore';
import { Clock, AlertCircle } from 'lucide-react';
import { differenceInCalendarDays, eachMonthOfInterval, format, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { TEAM_STYLES, ensureMemberName } from '../../constants/team';
import { filterProjects } from '../../utils/filterProjects';

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
          <div className="grid grid-cols-[200px_1fr] gap-4 items-end">
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
                      className="absolute top-6 bottom-0 w-px bg-border/60"
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
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-border/10 pointer-events-none" />
            </div>
          </div>

          {groupedByMember.map(({ member, assignments, withoutDates }) => {
            const styles = getMemberStyles(member);
            const hasAssignments = assignments.length > 0;
            const hasNotes = withoutDates.length > 0;

            return (
              <div
                key={member}
                className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface/60 p-4 md:grid-cols-[200px_1fr] md:items-center">
                <div>
                  <h3 className="text-primary font-semibold text-lg">{member}</h3>
                  <p className="text-secondary text-sm">
                    {assignments.length} proyecto{assignments.length === 1 ? '' : 's'} asignado{assignments.length === 1 ? '' : 's'}
                  </p>
                </div>

                <div className="relative overflow-hidden rounded-lg border border-border bg-background/60 p-4">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[length:48px_100%] opacity-40 pointer-events-none" />

                  {hasAssignments ? (
                    <div className="relative h-24">
                      {assignments.map(({ project, range }) => {
                        const startOffset = differenceInCalendarDays(range.start, timelineBounds.start);
                        const duration = differenceInCalendarDays(range.end, range.start) + 1;
                        const rawLeft = (startOffset / totalDaysSpan) * 100;
                        const rawWidth = (duration / totalDaysSpan) * 100;
                        const left = Math.max(0, Math.min(rawLeft, 100));
                        const width = Math.max(4, Math.min(rawWidth + (rawLeft - left), 100 - left));

                        return (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => openModal(project)}
                            className={`absolute top-4 flex h-14 items-center gap-3 rounded-md border px-4 text-left shadow-sm transition-all hover:shadow-lg ${styles.bg} ${styles.border} ${styles.text}`}
                            style={{ left: `${left}%`, width: `${width}%` }}>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{project.name}</p>
                              <p className="truncate text-xs opacity-80">
                                {format(range.start, 'd MMM', { locale: es })} –{' '}
                                {format(range.end, 'd MMM', { locale: es })}
                              </p>
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
      )}
    </div>
  );
};

export default VistaTimeline;
