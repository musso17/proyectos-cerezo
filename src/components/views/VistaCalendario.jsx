"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useStore from '../../hooks/useStore';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ensureMemberName } from '../../constants/team';
import { filterProjects } from '../../utils/filterProjects';
import { getClientStyles } from '../../utils/clientStyles';
import { getUIPreference, setUIPreference } from '../../utils/uiPreferences';
import {
  computeIsaAverages,
  buildIsaMilestones,
  getProjectRecordingDate,
  applyIsaOverridesToMilestones,
  getIsaProjectKey,
  isAllowedIsaMilestoneDay,
} from '../../utils/isaEstimates';
import VistaTimeline from './VistaTimeline';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MAX_ITEMS_PER_DAY = 3;

const ISA_ESTIMATE_PILL =
  'border border-dashed border-[#9CD7FF] bg-[#ECF7FF] text-[#0A5E86] dark:border-cyan-300/60 dark:bg-cyan-500/15 dark:text-cyan-200';
const RECORDING_PILL =
  'border border-[#C7DAFF] bg-[#E7F1FF] text-[#4C8EF7] dark:border-blue-500/60 dark:bg-blue-500/15 dark:text-blue-300';

const ISA_EVENT_PILLS = {
  isa_first_version:
    'border border-dashed border-[#A5B4FC] bg-[#EEF2FF] text-[#4338CA] dark:border-indigo-300/60 dark:bg-indigo-400/15 dark:text-indigo-200',
  isa_review:
    'border border-dashed border-[#FCD34D] bg-[#FFF7DB] text-[#B45309] dark:border-amber-300/60 dark:bg-amber-300/15 dark:text-amber-200',
  isa_final_delivery:
    'border border-dashed border-[#6EE7B7] bg-[#ECFDF5] text-[#047857] dark:border-emerald-300/60 dark:bg-emerald-300/15 dark:text-emerald-200',
};

const CALENDAR_LEGEND = [
  { label: 'Grabación', className: RECORDING_PILL },
  { label: 'ISA · 1ra versión', className: ISA_EVENT_PILLS.isa_first_version },
  { label: 'ISA · Revisión', className: ISA_EVENT_PILLS.isa_review },
  { label: 'ISA · Entrega final', className: ISA_EVENT_PILLS.isa_final_delivery },
];

const ISA_OVERRIDES_PREF_KEY = 'calendarIsaOverrides';
const ISA_DRAG_TYPE = 'application/cerezo-isa';

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

