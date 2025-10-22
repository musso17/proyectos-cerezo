"use client";

import React, { useMemo, useState } from 'react';
import useStore from '../../hooks/useStore';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { TEAM_STYLES, ensureMemberName } from '../../constants/team';
import { filterProjects } from '../../utils/filterProjects';
import { getClientBadgeClass } from '../../utils/clientStyles';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_ITEMS_PER_DAY = 3;
const EDITING_TASK_PILL = 'bg-fuchsia-500/20 text-fuchsia-100 border-fuchsia-400/40';

const parseDate = (value) => {
  if (!value) return null;
  const iso = value.length <= 10 ? `${value}T00:00:00` : value;
  const date = parseISO(iso);
  if (Number.isNaN(date.getTime())) return null;
  return startOfDay(date);
};

const parseDateTime = (value) => {
  if (!value) return null;
  const stringValue = value.toString();
  const parsed = parseISO(stringValue);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(stringValue);
  if (Number.isNaN(fallback.getTime())) return null;
  return fallback;
};

const getCalendarRange = (project) => {
  const start = parseDate(project.startDate);
  const end = parseDate(project.deadline);

  if (start && end) {
    const normalizedStart = start <= end ? start : end;
    const normalizedEnd = end >= start ? end : start;
    return { start: normalizedStart, end: normalizedEnd };
  }

  const single = start || end;
  if (!single) return null;
  return { start: single, end: single };
};

const getTaskRange = (task) => {
  if (!task) return null;
  const start = parseDateTime(task.fechaInicio);
  const end = parseDateTime(task.fechaFin || task.fechaInicio);
  if (!start || !end) return null;
  const normalizedStart = start <= end ? start : end;
  const normalizedEnd = end >= start ? end : start;
  return { start: normalizedStart, end: normalizedEnd };
};

