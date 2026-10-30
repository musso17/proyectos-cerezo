import { format, startOfDay } from 'date-fns';
import { ensureMemberName } from '../constants/team';
import { isAbsenceProject } from './absences';
import { extractProjectInfo, getProjectBlockingDays, getProjectManagers } from './dashboardHelpers';

export const AVAILABILITY_OPTIONS = [
  { value: 'Activo - Editando', label: 'Editando', dot: 'bg-green-500' },
  { value: 'En grabación', label: 'En grabación', dot: 'bg-sky-500' },
  { value: 'Ocupado', label: 'Ocupado', dot: 'bg-amber-500' },
  { value: 'Fuera de la oficina', label: 'Fuera', dot: 'bg-slate-400' },
];

// Estado sugerido según la agenda de hoy: ausente → Fuera de la oficina;
// con rodaje hoy → En grabación; si no, Activo - Editando.
export const deriveAvailability = (projects = [], member, today = new Date()) => {
  if (!member) return null;
  const todayKey = format(startOfDay(today), 'yyyy-MM-dd');
  const mine = projects.filter((project) =>
    getProjectManagers(project).some((manager) => ensureMemberName(manager) === member)
  );

  const hasToday = (project) =>
    getProjectBlockingDays(project).some((day) => format(day, 'yyyy-MM-dd') === todayKey);

  if (mine.some((project) => isAbsenceProject(project) && hasToday(project))) return 'Fuera de la oficina';
  if (mine.some((project) => !isAbsenceProject(project) && hasToday(project))) return 'En grabación';
  const isEditing = mine.some((project) => {
    if (isAbsenceProject(project)) return false;
    const info = extractProjectInfo(project);
    return !info.isCompleted && info.stage === 'edicion';
  });
  return isEditing ? 'Activo - Editando' : null;
};
