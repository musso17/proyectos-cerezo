import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { normalizeString } from './normalize';
import { isAbsenceProject } from './absences';
import { getClientKey } from './clients';
import { TEAM_MEMBERS, ensureMemberName } from '../constants/team';

// Rango de años razonable: evita guardar/mostrar fechas como 10/10/0002
// cuando el año se tipea a medias en un <input type="date">.
export const MIN_PLAUSIBLE_YEAR = 2000;
export const MAX_PLAUSIBLE_YEAR = 2100;

export const isPlausibleDate = (date) => {
  if (!(date instanceof Date) || !isValid(date)) return false;
  const year = date.getFullYear();
  return year >= MIN_PLAUSIBLE_YEAR && year <= MAX_PLAUSIBLE_YEAR;
};

export const buildLabel = (value, fallback) => {
  if (!value && value !== 0) return fallback;
  const text = value.toString().trim();
  if (text.length === 0) return fallback;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const parseProjectDate = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return isPlausibleDate(value) ? value : null;
  }

  const text = value.toString().trim();
  if (text.length === 0) return null;

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text;
  const parsedISO = parseISO(normalized);
  if (isValid(parsedISO)) return isPlausibleDate(parsedISO) ? parsedISO : null;

  const timestamp = Date.parse(text);
  if (!Number.isNaN(timestamp)) {
    const parsed = new Date(timestamp);
    return isPlausibleDate(parsed) ? parsed : null;
  }

  return null;
};

export const getProjectManagers = (project) => {
  if (Array.isArray(project.managers)) {
    return project.managers
      .map((manager) => manager && manager.toString().trim())
      .filter(Boolean);
  }

  if (!project.manager && !project.encargado && !project.properties?.managers) {
    return [];
  }

  const rawManagers =
    project.manager || project.encargado || project.properties?.managers || '';

  if (Array.isArray(rawManagers)) {
    return rawManagers
      .map((manager) => manager && manager.toString().trim())
      .filter(Boolean);
  }

  return rawManagers
    .toString()
    .split(',')
    .map((manager) => manager.trim())
    .filter(Boolean);
};

export const getProjectRecordingDate = (project) => {
  if (!project) return null;
  const candidates = [
    project.fechaGrabacion,
    project.fecha_grabacion,
    project.fechaGrabación,
    project.recordingDate,
    project.recording_date,
    project.properties?.fechaGrabacion,
    project.properties?.fecha_grabacion,
    project.properties?.recordingDate,
  ];
  for (const candidate of candidates) {
    const parsed = parseProjectDate(candidate);
    if (parsed) return parsed;
  }
  return null;
};

// Normaliza una lista (o valor suelto) de fechas de grabación a strings
// "yyyy-MM-dd" únicos y ordenados ascendentemente. Acepta arreglos, strings
// separados por coma o un único valor. Descarta años fuera de rango.
export const sanitizeRecordingDates = (value) => {
  let raw = [];
  if (Array.isArray(value)) raw = value;
  else if (typeof value === 'string') raw = value.split(',');
  else if (value != null) raw = [value];

  const seen = new Set();
  raw.forEach((item) => {
    if (item == null) return;
    const text = item.toString().trim();
    if (!text) return;
    const dayPart = /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : text;
    const parsed = parseProjectDate(dayPart);
    if (parsed) {
      seen.add(format(parsed, 'yyyy-MM-dd'));
    }
  });
  return Array.from(seen).sort();
};

// Devuelve TODOS los días de grabación de un proyecto como Date[] (ordenados).
// Si no hay arreglo `recordingDates`, cae a la fecha única `fechaGrabacion`.
export const getProjectRecordingDates = (project) => {
  if (!project) return [];
  const candidates =
    project.recordingDates ||
    project.properties?.recordingDates ||
    project.fechaGrabacionDias ||
    project.properties?.fechaGrabacionDias ||
    null;
  let dates = sanitizeRecordingDates(candidates);
  if (dates.length === 0) {
    const single = getProjectRecordingDate(project);
    if (single) dates = [format(single, 'yyyy-MM-dd')];
  }
  return dates.map((d) => parseProjectDate(d)).filter(Boolean);
};