const VistaCalendario = () => {
  const projects = useStore((state) => state.projects);
  const searchTerm = useStore((state) => state.searchTerm);
  const openModal = useStore((state) => state.openModal);
  const teamMembers = useStore((state) => state.teamMembers);
  const editingTasks = useStore((state) => state.editingTasks);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedMember, setSelectedMember] = useState('Todos');

  const today = startOfDay(new Date());

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = [];
    let cursor = gridStart;
    while (cursor <= gridEnd) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [currentMonth]);

  const filteredProjects = useMemo(
    () => filterProjects(projects, searchTerm),
    [projects, searchTerm]
  );

  const processedProjects = useMemo(
    () =>
      filteredProjects.map((project) => {
        const range = getCalendarRange(project);
        const memberName = ensureMemberName(project.manager);
        return { project, range, memberName };
      }),
    [filteredProjects]
  );

  const visibleProjects = useMemo(
    () =>
      processedProjects.filter((item) =>
        selectedMember === 'Todos' ? true : item.memberName === selectedMember
      ),
    [processedProjects, selectedMember]
  );

  const visibleEditingTaskItems = useMemo(() => {
    if (!editingTasks || editingTasks.length === 0) return [];

    const allowedIds = new Set();
    const allowedNames = new Set();

    visibleProjects.forEach(({ project }) => {
      if (project.id) {
        allowedIds.add(project.id);
      }
      if (project.name) {
        allowedNames.add(project.name.toLowerCase());
      }
    });

    const items = [];

    editingTasks.forEach((task) => {
      const hasName = typeof task.relatedProjectName === 'string' && task.relatedProjectName.length > 0;
      const matchesId = task.relatedProjectId && allowedIds.has(task.relatedProjectId);
      const matchesName = hasName && allowedNames.has(task.relatedProjectName.toLowerCase());

      if (!matchesId && !matchesName) return;

      const memberName = ensureMemberName(task.manager);
      if (selectedMember !== 'Todos' && memberName !== selectedMember) return;

      const range = getTaskRange(task);
      if (!range) return;

      const relatedProject =
        visibleProjects.find(
          (item) =>
            (task.relatedProjectId && item.project.id === task.relatedProjectId) ||
            (hasName &&
              item.project.name &&
              item.project.name.toLowerCase() === task.relatedProjectName.toLowerCase())
        )?.project || null;

      items.push({
        type: 'task',
        task,
        project: relatedProject,
        range,
        memberName,
      });
    });

    return items;
  }, [editingTasks, visibleProjects, selectedMember]);

  const scheduledProjects = useMemo(
    () => visibleProjects.filter((item) => item.range),
    [visibleProjects]
  );

  const unscheduledProjects = useMemo(
    () => visibleProjects.filter((item) => !item.range),
    [visibleProjects]
  );

  const scheduledItems = useMemo(
    () => [...scheduledProjects, ...visibleEditingTaskItems],
    [scheduledProjects, visibleEditingTaskItems]
  );

  const calendarItemsByDay = useMemo(() => {
    const map = new Map();
    scheduledItems.forEach((item) => {
      const { range } = item;
      let cursor = range.start;
      while (cursor <= range.end) {
        const key = startOfDay(cursor).toISOString();
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key).push(item);
        cursor = addDays(cursor, 1);
      }
    });
    return map;
  }, [scheduledItems]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => startOfMonth(addMonths(prev, -1)));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => startOfMonth(addMonths(prev, 1)));
  };

  const filterOptions = useMemo(() => ['Todos', ...(teamMembers || [])], [teamMembers]);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="text-accent" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-primary">Calendario de Proyectos</h2>
            <p className="text-secondary text-sm">
              Visualiza entregas y responsabilidades por integrante.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="rounded-full border border-border p-2 text-secondary hover:border-accent hover:text-primary"
            aria-label="Mes anterior">
            <ChevronLeft size={18} />
          </button>
          <span className="text-lg font-semibold text-primary capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded-full border border-border p-2 text-secondary hover:border-accent hover:text-primary"
            aria-label="Mes siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {filterOptions.map((option) => {
          const isActive = option === selectedMember;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setSelectedMember(option)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                isActive
                  ? 'border-accent bg-accent/20 text-primary'
                  : 'border-border bg-surface/60 text-secondary hover:text-primary'
              }`}>
              {option === 'Todos' ? 'Todos los responsables' : option}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-border bg-border/40">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="bg-surface/80 px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-secondary">
            {weekday}
          </div>
        ))}
        {calendarDays.map((day) => {
          const key = startOfDay(day).toISOString();
          const dayItems = (calendarItemsByDay.get(key) || []).sort(
            (a, b) => a.range.start - b.range.start
          );
          const visibleItems = dayItems.slice(0, MAX_ITEMS_PER_DAY);
          const extraItems = dayItems.length - visibleItems.length;
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={key}
              className={`min-h-[110px] bg-surface/70 p-2 transition-all duration-200 ease-[var(--ease-ios-out)] ${
                isCurrentMonth ? 'text-primary' : 'text-secondary/60'
              } ${isToday ? 'border border-accent/60 bg-accent/10 shadow-[0_15px_35px_rgba(56,189,248,0.25)]' : 'border border-surface/40 hover:border-cyan-400/40 hover:bg-surface/90 hover:shadow-[0_12px_30px_rgba(8,47,73,0.35)]'}`}>
              <div className="flex items-center justify-between text-xs">
                <span className={`text-sm font-semibold ${isCurrentMonth ? 'text-primary' : ''}`}>
                  {format(day, 'd', { locale: es })}
                </span>
                {dayItems.length > 0 && (
                  <span className="rounded-full bg-background/60 px-2 py-0.5 text-[10px] text-secondary">
                    {dayItems.length}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-col gap-1">
                {visibleItems.map((item) => {
                  const { range, memberName } = item;
                  if (item.type === 'task') {
                    const { task, project } = item;
                    const startLabel = format(range.start, 'HH:mm');
                    const endLabel = format(range.end, 'HH:mm');
                    const title = `Edición de ${task.projectName || project?.name || 'proyecto'}`;

                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => {
                          if (project) {
                            openModal(project);
                          }
                        }}
                        className={`group rounded-md border px-2 py-1 text-left text-xs shadow-sm transition-all duration-200 ease-[var(--ease-ios-out)] hover:shadow-lg hover:-translate-y-0.5 ${EDITING_TASK_PILL}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold">{title}</span>
                          <span className="whitespace-nowrap text-[10px] opacity-75">
                            {startLabel} - {endLabel}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide opacity-70">
                          {task.descripcion}
                        </p>
                        {memberName && (
                          <p className="text-[10px] opacity-60">{memberName}</p>
                        )}
                      </button>
                    );
                  }

                  const styles = TEAM_STYLES[memberName] || TEAM_STYLES.default;
                  const isStart = isSameDay(day, range.start);
                  const isEnd = isSameDay(day, range.end);
                  let badgeLabel = '';
                  if (isStart && isEnd) {
                    badgeLabel = 'Evento de 1 día';
                  } else if (isStart) {
                    badgeLabel = 'Inicio';
                  } else if (isEnd) {
                    badgeLabel = 'Entrega';
                  }

                  const { project } = item;

                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => openModal(project)}
                      className={`group rounded-md border px-2 py-1 text-left text-xs shadow-sm transition-all duration-200 ease-[var(--ease-ios-out)] hover:shadow-lg hover:-translate-y-0.5 ${styles.pill}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{project.name}</span>
                        <span className="whitespace-nowrap text-[10px] opacity-75">
                          {memberName}
                        </span>
                      </div>
                      {badgeLabel ? (
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide opacity-70">
                          {badgeLabel}
                        </p>
                      ) : (
                        project.client && (
                          <span className={getClientBadgeClass(project.client, 'sm')}>
                            {project.client}
                          </span>
                        )
                      )}
                    </button>
                  );
                })}
                {extraItems > 0 && (
                  <div className="rounded-md bg-background/70 px-2 py-1 text-[10px] text-secondary">
                    +{extraItems} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {unscheduledProjects.length > 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-border/70 bg-surface/60 p-4 text-sm text-secondary">
          <p className="font-semibold text-primary">
            Proyectos sin fechas asignadas ({unscheduledProjects.length}):
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {unscheduledProjects.map(({ project }) => (
              <button
                key={project.id}
                type="button"
                onClick={() => openModal(project)}
                className="rounded-full border border-border px-3 py-1 text-xs text-secondary hover:border-accent hover:text-primary">
                {project.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VistaCalendario;
