import { useMemo, useCallback } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, startOfDay, isSameMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ensureMemberName } from '../constants/team';
import { filterProjects } from '../utils/filterProjects';
import { getProjectRecordingDates } from '../utils/dashboardHelpers';

const RECORDING_PILL = 'border border-[#C7DAFF] bg-[#E7F1FF] text-[#4C8EF7] dark:border-blue-500/60 dark:bg-blue-500/15 dark:text-blue-300';

import { format } from 'date-fns';

export const useCalendarData = ({ projects, searchTerm, selectedMember, currentMonth, selectedDayKey }) => {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = [];
    let cursor = gridStart;
    while (cursor <= gridEnd) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [currentMonth]);

  const activeProjects = useMemo(() => {
    return projects;
  }, [projects]);

  const visibleProjects = useMemo(
    () =>
      filterProjects(activeProjects, searchTerm)
        .map((project) => {
          const allManagers = (project.managers || [])
            .map((m) => ensureMemberName(m))
            .filter(Boolean);
          if (allManagers.length === 0) {
            allManagers.push(ensureMemberName(project.manager));
          }
          return { project, memberName: allManagers[0], allManagers };
        })
        .filter((item) =>
          selectedMember === 'Todos'
            ? true
            : item.allManagers.includes(selectedMember)
        ),
    [activeProjects, searchTerm, selectedMember]
  );

  const recordingItems = useMemo(() => {
    // Un proyecto puede tener varios días de grabación (rodajes de varios días).
    // Emitimos un evento por cada día para que el calendario los pinte todos.
    return visibleProjects.flatMap(({ project, memberName }) => {
      const dates = getProjectRecordingDates(project);
      if (!dates.length) return [];
      const totalDays = dates.length;
      return dates.map((recordingDate, idx) => ({
        type: 'recording_event',
        project,
        memberName,
        range: { start: recordingDate, end: recordingDate },
        dayIndex: idx + 1,
        totalDays,
      }));
    });
  }, [visibleProjects]);

  const scheduledItems = useMemo(
    () => [...recordingItems],
    [recordingItems]
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

  const buildEventSummary = useCallback((item, dayDate) => {
    if (!dayDate) return null;

    if (item.type === 'recording_event') {
      const { project, memberName, range, dayIndex, totalDays } = item;
      const managersLabel = project?.managers?.length
        ? project.managers.join(', ')
        : memberName;
      const isMultiDay = totalDays > 1;
      const dayLabel = isMultiDay ? `Grabación · día ${dayIndex}/${totalDays}` : 'Grabación';
      return {
        id: `recording-${project?.id || project?.name || range.start.toISOString()}-${dayDate.toISOString()}`,
        sortTime: range.start.getTime(),
        type: 'recording_event',
        title: project?.name || 'Grabación',
        description: project?.description || '',
        eventLabel: dayLabel,
        timeLabel: format(range.start, "EEEE d 'de' MMMM", { locale: es }),
        manager: managersLabel,
        colorClass: RECORDING_PILL,
        project,
        client: project?.client || '',
        status: project?.status || '',
        typeMeta: { label: dayLabel, className: RECORDING_PILL },
        date: dayDate,
      };
    }

    return null;
  }, []);

  const selectedDayDate = useMemo(() => (selectedDayKey ? parseISO(selectedDayKey) : null), [selectedDayKey]);

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

  return {
    calendarDays,
    calendarItemsByDay,
    selectedDayDate,
    selectedDayDetails,
    mobileEvents,
  };
};

export default useCalendarData;
