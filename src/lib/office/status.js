// Estado de cada integrante en la oficina: sale de la agenda (proyectos) y,
// si la persona eligió uno a mano, de esa elección hasta que termine el día.
// Sin dependencias del navegador, para probarlo en Node.
import { format } from 'date-fns';
import { ensureMemberName } from '../../constants/team';
import { isAbsenceProject } from '../../utils/absences';
import { extractProjectInfo, getProjectBlockingDays, getProjectManagers } from '../../utils/dashboardHelpers';

// Sin hora de fin, un rodaje dura esto desde la hora de inicio.
export const DEFAULT_RECORDING_HOURS = 4;

// `mutesMic`: al pasar a este estado, la sala de voz te silencia.
export const STATUS_KINDS = {
  disponible: { label: 'Disponible', dot: 'bg-green-500', mutesMic: false },
  editando: { label: 'Editando', dot: 'bg-violet-500', mutesMic: false },
  grabacion: { label: 'En grabación', dot: 'bg-sky-500', mutesMic: true },
  ocupado: { label: 'Ocupado', dot: 'bg-amber-500', mutesMic: true },
  fuera: { label: 'Fuera', dot: 'bg-slate-400', mutesMic: false },
};

// Lo que se puede elegir a mano (además de "Automático").
export const MANUAL_STATUS_OPTIONS = ['disponible', 'ocupado', 'grabacion', 'fuera'];

export const dayKey = (date) => format(date, 'yyyy-MM-dd');

const toMinutes = (time) => {
  const match = /^(\d{1,2}):(\d{2})/.exec((time || '').toString().trim());
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes >= 0 && minutes < 24 * 60 ? minutes : null;
};

export const formatHour = (minutes) =>
  `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

// Ventana del rodaje en minutos del día. Sin hora de inicio no sabemos cuándo
// es, así que cuenta todo el día.
export const getRecordingWindow = (project) => {
  const start = toMinutes(project?.recordingTime || project?.properties?.recordingTime);
  if (start === null) return { start: null, end: null, allDay: true };
  let end = toMinutes(project?.recordingEndTime || project?.properties?.recordingEndTime);
  if (end === null || end <= start) end = Math.min(start + DEFAULT_RECORDING_HOURS * 60, 24 * 60);
  return { start, end, allDay: false };
};

const getLocation = (project) =>
  (project?.recordingLocation || project?.properties?.recordingLocation || '').toString().trim();

const joinParts = (parts) => parts.filter(Boolean).join(' · ');

// "En rodaje · Proyecto · Lugar desde 9:00"
const buildRecordingLine = (shoot) => {
  const when = shoot.allDay ? 'todo el día' : `desde ${formatHour(shoot.start)}`;
  const location = getLocation(shoot.project);
  return joinParts(['En rodaje', shoot.project.name, location ? `${location} ${when}` : when]);
};

// "Rodaje a las 15:00 · Proyecto · Lugar"
const buildUpcomingLine = (shoot) =>
  joinParts([`Rodaje a las ${formatHour(shoot.start)}`, shoot.project.name, getLocation(shoot.project)]);

const isMine = (project, member) =>
  getProjectManagers(project).some((manager) => ensureMemberName(manager) === member);

const deadlineValue = (project) => {
  const time = project?.deadline ? Date.parse(project.deadline) : NaN;
  return Number.isNaN(time) ? Infinity : time;
};

// Estado según la agenda, recalculado en cada llamada (la vista lo pide cada
// minuto). Orden: ausencia → rodaje en curso → edición → disponible.
export const getMemberAgenda = (projects = [], member, now = new Date()) => {
  if (!member) return null;
  const todayKey = dayKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const mine = projects.filter((project) => isMine(project, member));
  const isToday = (project) => getProjectBlockingDays(project).some((day) => dayKey(day) === todayKey);

  const absence = mine.find((project) => isAbsenceProject(project) && isToday(project));
  if (absence) {
    return { kind: 'fuera', line: joinParts(['Fuera', absence.name || 'Ausencia']), project: absence, next: null };
  }

  const shoots = mine
    .filter((project) => !isAbsenceProject(project) && isToday(project))
    .map((project) => ({ project, ...getRecordingWindow(project) }))
    .sort((a, b) => (a.start ?? -1) - (b.start ?? -1));

  const current = shoots.find((shoot) => shoot.allDay || (nowMinutes >= shoot.start && nowMinutes < shoot.end));
  if (current) {
    return { kind: 'grabacion', line: buildRecordingLine(current), project: current.project, next: null };
  }

  const upcoming = shoots.find((shoot) => !shoot.allDay && nowMinutes < shoot.start);
  const next = upcoming ? { line: buildUpcomingLine(upcoming), project: upcoming.project } : null;

  const editing = mine
    .filter((project) => {
      if (isAbsenceProject(project)) return false;
      const info = extractProjectInfo(project);
      return !info.isCompleted && info.stage === 'edicion';
    })
    .sort((a, b) => deadlineValue(a) - deadlineValue(b));
  if (editing.length > 0) {
    return { kind: 'editando', line: joinParts(['Editando', editing[0].name]), project: editing[0], next };
  }

  return { kind: 'disponible', line: 'Disponible', project: null, next };
};

// El estado elegido a mano vale solo el día en que se eligió.
export const isManualActive = (manual, now = new Date()) =>
  Boolean(manual?.value && STATUS_KINDS[manual.value] && manual.date === dayKey(now));

export const resolveStatus = ({ agenda, manual, now = new Date() }) => {
  if (isManualActive(manual, now)) {
    return { kind: manual.value, line: STATUS_KINDS[manual.value].label, manual: true, agenda };
  }
  if (!agenda) return { kind: 'disponible', line: 'Disponible', manual: false, agenda: null };
  return { ...agenda, manual: false, agenda };
};

export const statusMutesMic = (kind) => Boolean(STATUS_KINDS[kind]?.mutesMic);
