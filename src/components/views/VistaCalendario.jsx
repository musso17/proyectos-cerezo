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
import { ensureMemberName } from '../../constants/team';
import { filterProjects } from '../../utils/filterProjects';
import { getClientStyles } from '../../utils/clientStyles';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_ITEMS_PER_DAY = 3;
const EDITING_TASK_PILL = 'bg-fuchsia-500/20 text-fuchsia-100 border-fuchsia-400/40';
const PROJECT_EVENT_PILLS = {
  grabacion: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/40',
  entrega: 'bg-sky-500/20 text-sky-100 border-sky-400/40',
  duracion: 'bg-slate-500/20 text-slate-200 border-slate-400/40',
};

const getClientDetailBadgeClass = (client) => {
  const styles = getClientStyles(client);
  const paletteClass = styles?.badge || 'bg-slate-500/20 text-slate-200 border-slate-400/40';
  return `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${paletteClass}`;
};

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

const getProjectRecordingDate = (project) => {
  if (!project) return null;
  const value =
    project.fechaGrabacion ||
    project.fecha_grabacion ||
    project.fechaGrabación ||
    project.properties?.fechaGrabacion ||
    project.properties?.fecha_grabacion ||
    null;
  if (!value) return null;
  return parseDate(value);
};

const getProjectEventTypeForDay = (project, range, day) => {
  if (!project || !range || !day) return 'duracion';
  const recordingDate = getProjectRecordingDate(project);
  if (recordingDate && isSameDay(recordingDate, day)) {
    return 'grabacion';
  }
  if (range.start && isSameDay(range.start, day)) {
    return 'grabacion';
  }
  const deadline = project.deadline ? parseDate(project.deadline) : null;
  if (deadline && isSameDay(deadline, day)) {
    return 'entrega';
  }
  if (range.end && isSameDay(range.end, day)) {
    return 'entrega';
  }
  return 'duracion';
};

const getProjectEventLabel = (type) => {
  if (type === 'grabacion') return 'Grabación';
  if (type === 'entrega') return 'Entrega';
  return 'Edición';
};

