"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useStore from '../../hooks/useStore';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
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
import { getUIPreference, setUIPreference } from '../../utils/uiPreferences';
import VistaTimeline from './VistaTimeline';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_ITEMS_PER_DAY = 3;
const EDITING_TASK_PILL = 'border-[#D9D6FF] bg-[#EEF1FF] text-[#6C63FF]';
const PROJECT_EVENT_PILLS = {
  grabacion: 'border-[#C7DAFF] bg-[#E7F1FF] text-[#4C8EF7]',
  edicion: 'border-[#D9D6FF] bg-[#EEF1FF] text-[#6C63FF]',
  entrega: 'border-[#C8E6C9] bg-[#F1FAF3] text-[#2F9E44]',
  duracion: 'border-[#E5E7EB] bg-[#F9FAFB] text-secondary',
  revision: 'border-[#FFE0B0] bg-[#FFF4E6] text-[#C07A00]',
  correccion: 'border-[#FFE0B0] bg-[#FFF4E6] text-[#C07A00]',
};

const REVISION_EVENT_PILLS = {
  sent: 'border-[#C7DAFF] bg-[#E7F1FF] text-[#4C8EF7]',
  feedback: 'border-[#FFE0B0] bg-[#FFF4E6] text-[#C07A00]',
};

const TYPE_BADGES = {
  grabacion: {
    label: 'Grabación',
    className: 'border border-[#CDE5FF] bg-[#E7F3FF] text-[#2563EB]',
  },
  edicion: {
    label: 'Edición',
    className: 'border border-[#D9D6FF] bg-[#EEF1FF] text-[#6C63FF]',
  },
};

const getProjectTypeBadge = (project) => {
  if (!project) return { label: 'Sin tipo', className: 'border border-[#D1D5DB] bg-[#EEF1FF] text-accent' };

  const rawStage = project.stage || project.properties?.stage || '';
  const rawType = project.type || project.properties?.registrationType || '';

  const normalizedStage = rawStage?.toString().trim().toLowerCase();
  const normalizedType = rawType?.toString().trim().toLowerCase();

  if (normalizedStage && TYPE_BADGES[normalizedStage]) {
    return TYPE_BADGES[normalizedStage];
  }
  if (normalizedType && TYPE_BADGES[normalizedType]) {
    return TYPE_BADGES[normalizedType];
  }

  const label = rawType || rawStage || 'Sin tipo';
  return { label, className: 'border border-[#D1D5DB] bg-[#EEF1FF] text-accent' };
};

const getClientDetailBadgeClass = (client) => {
  const styles = getClientStyles(client);
  const paletteClass = styles?.badge || 'bg-[#EEF1FF] text-accent border-accent/40';
  return `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${paletteClass}`;
};

const getStoredCalendarMember = () => {
  const stored = getUIPreference('calendarSelectedMember', 'Todos');
  if (typeof stored !== 'string') return 'Todos';
  const trimmed = stored.trim();
  return trimmed.length > 0 ? trimmed : 'Todos';
};

const getStoredCalendarPrimaryView = () => {
  const stored = getUIPreference('calendarPrimaryView', 'calendar');
  return stored === 'timeline' ? 'timeline' : 'calendar';
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
  const stage = (project.stage || project.properties?.stage || '').toString().trim().toLowerCase();
  const start = parseDate(project.startDate);
  const end = parseDate(project.deadline);

  if (stage === 'edicion' && end) {
    return { start: end, end };
  }

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

  const stage = (project.stage || project.properties?.stage || '').toString().trim().toLowerCase();
  const revisionStep = project.revision?.currentStep || '';
  if (revisionStep === 'enviado' || revisionStep === 'esperando_feedback') {
    return 'revision';
  }
  if (revisionStep === 'corrigiendo') {
    return 'correccion';
  }
  if (revisionStep === 'editando') {
    return 'edicion';
  }
  if (revisionStep === 'aprobado') {
    return 'entrega';
  }

  const isStartDay = range.start && isSameDay(range.start, day);
  const isEndDay = range.end && isSameDay(range.end, day);
  const deadline = project.deadline ? parseDate(project.deadline) : null;
  const isDeadlineDay = deadline ? isSameDay(deadline, day) : false;

  if (stage === 'edicion') {
    // If there is no explicit deadline, treat it as an ongoing editing event
    if (!project.deadline) return 'edicion';
    const durationDays = differenceInCalendarDays(range.end, range.start) + 1;
    if (durationDays <= 1) {
      return 'entrega';
    }
    if (isEndDay || isDeadlineDay) {
      return 'entrega';
    }
    return 'edicion';
  }

  const recordingDate = getProjectRecordingDate(project);
  if (recordingDate && isSameDay(recordingDate, day)) {
    return 'grabacion';
  }
  if (stage === 'grabacion' || !stage) {
    if (isStartDay) {
      return 'grabacion';
    }
  }
  if (isDeadlineDay) {
    return 'entrega';
  }
  if (isEndDay) {
    return 'entrega';
  }
  return 'duracion';
};

