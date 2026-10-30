import { format, startOfDay } from 'date-fns';
import { ensureMemberName } from '../constants/team';
import { isAbsenceProject } from './absences';
import { getProjectBlockingDays, getProjectManagers, sanitizeRecordingDates } from './dashboardHelpers';

const dayKey = (date) => format(date, 'yyyy-MM-dd');

const getMembers = (project) =>
  Array.from(
    new Set(
      getProjectManagers(project)
        .map((manager) => ensureMemberName(manager))
        .filter((manager) => manager && manager !== 'Sin asignar')
    )
  );

// Índice persona → día → compromisos (rodajes y ausencias).
export const buildScheduleIndex = (projects = []) => {
  const index = new Map();
  projects.forEach((project) => {
    const days = getProjectBlockingDays(project);
    if (days.length === 0) return;
    const kind = isAbsenceProject(project) ? 'absence' : 'recording';
    getMembers(project).forEach((member) => {
      if (!index.has(member)) index.set(member, new Map());
      const byDay = index.get(member);
      days.forEach((day) => {
        const key = dayKey(day);
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push({ project, kind });
      });
    });
  });
  return index;
};

// Compromisos de una persona en ciertos días, sin contar el propio proyecto.
export const getMemberCommitments = (index, member, dayKeys, excludeProjectId) => {
  const byDay = index.get(ensureMemberName(member));
  if (!byDay) return [];
  const results = [];
  dayKeys.forEach((key) => {
    (byDay.get(key) || []).forEach((entry) => {
      if (excludeProjectId && entry.project.id === excludeProjectId) return;
      results.push({ day: key, ...entry });
    });
  });
  return results;
};

// Cruces del proyecto que se está editando: cada responsable × cada día de
// rodaje (o de ausencia) que ya está ocupado por otro proyecto o ausencia.
export const findProjectConflicts = (draft, projects = []) => {
  if (!draft) return [];
  const draftDays = sanitizeRecordingDates(draft.recordingDates || draft.recordingDate || []);
  const days = draftDays.length > 0 ? draftDays : getProjectBlockingDays(draft).map(dayKey);
  if (days.length === 0) return [];
  const index = buildScheduleIndex(projects);
  return getMembers(draft).flatMap((member) =>
    getMemberCommitments(index, member, days, draft.id).map((entry) => ({ member, ...entry }))
  );
};

// Todos los cruces desde hoy: misma persona con dos compromisos el mismo día.
export const findUpcomingConflicts = (projects = [], today = new Date()) => {
  const todayKey = dayKey(startOfDay(today));
  const index = buildScheduleIndex(projects);
  const conflicts = [];
  index.forEach((byDay, member) => {
    byDay.forEach((entries, key) => {
      if (key < todayKey) return;
      const uniqueProjects = new Map(entries.map((entry) => [entry.project.id || entry.project.name, entry]));
      if (uniqueProjects.size < 2) return;
      conflicts.push({ member, day: key, entries: Array.from(uniqueProjects.values()) });
    });
  });
  return conflicts.sort((a, b) => a.day.localeCompare(b.day) || a.member.localeCompare(b.member, 'es'));
};