// Última (más tardía) fecha de grabación: base para edición y auto-avance.
export const getProjectLastRecordingDate = (project) => {
  const dates = getProjectRecordingDates(project);
  return dates.length ? dates[dates.length - 1] : null;
};

const getProjectStage = (project) =>
  (project?.stage || project?.properties?.stage || '').toString().trim().toLowerCase();

const RECORDING_STAGES = new Set(['grabacion', 'fotografia', 'fotografía']);

// Días en que una persona está comprometida todo el día y no puede estar en
// otro lado: días de rodaje (de cualquier fase) y ausencias.
export const getProjectBlockingDays = (project) => {
  if (!project) return [];
  const absence = isAbsenceProject(project);
  let days = getProjectRecordingDates(project);
  if (days.length > 0) return days;

  if (!absence && !RECORDING_STAGES.has(getProjectStage(project))) return [];
  const start = parseProjectDate(project.startDate);
  if (!start) return [];
  const end = parseProjectDate(project.deadline);
  if (absence && end && end > start) return eachDayOfInterval({ start, end });
  return [start];
};

// ─── Formato (Spot / Evento / Contenido / Lanzamiento) ─────────────────────────

const FORMAT_LABELS = {
  spot: 'Spot',
  evento: 'Evento',
  contenido: 'Contenido',
  lanzamiento: 'Lanzamiento',
  grabacion: 'Grabación',
  fotografia: 'Fotografía',
  edicion: 'Edición',
};

export const getFormatKey = (project) =>
  normalizeString(
    project?.registrationType || project?.properties?.registrationType || project?.type || ''
  );

export const getFormatLabel = (value) => {
  const key = normalizeString(value || '');
  if (!key) return 'Sin formato';
  return FORMAT_LABELS[key] || buildLabel(value, 'Sin formato');
};

export const extractProjectInfo = (project) => {
  const id = project.id || project.uuid || project._id || project.slug || String(Math.random());
  const statusLabel = buildLabel(project.status, 'Programado');
  const statusKey = normalizeString(project.status || statusLabel || '').replace(/\s+/g, '');

  // Normalizar para un chequeo de completado más flexible
  const normalizedStatus = statusKey.toLowerCase();
  const completedKeys = ['completado', 'completada', 'entregado', 'entregada', 'finalizado', 'finalizada'];
  const isCompleted = completedKeys.includes(normalizedStatus);

  const rawStageValue =
    project.stage ||
    project.properties?.stage ||
    (project.fechaGrabacion || project.properties?.fechaGrabacion ? 'grabacion' : '');
  const stage = normalizeString(rawStageValue || '').replace(/\s+/g, '');
  const clientLabel = buildLabel(project.client || project.cliente, 'Sin cliente');
  const formatKey = getFormatKey(project);
  const typeLabel = getFormatLabel(
    project.registrationType || project.properties?.registrationType || project.type
  );
  const recordingDate = parseProjectDate(
    project.fechaGrabacion ||
      project.fecha_grabacion ||
      project.fechaGrabación ||
      project.recordingDate ||
      project.recording_date ||
      project.properties?.fechaGrabacion ||
      project.properties?.fecha_grabacion
  );
  const recordingDates = getProjectRecordingDates(project);
  const firstRecordingDate = recordingDates[0] || null;
  const lastRecordingDate = recordingDates.length ? recordingDates[recordingDates.length - 1] : null;
  const deadlineDate = parseProjectDate(
    project.deadline ||
    project.endDate ||
    project.end_date ||
    project.fecha_entrega ||
    project.properties?.deadline ||
    project.properties?.end_date
  );
  const startDate = parseProjectDate(
    project.startDate ||
      project.start_date ||
      project.fecha_inicio ||
      project.properties?.startDate ||
      project.properties?.start_date ||
      project.properties?.fecha_inicio
  );
  const completionDate = parseProjectDate(
    project.completedAt ||
      project.completed_at ||
      project.fechaEntrega ||
      project.fecha_entrega ||
      project.properties?.completedAt ||
      project.properties?.completed_at ||
      project.properties?.fechaEntrega ||
      project.properties?.fecha_entrega
  );

  // Fecha de entrega del trabajo: la comprometida (deadline) o, si no hay,
  // el último día de rodaje / inicio. `completedAt` solo como último recurso:
  // registra cuándo se marcó como completado, que puede ser semanas después.
  const deliveryDate = deadlineDate || lastRecordingDate || startDate || completionDate;

  // Intervalo de trabajo: desde el primer rodaje o el inicio hasta la entrega.
  const startCandidates = [startDate, firstRecordingDate].filter(Boolean);
  const workStart = startCandidates.length
    ? new Date(Math.min(...startCandidates.map((d) => d.getTime())))
    : deadlineDate;
  const workEnd = deadlineDate || lastRecordingDate || workStart;

  const managers = getProjectManagers(project);
  const displayName =
    buildLabel(project.name || project.projectName || project.titulo || project.title, '').length > 0
      ? buildLabel(project.name || project.projectName || project.titulo || project.title, '')
      : `Proyecto sin título (${clientLabel})`;

  return {
    id,
    statusLabel,
    statusKey,
    isCompleted,
    isAbsence: isAbsenceProject(project),
    stage,
    clientLabel,
    formatKey,
    typeLabel,
    managers,
    recordingDate,
    recordingDates,
    firstRecordingDate,
    lastRecordingDate,
    deadlineDate,
    startDate,
    completionDate,
    deliveryDate,
    // Compatibilidad con código anterior.
    referenceCompletionDate: deliveryDate,
    workStart,
    workEnd,
    displayName,
  };
};