const VistaCalendario = ({ projects: projectsProp }) => {
  const projectsFromStore = useStore((state) => state.projects);
  const projects = projectsProp !== undefined ? projectsProp : projectsFromStore;
  const searchTerm = useStore((state) => state.searchTerm);
  const openModal = useStore((state) => state.openModal);
  const teamMembers = useStore((state) => state.teamMembers);
  const revisionCycles = useStore((state) => state.revisionCycles);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [primaryView, setPrimaryView] = useState(() => getStoredCalendarPrimaryView());
  const [selectedMember, setSelectedMember] = useState(() => getStoredCalendarMember());
  const [selectedDayKey, setSelectedDayKey] = useState(null);
  const [isaOverrides, setIsaOverrides] = useState(() => {
    const stored = getUIPreference(ISA_OVERRIDES_PREF_KEY, {});
    return stored && typeof stored === 'object' ? stored : {};
  });
  const [draggingIsaPayload, setDraggingIsaPayload] = useState(null);
  const isDraggingIsa = Boolean(draggingIsaPayload);

  useEffect(() => {
    setUIPreference('calendarPrimaryView', primaryView);
  }, [primaryView]);

  useEffect(() => {
    setUIPreference('calendarSelectedMember', selectedMember);
  }, [selectedMember]);

  useEffect(() => {
    setUIPreference(ISA_OVERRIDES_PREF_KEY, isaOverrides);
  }, [isaOverrides]);

  const updateIsaOverride = useCallback((projectKey, milestoneType, date) => {
    if (!projectKey || !milestoneType || !date) return;
    const normalizedDate = startOfDay(date);
    setIsaOverrides((prev) => {
      const next = { ...(prev || {}) };
      const projectEntry = { ...(next[projectKey] || {}) };
      projectEntry[milestoneType] = normalizedDate.toISOString();
      next[projectKey] = projectEntry;
      return next;
    });
  }, []);

  const handleIsaDragStart = useCallback((event, payload) => {
    if (!payload?.projectKey || !payload?.milestoneType) return;
    try {
      event.dataTransfer.setData(ISA_DRAG_TYPE, JSON.stringify(payload));
      event.dataTransfer.effectAllowed = 'move';
      setDraggingIsaPayload(payload);
    } catch (error) {
      console.error('No se pudo iniciar el arrastre ISA', error);
    }
  }, []);

  const handleIsaDragEnd = useCallback(() => {
    setDraggingIsaPayload(null);
  }, []);

  const handleDayDragOver = useCallback(
    (day) => (event) => {
      if (!draggingIsaPayload || !event.dataTransfer?.types?.includes(ISA_DRAG_TYPE)) return;
      const allowed = isAllowedIsaMilestoneDay(draggingIsaPayload.milestoneType, day);
      if (!allowed) {
        event.dataTransfer.dropEffect = 'none';
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    },
    [draggingIsaPayload]
  );

  const handleDayDrop = useCallback(
    (day) => (event) => {
      if (!event.dataTransfer?.types?.includes(ISA_DRAG_TYPE)) return;
      event.preventDefault();
      let payload = draggingIsaPayload;
      if (!payload) {
        try {
          const raw = event.dataTransfer.getData(ISA_DRAG_TYPE);
          payload = raw ? JSON.parse(raw) : null;
        } catch {
          payload = null;
        }
      }
      if (!payload?.projectKey || !payload?.milestoneType) {
        setDraggingIsaPayload(null);
        return;
      }
      if (!isAllowedIsaMilestoneDay(payload.milestoneType, day)) {
        setDraggingIsaPayload(null);
        return;
      }
      updateIsaOverride(payload.projectKey, payload.milestoneType, day);
      setDraggingIsaPayload(null);
    },
    [draggingIsaPayload, updateIsaOverride]
  );

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

  const visibleProjects = useMemo(
    () =>
      filterProjects(activeProjects, searchTerm)
        .map((project) => ({
          project,
          memberName: ensureMemberName(project.manager),
        }))
        .filter((item) => (selectedMember === 'Todos' ? true : item.memberName === selectedMember)),
    [activeProjects, searchTerm, selectedMember]
  );

  const recordingItems = useMemo(() => {
    return visibleProjects
      .map(({ project, memberName }) => {
        const recordingDate = getProjectRecordingDate(project);
        if (!recordingDate) return null;
        return {
          type: 'recording_event',
          project,
          memberName,
          range: { start: recordingDate, end: recordingDate },
        };
      })
      .filter(Boolean);
  }, [visibleProjects]);

  const isaStats = useMemo(() => computeIsaAverages(revisionCycles), [revisionCycles]);

  const isaEstimatedItems = useMemo(() => {
    if (!isaStats?.totalEstimatedDays) return [];
    return visibleProjects.flatMap(({ project, memberName }) => {
      const stage = (project.stage || project.properties?.stage || '').toString().trim().toLowerCase();
      if (stage !== 'grabacion') return [];
      const projectKey = getIsaProjectKey(project);
      if (!projectKey) return [];
      const milestones = applyIsaOverridesToMilestones(
        project,
        buildIsaMilestones(project, isaStats),
        isaOverrides
      );
      return milestones.map((milestone) => ({
        type: 'isa_estimate',
        milestoneType: milestone.key,
        project,
        memberName,
        range: { start: milestone.date, end: milestone.date },
        isaMeta: {
          ...isaStats,
          milestoneLabel: milestone.label,
          milestoneDescription: milestone.description,
        },
        projectKey,
      }));
    });
  }, [visibleProjects, isaStats, isaOverrides]);
  const scheduledItems = useMemo(
    () => [...recordingItems, ...isaEstimatedItems],
    [recordingItems, isaEstimatedItems]
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

    if (item.type === 'recording_event') {
      const { project, memberName, range } = item;
      const managersLabel = project?.managers?.length
        ? project.managers.join(', ')
        : memberName;
      return {
        id: `recording-${project?.id || project?.name || range.start.toISOString()}-${dayDate.toISOString()}`,
        sortTime: range.start.getTime(),
        type: 'recording_event',
        title: project?.name || 'Grabación',
        description: project?.description || '',
        eventLabel: 'Grabación',
        timeLabel: format(range.start, "EEEE d 'de' MMMM", { locale: es }),
        manager: managersLabel,
        colorClass: RECORDING_PILL,
        project,
        client: project?.client || '',
        status: project?.status || '',
        typeMeta: { label: 'Grabación', className: RECORDING_PILL },
        date: dayDate,
      };
    }

    if (item.type === 'isa_estimate') {
      const { project, range, memberName, isaMeta, milestoneType } = item;
      const managersLabel = project?.managers?.length
        ? project.managers.join(', ')
        : memberName;
      const eventLabel = isaMeta?.milestoneLabel || 'Estimación ISA';
      const description =
        isaMeta?.milestoneDescription ||
        'Estimación generada automáticamente a partir del histórico de ciclos.';
      const pillClass = ISA_EVENT_PILLS[milestoneType] || ISA_ESTIMATE_PILL;

      return {
        id: `isa-${milestoneType}-${project?.id || project?.name || range.start.toISOString()}-${dayDate.toISOString()}`,
        sortTime: range.start.getTime(),
        type: 'isa_estimate',
        title: project?.name || 'Proyecto sin título',
        description,
        eventLabel,
        timeLabel: format(range.start, "EEEE d 'de' MMMM", { locale: es }),
        manager: managersLabel,
        colorClass: pillClass,
        project,
        client: project?.client || '',
        status: project?.status || '',
        typeMeta: { label: eventLabel, className: pillClass },
        date: dayDate,
        isaMeta,
        milestoneType,
        projectKey: item.projectKey || getIsaProjectKey(project),
      };
    }

    return null;
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
            <h2 className="text-2xl font-bold text-primary dark:text-white/90">
              {primaryView === 'timeline' ? 'Timeline de disponibilidad' : 'Calendario de Proyectos'}
            </h2>
            <p className="text-secondary text-sm dark:text-white/60">
              {primaryView === 'timeline'
                ? 'Explora grabaciones y ediciones programadas en formato de línea de tiempo.'
                : 'Visualiza entregas y responsabilidades por integrante.'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {CALENDAR_LEGEND.map((item) => (
                <span
                  key={item.label}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${item.className}`}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F7F8FA] p-1 dark:border-[#2B2D31] dark:bg-[#1B1C20]">
          <button
            type="button"
            onClick={() => setPrimaryView('calendar')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              primaryView === 'calendar'
                ? 'bg-emerald-500/20 text-primary shadow-[inset_0_1px_0_rgba(34,197,94,0.35)] dark:bg-emerald-500/15 dark:text-white/85'
                : 'text-secondary hover:text-primary dark:text-white/60 dark:hover:text-white'
            }`}
          >
            Calendario
          </button>
          <button
            type="button"
            onClick={() => setPrimaryView('timeline')}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              primaryView === 'timeline'
                ? 'bg-emerald-500/20 text-primary shadow-[inset_0_1px_0_rgba(34,197,94,0.35)] dark:bg-emerald-500/15 dark:text-white/85'
                : 'text-secondary hover:text-primary dark:text-white/60 dark:hover:text-white'
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
                      ? 'border-accent bg-accent/20 text-primary dark:border-purple-400 dark:bg-purple-500/20 dark:text-white'
                      : 'border-border bg-[#F7F8FA] text-secondary hover:border-accent/40 hover:text-primary dark:border-[#2B2D31] dark:bg-[#1E1F23] dark:text-white/60 dark:hover:border-purple-400/60 dark:hover:text-white'
                  }`}>
                  {option === 'Todos' ? 'Todos los responsables' : option}
                </button>
              );
            })}
          </div>

        <div className="sm:hidden">
        {mobileEvents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#E5E7EB] bg-white p-4 text-center text-sm text-secondary dark:border-[#2B2D31] dark:bg-[#1E1F23] dark:text-white/60">
            No hay actividades programadas este mes.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {mobileEvents.map((event) => (
              <div
                key={`${event.id}-${event.sortTime}`}
                className="space-y-3 rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:border-[#2B2D31] dark:bg-[#1E1F23] dark:shadow-[0_20px_44px_rgba(0,0,0,0.45)]"
                draggable={event.type === 'isa_estimate'}
                onDragStart={(ev) => {
                  if (event.type === 'isa_estimate') {
                    handleIsaDragStart(ev, {
                      projectKey: event.projectKey,
                      milestoneType: event.milestoneType,
                    });
                  }
                }}
                onDragEnd={event.type === 'isa_estimate' ? handleIsaDragEnd : undefined}
              >
                <p className="text-sm font-medium uppercase tracking-wide text-secondary/70 dark:text-white/50">
                  {format(event.date, "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-primary dark:text-white/90">{event.title}</h3>
                  {event.typeMeta && (
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${event.typeMeta.className}`}
                    >
                      {event.typeMeta.label}
                    </span>
                  )}
                </div>
                {event.eventLabel && (
                  <span className="inline-block rounded-full border border-[#E5E7EB] px-3 py-1 text-xs uppercase tracking-wide text-secondary dark:border-[#2B2D31] dark:text-white/60">
                    {event.eventLabel}
                  </span>
                )}
                <div className="space-y-2 text-sm text-secondary dark:text-white/70">
                  {event.timeLabel && (
                    <p>
                      <span className="text-secondary/70 dark:text-white/50">Horario: </span>
                      <span className="text-primary dark:text-white/85">{event.timeLabel}</span>
                    </p>
                  )}
                  {event.manager && (
                    <p>
                      <span className="text-secondary/70 dark:text-white/50">Responsable: </span>
                      <span className="text-primary dark:text-white/85">{event.manager}</span>
                    </p>
                  )}
                  {event.status && (
                    <p>
                      <span className="text-secondary/70 dark:text-white/50">Estado: </span>
                      <span className="text-primary dark:text-white/85">{event.status}</span>
                    </p>
                  )}
                  {event.client && (
                    <p>
                      <span className="text-secondary/70 dark:text-white/50">Cliente: </span>
                      <span className="text-primary dark:text-white/85">{event.client}</span>
                    </p>
                  )}
                  {event.description && (
                    <p className="text-secondary/80 dark:text-white/60">{event.description}</p>
                  )}
                </div>
                {event.project && (
                  <button
                    type="button"
                    onClick={() => openModal(event.project)}
                    className="w-full rounded-2xl border border-accent/60 px-4 py-3 text-sm font-semibold text-accent transition hover:border-accent/80 hover:text-accent dark:border-purple-400/60 dark:text-purple-300 dark:hover:border-purple-300"
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
            className="bg-white px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-secondary dark:bg-[#0F0F11] dark:text-white/60">
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
          const isaDropAllowed = draggingIsaPayload
            ? isAllowedIsaMilestoneDay(draggingIsaPayload.milestoneType, day)
            : true;

          return (
            <div
              key={key}
              onClick={() => handleDaySelect(day)}
              onDragOver={handleDayDragOver(day)}
              onDrop={handleDayDrop(day)}
              className={`min-h-[110px] cursor-pointer bg-white p-2 shadow-[0_12px_24px_rgba(15,23,42,0.05)] transition-all duration-200 ease-[var(--ease-ios-out)] dark:bg-[#0F0F11] dark:shadow-[0_14px_28px_rgba(0,0,0,0.45)] ${
                isCurrentMonth ? 'text-primary dark:text-white/85' : 'text-secondary/60 dark:text-white/40'
              } ${
                isToday
                  ? 'border border-accent/60 bg-accent/10 shadow-[0_18px_40px_rgba(34,197,94,0.3)] dark:border-purple-400/60 dark:bg-purple-500/20 dark:shadow-[0_20px_40px_rgba(128,90,213,0.35)]'
                  : 'border border-[#E5E7EB] hover:border-accent/60 hover:bg-white hover:shadow-[0_12px_30px_rgba(2,6,23,0.55)] dark:border-[#2B2D31] dark:hover:border-purple-300/60 dark:hover:bg-white/10 dark:hover:shadow-[0_16px_30px_rgba(0,0,0,0.45)]'
              } ${isSelected ? 'ring-2 ring-accent/60 dark:ring-purple-400/60' : ''} ${
                isDraggingIsa
                  ? isaDropAllowed
                    ? 'outline outline-1 outline-dashed outline-accent/30 dark:outline-purple-400/40'
                    : 'opacity-50'
                  : ''
              }`}>
              <div className="flex items-center justify-between text-xs">
                <span className={`text-sm font-semibold ${isCurrentMonth ? 'text-primary dark:text-white/85' : ''}`}>
                  {format(day, 'd', { locale: es })}
                </span>
                {dayItems.length > 0 && (
                  <span className="rounded-full bg-[#F7F8FA] px-2 py-0.5 text-[10px] text-secondary dark:bg-[#1B1C20] dark:text-white/60">
                    {dayItems.length}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-col gap-1">
                {visibleItems.map((item) => {
                  if (item.type === 'recording_event') {
                    const { project } = item;
                    const title = project?.name || 'Grabación';
                    return (
                      <button
                        key={`recording-${project?.id || title}-${day.toISOString()}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (project) {
                            openModal(project);
                          }
                        }}
                        className={`group rounded-md border px-2 py-1 text-left text-xs shadow-sm transition-all duration-200 ease-[var(--ease-ios-out)] hover:shadow-lg hover:-translate-y-0.5 ${RECORDING_PILL}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold">{title}</span>
                          <span className="whitespace-nowrap text-[10px] opacity-75">
                            {format(item.range.start, 'dd/MM')}
                          </span>
                        </div>
                      </button>
                    );
                  }

                  if (item.type === 'isa_estimate') {
                    const { project, isaMeta, milestoneType } = item;
                    const title = project?.name || 'Proyecto sin título';
                    const label = isaMeta?.milestoneLabel || 'Estimación ISA';
                    const pillClass = ISA_EVENT_PILLS[milestoneType] || ISA_ESTIMATE_PILL;
                    return (
                      <button
                        key={`isa-${project?.id || title}-${milestoneType}-${day.toISOString()}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (project) {
                            openModal(project);
                          }
                        }}
                        draggable
                        onDragStart={(event) =>
                          handleIsaDragStart(event, {
                            projectKey: item.projectKey,
                            milestoneType: item.milestoneType,
                          })
                        }
                        onDragEnd={handleIsaDragEnd}
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
                            {format(item.range.start, 'dd/MM')}
                          </span>
                        </div>
                      </button>
                    );
                  }

                  return null;
                })}
                {extraItems > 0 && (
                  <div className="rounded-md bg-[#F7F8FA] px-2 py-1 text-[10px] text-secondary dark:bg-[#1B1C20] dark:text-white/60">
                    +{extraItems} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>

        {selectedDayDate && (
        <div className="mt-6 rounded-3xl border border-[#E5E7EB] bg-white p-6 dark:border-[#2B2D31] dark:bg-[#1E1F23]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-primary dark:text-white/90">
                {format(selectedDayDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
              </h3>
              <p className="text-xs text-secondary dark:text-white/60">
                {selectedDayDetails.length} {selectedDayDetails.length === 1 ? 'actividad' : 'actividades'} programadas
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDayKey(null)}
              className="rounded-full border border-[#E5E7EB] px-3 py-1 text-xs text-secondary transition hover:border-accent/70 hover:text-accent dark:border-[#2B2D31] dark:text-white/60 dark:hover:border-purple-400/60 dark:hover:text-white">
              Cerrar
            </button>
          </div>

          {selectedDayDetails.length === 0 ? (
            <p className="mt-4 text-sm text-secondary dark:text-white/60">Sin eventos para este día.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {selectedDayDetails.map((item) => (
                <div
                  key={`${item.id}-${item.sortTime}`}
                  className="rounded-2xl border border-[#E5E7EB] bg-white p-4 transition hover:border-accent/60 hover:bg-[#F1F5F9] dark:border-[#2B2D31] dark:bg-[#0F0F11] dark:hover:border-purple-400/60 dark:hover:bg-white/10"
                  draggable={item.type === 'isa_estimate'}
                  onDragStart={(event) => {
                    if (item.type === 'isa_estimate') {
                      handleIsaDragStart(event, {
                        projectKey: item.projectKey,
                        milestoneType: item.milestoneType,
                      });
                    }
                  }}
                  onDragEnd={item.type === 'isa_estimate' ? handleIsaDragEnd : undefined}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-[200px] max-w-full">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${item.colorClass}`}>
                          {item.eventLabel}
                        </span>
                        {item.timeLabel && (
                          <span className="text-xs text-secondary dark:text-white/60">{item.timeLabel}</span>
                        )}
                      </div>
                      <h4 className="mt-2 text-lg font-semibold text-primary dark:text-white/90">{item.title}</h4>
                      {item.typeMeta && (
                        <span
                          className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${item.typeMeta.className}`}
                        >
                          {item.typeMeta.label}
                        </span>
                      )}
                    </div>
                    <div className="text-right text-xs text-secondary dark:text-white/60">
                      {item.manager && (
                        <p>
                          Responsable:{' '}
                          <span className="text-primary dark:text-white/85">{item.manager}</span>
                        </p>
                      )}
                      {item.status && (
                        <p>
                          Estado:{' '}
                          <span className="text-primary dark:text-white/85">{item.status}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-secondary">
                    {item.client && (
                      <div className="flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F7F8FA] px-3 py-1.5 dark:border-[#2B2D31] dark:bg-[#1B1C20]">
                        <span className="text-[10px] uppercase tracking-wide text-secondary/70 dark:text-white/50">Cliente</span>
                        <span className={getClientDetailBadgeClass(item.client)}>{item.client}</span>
                      </div>
                    )}
                  </div>
                  {item.description && (
                    <p className="mt-3 text-sm text-secondary dark:text-white/70">{item.description}</p>
                  )}
                  {item.project && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => openModal(item.project)}
                        className="w-full rounded-2xl border border-accent/60 px-4 py-3 text-sm font-semibold text-accent transition hover:border-accent/80 hover:text-accent sm:w-auto sm:rounded-full sm:px-3 sm:py-1 sm:text-xs dark:border-purple-400/60 dark:text-purple-300 dark:hover:border-purple-300"
                      >
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

        </>
      ) : (
        <VistaTimeline isaOverrides={isaOverrides} />
      )}
    </div>
  );
};

export default VistaCalendario;