const getProjectEventLabel = (type) => {
  if (type === 'grabacion') return 'Grabación';
  if (type === 'entrega') return 'Entrega';
  if (type === 'revision') return 'En revisión';
  if (type === 'correccion') return 'Corrección';
  return 'Edición';
};

const VistaCalendario = () => {
  const projects = useStore((state) => state.projects);
  const searchTerm = useStore((state) => state.searchTerm);
  const openModal = useStore((state) => state.openModal);
  const teamMembers = useStore((state) => state.teamMembers);
  const editingTasks = useStore((state) => state.editingTasks);
  const revisionCycles = useStore((state) => state.revisionCycles);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [primaryView, setPrimaryView] = useState(() => getStoredCalendarPrimaryView());
  const [selectedMember, setSelectedMember] = useState(() => getStoredCalendarMember());
  const [selectedDayKey, setSelectedDayKey] = useState(null);

  useEffect(() => {
    setUIPreference('calendarPrimaryView', primaryView);
  }, [primaryView]);

  useEffect(() => {
    setUIPreference('calendarSelectedMember', selectedMember);
  }, [selectedMember]);

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

  const activeProjects = useMemo(() => {
    return projects.filter((project) => (project?.status || '').toString().trim().toLowerCase() !== 'completado');
  }, [projects]);

  const filteredProjects = useMemo(
    () => filterProjects(activeProjects, searchTerm),
    [activeProjects, searchTerm]
  );

  const processedProjects = useMemo(
    () =>
      filteredProjects.map((project) => {
        let range = getCalendarRange(project);
        const memberName = ensureMemberName(project.manager);

        // If the project is in editing stage and has no deadline and is not completed,
        // show it in the calendar as an 'edicion' in progress. Use startDate or today as the date.
        const stage = (project.stage || project.properties?.stage || '').toString().trim().toLowerCase();
        const isCompleted = (project.status || '').toString().trim().toLowerCase() === 'completado';
        if (!range && stage === 'edicion' && !project.deadline && !isCompleted) {
          const start = getProjectRecordingDate(project) || parseDate(project.startDate) || startOfDay(new Date());
          range = { start, end: start };
        }

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

  const revisionCycleItems = useMemo(() => {
    if (!revisionCycles || Object.keys(revisionCycles).length === 0) return [];

    const projectLookup = new Map();
    visibleProjects.forEach(({ project, memberName }) => {
      if (project?.id) {
        projectLookup.set(project.id, { project, memberName });
      }
    });

    const items = [];

    Object.entries(revisionCycles || {}).forEach(([projectId, cycles]) => {
      const context = projectLookup.get(projectId);
      if (!context) return;
      const { project, memberName } = context;
      const list = Array.isArray(cycles) ? cycles : [];

      list.forEach((cycle) => {
        const pushEvent = (eventType, value) => {
          if (!value) return;
          const timestamp = parseDateTime(value);
          if (!timestamp) return;
          const dayStart = startOfDay(timestamp);
          if (selectedMember !== 'Todos' && memberName !== selectedMember) return;
          items.push({
            type: 'revision_event',
            eventType,
            cycle,
            project,
            timestamp,
            range: { start: dayStart, end: dayStart },
            memberName,
          });
        };

        pushEvent('sent', cycle.sent_at);
        pushEvent('feedback', cycle.client_returned_at);
      });
    });

    return items;
  }, [revisionCycles, visibleProjects, selectedMember]);
  const scheduledProjects = useMemo(
    () => visibleProjects.filter((item) => item.range),
    [visibleProjects]
  );

  const unscheduledProjects = useMemo(
    () => visibleProjects.filter((item) => !item.range),
    [visibleProjects]
  );

  const scheduledItems = useMemo(
    () => [...scheduledProjects, ...visibleEditingTaskItems, ...revisionCycleItems],
    [scheduledProjects, visibleEditingTaskItems, revisionCycleItems]
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

  const buildEventSummary = useCallback((item, dayDate) => {
    if (!dayDate) return null;

    if (item.type === 'task') {
      const { task, project, range, memberName } = item;
      const startLabel = format(range.start, 'HH:mm');
      const endLabel = format(range.end, 'HH:mm');
      const managersLabel = project?.managers?.length
        ? project.managers.join(', ')
        : memberName;

      return {
        id: `task-${task.id}-${dayDate.toISOString()}`,
        sortTime: range.start.getTime(),
        type: 'edicion',
        title: `Edición de ${task.projectName || project?.name || 'proyecto'}`,
        description: task.descripcion,
        eventLabel: 'Edición',
        timeLabel: `${startLabel} - ${endLabel}`,
        manager: managersLabel,
        colorClass: EDITING_TASK_PILL,
        project,
        client: project?.client || '',
        status: project?.status || '',
        typeMeta: getProjectTypeBadge(project),
        date: dayDate,
      };
    }

    if (item.type === 'revision_event') {
      const { project, cycle, eventType, timestamp, memberName } = item;
      const eventLabel = eventType === 'feedback' ? 'Feedback recibido' : 'Versión enviada';
      const baseDate = timestamp ? new Date(timestamp) : new Date(dayDate);
      const sortedDate = new Date(baseDate);
      if (eventType === 'feedback') {
        sortedDate.setHours(17, 0, 0, 0);
      } else {
        sortedDate.setHours(9, 0, 0, 0);
      }
      const managersLabel = project?.managers?.length
        ? project.managers.join(', ')
        : ensureMemberName(project?.manager) || memberName;

      return {
        id: `${project?.id || cycle.id}-revision-${eventType}-${dayDate.toISOString()}`,
        sortTime: sortedDate.getTime(),
        type: `revision_${eventType}`,
        title: project?.name || `Proyecto ciclo ${cycle.number}`,
        description: cycle.notes || project?.description || '',
        eventLabel,
        timeLabel: `Ciclo ${cycle.number}`,
        manager: managersLabel,
        colorClass: REVISION_EVENT_PILLS[eventType] || PROJECT_EVENT_PILLS.edicion,
        project,
        client: project?.client || '',
        status: project?.status || '',
        typeMeta: getProjectTypeBadge(project),
        date: dayDate,
        cycle,
      };
    }

    const { project, range, memberName } = item;
    if (!project || !range) return null;
    const eventType = getProjectEventTypeForDay(project, range, dayDate);
    const eventLabel = getProjectEventLabel(eventType);
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

    const managersLabel = project.managers?.length
      ? project.managers.join(', ')
      : memberName;

    return {
      id: project.id ? `${project.id}-${eventType}-${dayDate.toISOString()}` : `${project.name}-${eventType}-${dayDate.toISOString()}`,
      sortTime: slot.getTime(),
      type: eventType,
      title: project.name,
      description: project.description,
      eventLabel,
      timeLabel: scheduleLabel,
      manager: managersLabel,
      colorClass: PROJECT_EVENT_PILLS[eventType] || PROJECT_EVENT_PILLS.duracion,
      project,
      client: project.client,
      status: project.status,
      typeMeta: getProjectTypeBadge(project),
      date: dayDate,
    };
  }, []);

  const selectedDayDetails = useMemo(() => {
    if (!selectedDayKey) return [];
    const items = calendarItemsByDay.get(selectedDayKey);
    if (!items || items.length === 0) return [];
    const dayDate = selectedDayDate;
    return items
      .map((item) => buildEventSummary(item, dayDate))
      .filter(Boolean)
      .sort((a, b) => a.sortTime - b.sortTime);
  }, [calendarItemsByDay, selectedDayKey, selectedDayDate, buildEventSummary]);

  const mobileEvents = useMemo(() => {
    const events = [];
    calendarItemsByDay.forEach((items, key) => {
      const dayDate = parseISO(key);
      if (!isSameMonth(dayDate, currentMonth)) return;
      items.forEach((item) => {
        const detail = buildEventSummary(item, dayDate);
        if (detail) {
          events.push(detail);
        }
      });
    });
    return events.sort((a, b) => a.sortTime - b.sortTime);
  }, [calendarItemsByDay, currentMonth, buildEventSummary]);

  return (
    <div className="space-y-6 px-3 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="text-accent" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-primary">
              {primaryView === 'timeline' ? 'Timeline de disponibilidad' : 'Calendario de Proyectos'}
            </h2>
            <p className="text-secondary text-sm">
              {primaryView === 'timeline'
                ? 'Explora grabaciones y ediciones programadas en formato de línea de tiempo.'
                : 'Visualiza entregas y responsabilidades por integrante.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F7F8FA] p-1">
          <button
            type="button"
            onClick={() => setPrimaryView('calendar')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              primaryView === 'calendar'
                ? 'bg-emerald-500/20 text-primary shadow-[inset_0_1px_0_rgba(34,197,94,0.35)]'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Calendario
          </button>
          <button
            type="button"
            onClick={() => setPrimaryView('timeline')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              primaryView === 'timeline'
                ? 'bg-emerald-500/20 text-primary shadow-[inset_0_1px_0_rgba(34,197,94,0.35)]'
                : 'text-secondary hover:text-primary'
            }`}
          >
            Timeline
          </button>
        </div>
      </div>

      {primaryView === 'calendar' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
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
          <div className="flex flex-wrap gap-2">
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
                      : 'border-border bg-[#F7F8FA] text-secondary hover:border-accent/40 hover:text-primary'
                  }`}>
                  {option === 'Todos' ? 'Todos los responsables' : option}
                </button>
              );
            })}
          </div>

        <div className="sm:hidden">
        {mobileEvents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#E5E7EB] bg-white p-4 text-center text-sm text-secondary">
            No hay actividades programadas este mes.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {mobileEvents.map((event) => (
              <div
                key={`${event.id}-${event.sortTime}`}
                className="space-y-3 rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
              >
                <p className="text-sm font-medium uppercase tracking-wide text-secondary/70">
                  {format(event.date, "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-primary">{event.title}</h3>
                  {event.typeMeta && (
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${event.typeMeta.className}`}
                    >
                      {event.typeMeta.label}
                    </span>
                  )}
                </div>
                {event.eventLabel && (
                  <span className="inline-block rounded-full border border-[#E5E7EB] px-3 py-1 text-xs uppercase tracking-wide text-secondary">
                    {event.eventLabel}
                  </span>
                )}
                <div className="space-y-2 text-sm text-secondary">
                  {event.timeLabel && (
                    <p>
                      <span className="text-secondary/70">Horario: </span>
                      <span className="text-primary">{event.timeLabel}</span>
                    </p>
                  )}
                  {event.manager && (
                    <p>
                      <span className="text-secondary/70">Responsable: </span>
                      <span className="text-primary">{event.manager}</span>
                    </p>
                  )}
                  {event.status && (
                    <p>
                      <span className="text-secondary/70">Estado: </span>
                      <span className="text-primary">{event.status}</span>
                    </p>
                  )}
                  {event.client && (
                    <p>
                      <span className="text-secondary/70">Cliente: </span>
                      <span className="text-primary">{event.client}</span>
                    </p>
                  )}
                  {event.description && (
                    <p className="text-secondary/80">{event.description}</p>
                  )}
                </div>
                {event.project && (
                  <button
                    type="button"
                    onClick={() => openModal(event.project)}
                    className="w-full rounded-2xl border border-accent/60 px-4 py-3 text-sm font-semibold text-accent transition hover:border-accent/80 hover:text-accent"
                  >
                    Ver proyecto
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        </div>

        <div className="hidden grid-cols-7 gap-px overflow-hidden rounded-2xl border border-border bg-border/40 sm:grid">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="bg-white px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-secondary">
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
              className={`min-h-[110px] cursor-pointer bg-white p-2 shadow-[0_12px_24px_rgba(15,23,42,0.05)] transition-all duration-200 ease-[var(--ease-ios-out)] ${
                isCurrentMonth ? 'text-primary' : 'text-secondary/60'
              } ${
                isToday
                  ? 'border border-accent/60 bg-accent/10 shadow-[0_18px_40px_rgba(34,197,94,0.3)]'
                  : 'border border-[#E5E7EB] hover:border-accent/60 hover:bg-white hover:shadow-[0_12px_30px_rgba(2,6,23,0.55)]'
              } ${isSelected ? 'ring-2 ring-accent/60' : ''}`}>
              <div className="flex items-center justify-between text-xs">
                <span className={`text-sm font-semibold ${isCurrentMonth ? 'text-primary' : ''}`}>
                  {format(day, 'd', { locale: es })}
                </span>
                {dayItems.length > 0 && (
                  <span className="rounded-full bg-[#F7F8FA] px-2 py-0.5 text-[10px] text-secondary">
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
                    const typeMeta = getProjectTypeBadge(project);

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
                          <div className="min-w-0">
                            <span className="truncate font-semibold">{title}</span>
                            {typeMeta && (
                              <span
                                className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${typeMeta.className}`}
                              >
                                {typeMeta.label}
                              </span>
                            )}
                          </div>
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

                  if (item.type === 'revision_event') {
                    const { project, eventType, cycle } = item;
                    const pillClass = REVISION_EVENT_PILLS[eventType] || PROJECT_EVENT_PILLS.revision;
                    const title = project?.name || `Proyecto ciclo ${cycle?.number || ''}`;
                    const label = eventType === 'feedback' ? 'Feedback recibido' : 'Versión enviada';
                    return (
                      <button
                        key={`${project?.id || cycle?.id}-${eventType}-${day.toISOString()}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (project) {
                            openModal(project);
                          }
                        }}
                        className={`group rounded-md border px-2 py-1 text-left text-xs shadow-sm transition-all duration-200 ease-[var(--ease-ios-out)] hover:shadow-lg hover:-translate-y-0.5 ${pillClass}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="truncate font-semibold">{title}</span>
                            <span className="mt-1 block text-[10px] uppercase tracking-wide opacity-70">
                              {label}
                            </span>
                          </div>
                          <span className="whitespace-nowrap text-[10px] opacity-75">
                            Ciclo {cycle?.number || '—'}
                          </span>
                        </div>
                      </button>
                    );
                  }

                  const { project } = item;
                  const eventType = getProjectEventTypeForDay(project, range, day);
                  const pillClass = PROJECT_EVENT_PILLS[eventType] || PROJECT_EVENT_PILLS.duracion;
                  const eventLabel = getProjectEventLabel(eventType);
                  const typeMeta = getProjectTypeBadge(project);

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
                        <div className="min-w-0">
                          <span className="truncate font-semibold">{project.name}</span>
                          {typeMeta && (
                            <span
                              className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${typeMeta.className}`}
                            >
                              {typeMeta.label}
                            </span>
                          )}
                        </div>
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
                  <div className="rounded-md bg-[#F7F8FA] px-2 py-1 text-[10px] text-secondary">
                    +{extraItems} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>

        {selectedDayDate && (
        <div className="mt-6 rounded-3xl border border-[#E5E7EB] bg-white p-6">
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
              className="rounded-full border border-[#E5E7EB] px-3 py-1 text-xs text-secondary transition hover:border-accent/70 hover:text-accent">
              Cerrar
            </button>
          </div>

          {selectedDayDetails.length === 0 ? (
            <p className="mt-4 text-sm text-secondary">Sin eventos para este día.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {selectedDayDetails.map((item) => (
                <div
                  key={`${item.id}-${item.sortTime}`}
                  className="rounded-2xl border border-[#E5E7EB] bg-white p-4 transition hover:border-accent/60 hover:bg-[#F1F5F9]">
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
                      {item.typeMeta && (
                        <span
                          className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${item.typeMeta.className}`}
                        >
                          {item.typeMeta.label}
                        </span>
                      )}
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
                      <div className="flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F7F8FA] px-3 py-1.5">
                        <span className="text-[10px] uppercase tracking-wide text-secondary/70">Cliente</span>
                        <span className={getClientDetailBadgeClass(item.client)}>{item.client}</span>
                      </div>
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
                        className="w-full rounded-2xl border border-accent/60 px-4 py-3 text-sm font-semibold text-accent transition hover:border-accent/80 hover:text-accent sm:w-auto sm:rounded-full sm:px-3 sm:py-1 sm:text-xs">
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
        <div className="mt-6 rounded-xl border border-dashed border-[#E5E7EB] bg-[#F7F8FA] p-4 text-sm text-secondary">
          <p className="font-semibold text-primary">
            Proyectos sin fechas asignadas ({unscheduledProjects.length}):
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {unscheduledProjects.map(({ project }) => (
              <button
                key={project.id}
                type="button"
                onClick={() => openModal(project)}
                className="rounded-full border border-[#E5E7EB] px-3 py-1 text-xs text-secondary transition hover:border-accent/60 hover:text-accent">
                {project.name}
              </button>
            ))}
          </div>
        </div>
      )}
        </>
      ) : (
        <VistaTimeline />
      )}
    </div>
  );
};

export default VistaCalendario;