/**
 * Un proyecto pertenece a un mes si su intervalo de trabajo (primer rodaje o
 * inicio → entrega) se cruza con ese mes. Los proyectos abiertos y vencidos
 * siguen contando en los meses posteriores hasta hoy, porque siguen pendientes.
 */
export const isProjectActiveInMonth = (projectInfo, referenceDate) => {
  const { workStart, workEnd, isCompleted } = projectInfo;
  if (!workStart) return false;

  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  if (workStart > monthEnd) return false;

  const end = workEnd && workEnd > workStart ? workEnd : workStart;
  if (end >= monthStart) return true;

  return !isCompleted && monthStart <= startOfDay(new Date());
};

// Entregado en el mes: completado y con fecha de entrega dentro del mes.
export const isDeliveredInMonth = (projectInfo, referenceDate) =>
  Boolean(projectInfo.isCompleted && projectInfo.deliveryDate && isSameMonth(projectInfo.deliveryDate, referenceDate));

// Proyectos que se muestran en un mes: los abiertos con actividad en el mes y
// los completados que se entregaron ese mes. Misma regla para la lista del
// periodo y para los KPIs, así los números cuadran.
export const isProjectInPeriod = (projectInfo, referenceDate) =>
  projectInfo.isCompleted
    ? isDeliveredInMonth(projectInfo, referenceDate)
    : isProjectActiveInMonth(projectInfo, referenceDate);

// Tiempo promedio (días) entre el inicio y la entrega por formato.
export const computeTurnaroundByFormat = (projects = []) => {
  const buckets = new Map();
  projects.forEach((project) => {
    if (isAbsenceProject(project)) return;
    const info = extractProjectInfo(project);
    if (!info.isCompleted || !info.startDate || !info.completionDate) return;
    const days = Math.max(differenceInCalendarDays(info.completionDate, info.startDate), 0);
    const key = info.formatKey || 'sinformato';
    const bucket = buckets.get(key) || { key, type: info.typeLabel, total: 0, count: 0 };
    bucket.total += days;
    bucket.count += 1;
    buckets.set(key, bucket);
  });

  return Array.from(buckets.values())
    .map(({ key, type, total, count }) => ({
      key,
      type,
      avgDays: Number((total / count).toFixed(1)),
      count,
    }))
    .sort((a, b) => b.avgDays - a.avgDays);
};

const MIN_TURNAROUND_SAMPLES = 3;