const VistaCalendario = () => {
  const projects = useStore((state) => state.projects);
  const searchTerm = useStore((state) => state.searchTerm);
  const openModal = useStore((state) => state.openModal);
  const teamMembers = useStore((state) => state.teamMembers);
  const editingTasks = useStore((state) => state.editingTasks);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedMember, setSelectedMember] = useState('Todos');
  const [selectedDayKey, setSelectedDayKey] = useState(null);

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

  const handleDaySelect = (day) => {
    const key = startOfDay(day).toISOString();
    setSelectedDayKey((prev) => (prev === key ? null : key));
  };

  const filterOptions = useMemo(() => ['Todos', ...(teamMembers || [])], [teamMembers]);

  const selectedDayDate = useMemo(() => (selectedDayKey ? parseISO(selectedDayKey) : null), [selectedDayKey]);

  const selectedDayDetails = useMemo(() => {
    if (!selectedDayKey) return [];
    const items = calendarItemsByDay.get(selectedDayKey);
    if (!items || items.length === 0) return [];
    const dayDate = selectedDayDate;
    return items
      .map((item) => {
        if (item.type === 'task') {
          const { task, project } = item;
          const startLabel = format(item.range.start, 'HH:mm');
          const endLabel = format(item.range.end, 'HH:mm');
          return {
            id: task.id,
            sortTime: item.range.start.getTime(),
            type: 'edicion',
            title: `Edición de ${task.projectName || project?.name || 'proyecto'}`,
            description: task.descripcion,
            eventLabel: 'Edición',
            timeLabel: `${startLabel} - ${endLabel}`,
            manager: item.memberName,
            colorClass: EDITING_TASK_PILL,
            project,
            client: project?.client,
            status: project?.status,
            projectType: project?.type,
          };
        }

        const { project, range, memberName } = item;
        const eventType = getProjectEventTypeForDay(project, range, dayDate);
        const label = getProjectEventLabel(eventType);
        const slot = new Date(dayDate);
        if (eventType === 'grabacion') {
          slot.setHours(8, 0, 0, 0);
        } else if (eventType === 'entrega') {
          slot.setHours(18, 0, 0, 0);
        } else {
          slot.setHours(12, 0, 0, 0);
        }

        let scheduleLabel = null;
        if (eventType === 'grabacion' && project.fechaGrabacion) {
          scheduleLabel = `Grabación: ${project.fechaGrabacion}`;
        } else if (eventType === 'entrega' && project.deadline) {
          scheduleLabel = `Entrega: ${project.deadline}`;
        } else if (project.startDate || project.deadline) {
          scheduleLabel = `${project.startDate || 'Sin inicio'} → ${project.deadline || 'Sin entrega'}`;
        }

        return {
          id: project.id || `${project.name}-${eventType}`,
          sortTime: slot.getTime(),
          type: eventType,
          title: project.name,
          description: project.description,
          eventLabel: label,
          timeLabel: scheduleLabel,
          manager: memberName,
          colorClass: PROJECT_EVENT_PILLS[eventType] || PROJECT_EVENT_PILLS.duracion,
          project,
          client: project.client,
          status: project.status,
          projectType: project.type,
        };
      })
      .sort((a, b) => a.sortTime - b.sortTime);
  }, [calendarItemsByDay, selectedDayKey, selectedDayDate]);

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
              className={`min-h-[110px] cursor-pointer bg-surface/70 p-2 transition-all duration-200 ease-[var(--ease-ios-out)] ${
                isCurrentMonth ? 'text-primary' : 'text-secondary/60'
              } ${
                isToday
                  ? 'border border-accent/60 bg-accent/10 shadow-[0_15px_35px_rgba(56,189,248,0.25)]'
                  : 'border border-surface/40 hover:border-cyan-400/40 hover:bg-surface/90 hover:shadow-[0_12px_30px_rgba(8,47,73,0.35)]'
              } ${isSelected ? 'ring-2 ring-cyan-400/60' : ''}`}>
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
                        onClick={(event) => {
                          event.stopPropagation();
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

                  const { project } = item;
                  const eventType = getProjectEventTypeForDay(project, range, day);
                  const pillClass = PROJECT_EVENT_PILLS[eventType] || PROJECT_EVENT_PILLS.duracion;
                  const eventLabel = getProjectEventLabel(eventType);

                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openModal(project);
                      }}
                      className={`group rounded-md border px-2 py-1 text-left text-xs shadow-sm transition-all duration-200 ease-[var(--ease-ios-out)] hover:shadow-lg hover:-translate-y-0.5 ${pillClass}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{project.name}</span>
                        <span className="whitespace-nowrap text-[10px] opacity-75">
                          {memberName}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wide opacity-70">
                        {eventLabel}
                      </p>
                      {project.status && (
                        <p className="text-[10px] opacity-60">{project.status}</p>
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

      {selectedDayDate && (
        <div className="mt-6 rounded-3xl border border-border bg-surface/80 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-primary">
                {format(selectedDayDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
              </h3>
              <p className="text-xs text-secondary">
                {selectedDayDetails.length} {selectedDayDetails.length === 1 ? 'actividad' : 'actividades'} programadas
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDayKey(null)}
              className="rounded-full border border-border px-3 py-1 text-xs text-secondary transition hover:border-accent hover:text-primary">
              Cerrar
            </button>
          </div>

          {selectedDayDetails.length === 0 ? (
            <p className="mt-4 text-sm text-secondary">Sin eventos para este día.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {selectedDayDetails.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-surface/90 p-4 transition hover:border-cyan-400/50 hover:bg-surface">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-[200px] max-w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${item.colorClass}`}>
                          {item.eventLabel}
                        </span>
                        {item.timeLabel && (
                          <span className="text-xs text-secondary">{item.timeLabel}</span>
                        )}
                      </div>
                      <h4 className="mt-2 text-lg font-semibold text-primary">{item.title}</h4>
                    </div>
                    <div className="text-right text-xs text-secondary">
                      {item.manager && (
                        <p>
                          Responsable:{' '}
                          <span className="text-primary">{item.manager}</span>
                        </p>
                      )}
                      {item.status && (
                        <p>
                          Estado:{' '}
                          <span className="text-primary">{item.status}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-secondary">
                    {item.client && (
                      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                        <span className="text-[10px] uppercase tracking-wide text-secondary/70">Cliente</span>
                        <span className={getClientDetailBadgeClass(item.client)}>{item.client}</span>
                      </div>
                    )}
                    {item.projectType && (
                      <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] uppercase tracking-wide text-secondary">
                        {item.projectType}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-3 text-sm text-secondary">{item.description}</p>
                  )}
                  {item.project && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => openModal(item.project)}
                        className="rounded-full border border-cyan-400/50 px-3 py-1 text-xs font-medium text-cyan-200 transition hover:border-cyan-300 hover:text-cyan-100">
                        Ver proyecto
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
