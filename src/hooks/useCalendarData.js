import { useMemo, useCallback } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, startOfDay, isSameMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ensureMemberName } from '../constants/team';
import { filterProjects } from '../utils/filterProjects';
import { 
  computeIsaAverages, 
  buildIsaMilestones, 
  getProjectRecordingDate, 
  applyIsaOverridesToMilestones, 
  getIsaProjectKey 
} from '../utils/isaEstimates';
import { isIsaEligibleProject } from '../utils/calendarHelpers';

const ISA_EVENT_PILLS = {
  isa_first_version: 'border border-dashed border-[#A5B4FC] bg-[#EEF2FF] text-[#4338CA] dark:border-indigo-300/60 dark:bg-indigo-400/15 dark:text-indigo-200',
  isa_review: 'border border-dashed border-[#FCD34D] bg-[#FFF7DB] text-[#B45309] dark:border-amber-300/60 dark:bg-amber-300/15 dark:text-amber-200',
  isa_final_delivery: 'border border-dashed border-[#6EE7B7] bg-[#ECFDF5] text-[#047857] dark:border-emerald-300/60 dark:bg-emerald-300/15 dark:text-emerald-200',
};

const RECORDING_PILL = 'border border-[#C7DAFF] bg-[#E7F1FF] text-[#4C8EF7] dark:border-blue-500/60 dark:bg-blue-500/15 dark:text-blue-300';
const ISA_ESTIMATE_PILL = 'border border-dashed border-[#9CD7FF] bg-[#ECF7FF] text-[#0A5E86] dark:border-cyan-300/60 dark:bg-cyan-500/15 dark:text-cyan-200';

import { format } from 'date-fns';

export const useCalendarData = ({ projects, searchTerm, selectedMember, showIsaEvents, revisionCycles, currentMonth, selectedDayKey }) => {
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
    return projects.filter((project) => (project?.status || '').toString().trim().toLowerCase() !== 'completado');
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
    if (!showIsaEvents || !isaStats?.totalEstimatedDays) return [];
    return visibleProjects.flatMap(({ project, memberName }) => {
      if (!isIsaEligibleProject(project)) return [];
      const projectKey = getIsaProjectKey(project);
      if (!projectKey) return [];
      const milestones = applyIsaOverridesToMilestones(
        project,
        buildIsaMilestones(project, isaStats)
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
  }, [visibleProjects, isaStats, showIsaEvents]);

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