// Propone una fecha de entrega con el promedio histórico del formato, contando
// desde el último día de rodaje (o el inicio). Solo si no hay fecha comprometida.
export const estimateDeliveryDate = (project, turnaround = []) => {
  if (!project || isAbsenceProject(project)) return null;
  const info = extractProjectInfo(project);
  if (info.isCompleted || info.deadlineDate) return null;
  const base = info.lastRecordingDate || info.startDate;
  if (!base) return null;
  const match = turnaround.find((item) => item.key === info.formatKey);
  if (!match || match.count < MIN_TURNAROUND_SAMPLES) return null;
  const days = Math.max(1, Math.round(match.avgDays));
  return {
    date: addDays(base, days),
    days,
    avgDays: match.avgDays,
    formatLabel: match.type,
    samples: match.count,
  };
};

const LOAD_LEVELS = (total) =>
  total >= 5 ? 'Carga alta' : total >= 3 ? 'Carga media' : 'Carga controlada';

const WEEKS_IN_TREND = 8;

export const buildDashboardData = (projects, referenceDate = new Date()) => {
  const now = referenceDate;
  const totals = { active: 0, recording: 0, editing: 0, delivered: 0 };
  const clientCount = new Map();
  const managerLoad = new Map(TEAM_MEMBERS.map((member) => [member, 0]));
  const periodProjects = [];

  // Semanas de la tendencia: las 8 que terminan en la última semana del mes
  // elegido, todas presentes aunque no tengan grabaciones.
  const lastWeekStart = startOfWeek(endOfMonth(now), { weekStartsOn: 1 });
  const weekStarts = Array.from({ length: WEEKS_IN_TREND }, (_, index) =>
    addWeeks(lastWeekStart, index - (WEEKS_IN_TREND - 1))
  );
  const recordingsByWeekMap = new Map(weekStarts.map((week) => [week.getTime(), new Set()]));

  const workProjects = (projects || []).filter((project) => !isAbsenceProject(project));

  workProjects.forEach((project) => {
    const info = extractProjectInfo(project);
    const { isCompleted, stage, clientLabel, managers, recordingDates } = info;
    const isActive = !isCompleted && isProjectActiveInMonth(info, now);
    const isDelivered = isDeliveredInMonth(info, now);

    if (isActive) {
      totals.active += 1;
      if (RECORDING_STAGES.has(stage)) totals.recording += 1;
      if (stage === 'edicion' || stage === 'postproduccion') totals.editing += 1;

      const assigned = managers.length > 0 ? managers.map((m) => ensureMemberName(m)) : ['Sin asignar'];
      new Set(assigned).forEach((manager) => {
        managerLoad.set(manager, (managerLoad.get(manager) || 0) + 1);
      });
    }
    if (isDelivered) totals.delivered += 1;

    if (isActive || isDelivered) {
      periodProjects.push(project);
      const clientKey = getClientKey(clientLabel) || 'sincliente';
      const entry = clientCount.get(clientKey) || { client: clientLabel, total: 0 };
      entry.total += 1;
      clientCount.set(clientKey, entry);
    }

    recordingDates.forEach((day) => {
      const key = startOfWeek(day, { weekStartsOn: 1 }).getTime();
      if (recordingsByWeekMap.has(key)) {
        recordingsByWeekMap.get(key).add(info.id);
      }
    });
  });

  const clientsData = Array.from(clientCount.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const recordingsByWeek = weekStarts.map((week) => ({
    week: format(week, 'd MMM', { locale: es }),
    total: recordingsByWeekMap.get(week.getTime()).size,
  }));

  const managerLoadData = Array.from(managerLoad.entries())
    .filter(([manager, total]) => manager !== 'Sin asignar' || total > 0)
    .map(([manager, total]) => ({ manager, total, level: LOAD_LEVELS(total) }))
    .sort((a, b) => b.total - a.total || a.manager.localeCompare(b.manager, 'es'));

  return {
    totals,
    periodProjects,
    clientsData,
    recordingsByWeek,
    editingAverageByType: computeTurnaroundByFormat(workProjects),
    managerLoad: managerLoadData,
  };
};
