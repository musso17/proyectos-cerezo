import { useMemo, useCallback } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, startOfDay, isSameMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ensureMemberName } from '../constants/team';
import { filterProjects } from '../utils/filterProjects';
import { getProjectBlockingDays, getProjectRecordingDates } from '../utils/dashboardHelpers';
import { isAbsenceProject } from '../utils/absences';
import { getStatusLabel } from '../utils/statusHelpers';

const RECORDING_PILL = 'border border-[#C7DAFF] bg-[#E7F1FF] text-[#1D4ED8] dark:border-blue-500/60 dark:bg-blue-500/15 dark:text-blue-300';
const ABSENCE_PILL = 'border border-slate-300 bg-slate-100 text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-white/80';

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
    // Emitimos un evento por cada día para que el calendario los pinte todos,
    // adjuntando metadata de "tramo" para dibujar los días consecutivos como
    // una barra continua (ver CalendarGrid).
    return visibleProjects.flatMap(({ project, memberName }) => {
      const isAbsence = isAbsenceProject(project);
      const dates = isAbsence ? getProjectBlockingDays(project) : getProjectRecordingDates(project);
      if (!dates.length) return [];
      const totalDays = dates.length;
      const daySet = new Set(dates.map((d) => format(d, 'yyyy-MM-dd')));
      const runStartTime = dates[0].getTime();
      return dates.map((recordingDate, idx) => {
        const prevKey = format(addDays(recordingDate, -1), 'yyyy-MM-dd');
        const nextKey = format(addDays(recordingDate, 1), 'yyyy-MM-dd');
        return {
          type: 'recording_event',
          isAbsence,
          project,
          memberName,
          range: { start: recordingDate, end: recordingDate },
          dayIndex: idx + 1,
          totalDays,
          // ¿el día anterior / siguiente también es día de grabación del mismo proyecto?
          continuesPrev: daySet.has(prevKey),
          continuesNext: daySet.has(nextKey),
          // clave estable para mantener el mismo "carril" vertical a lo largo del tramo
          runStartTime,
        };
      });
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
      const { project, memberName, range, dayIndex, totalDays, isAbsence } = item;
      const managersLabel = project?.managers?.length
        ? project.managers.join(', ')
        : memberName;
      const isMultiDay = totalDays > 1;
      const baseLabel = isAbsence ? 'Ausente' : 'Grabación';
      const dayLabel = isMultiDay ? `${baseLabel} · día ${dayIndex}/${totalDays}` : baseLabel;
      const pill = isAbsence ? ABSENCE_PILL : RECORDING_PILL;
      return {
        id: `recording-${project?.id || project?.name || range.start.toISOString()}-${dayDate.toISOString()}`,
        sortTime: range.start.getTime(),
        type: 'recording_event',
        title: isAbsence ? `No está: ${managersLabel}` : project?.name || 'Grabación',
        description: project?.description || '',
        eventLabel: dayLabel,
        timeLabel: format(range.start, "EEEE d 'de' MMMM", { locale: es }),
        manager: managersLabel,
        colorClass: pill,
        isAbsence,
        project,
        client: isAbsence ? '' : project?.client || '',
        status: isAbsence ? '' : getStatusLabel(project?.status),
        typeMeta: { label: dayLabel, className: pill },
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
