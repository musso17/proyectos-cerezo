import {
  differenceInCalendarDays,
  isSameMonth,
  parseISO,
  isValid,
  isAfter,
  format,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { normalizeString } from './normalize';

export const buildLabel = (value, fallback) => {
  if (!value && value !== 0) return fallback;
  const text = value.toString().trim();
  if (text.length === 0) return fallback;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const parseProjectDate = (value) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const text = value.toString().trim();
  if (text.length === 0) return null;

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text;
  const parsedISO = parseISO(normalized);
  if (isValid(parsedISO)) return parsedISO;

  const timestamp = Date.parse(text);
  if (!Number.isNaN(timestamp)) return new Date(timestamp);

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
  const typeLabel = buildLabel(
    project.type || project.registrationType || project.properties?.registrationType,
    'Sin tipo'
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
  const referenceCompletionDate = completionDate || deadlineDate || startDate;
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
    stage,
    clientLabel,
    typeLabel,
    managers,
    recordingDate,
    deadlineDate,
    startDate,
    completionDate,
    referenceCompletionDate,
    displayName,
  };
};

export const buildDashboardData = (projects, revisionCycles = {}) => {
  const now = new Date();
  const totals = { active: 0, recording: 0, editing: 0, delivered: 0 };
  let completedThisMonth = 0;
  const statusCount = new Map();
  const activeStatusCount = new Map();
  const clientCount = new Map();
  const editingDurationsByType = new Map();
  const recordingByWeek = new Map();
  const managerLoad = new Map();
  let totalDeliveryDays = 0;
  let deliverySamples = 0;
  let projectsUnder48h = 0;
  let totalProjectsCompleted = 0;
  let lateEvents = 0;
  const upcomingEvents = [];
  let totalCycleCount = 0;
  let reviewSamples = 0;
  let reviewDaysAccumulator = 0;
  let pendingReviewCount = 0;
  let projectsWithCycles = 0;

  const editingStatusKeys = new Set([
    'enprogreso',
    'enrevision',
    'revision',
    'corrigiendo',
    'esperandofeedback',
    'editando',
  ]);

  projects.forEach((project) => {
    const {
      id,
      statusLabel,
      statusKey,
      isCompleted,
      stage,
      clientLabel,
      typeLabel,
      managers,
      recordingDate,
      deadlineDate,
      startDate,
      completionDate,
      referenceCompletionDate,
      displayName,
    } = extractProjectInfo(project);

    statusCount.set(statusLabel, (statusCount.get(statusLabel) || 0) + 1);

    if (!isCompleted && statusLabel !== 'Cancelado') {
      totals.active += 1;
      activeStatusCount.set(statusLabel, (activeStatusCount.get(statusLabel) || 0) + 1);
    }

    if (!isCompleted && stage === 'grabacion') totals.recording += 1;
    if (
      !isCompleted &&
      (stage === 'edicion' || stage === 'postproduccion') &&
      editingStatusKeys.has(statusKey)
    ) {
      totals.editing += 1;
    }
    if (isCompleted) totals.delivered += 1;

    if (referenceCompletionDate && isSameMonth(referenceCompletionDate, now) && isCompleted) {
      completedThisMonth += 1;
    }

    const clientKey = normalizeString(clientLabel || 'Sin cliente');
    const existing = clientCount.get(clientKey) || { total: 0 };
    existing.total += 1;
    existing.label = clientKey.charAt(0).toUpperCase() + clientKey.slice(1);
    clientCount.set(clientKey, existing);

    if (isCompleted && startDate && completionDate) {
      const days = Math.max(differenceInCalendarDays(completionDate, startDate), 0);
      totalDeliveryDays += days;
      deliverySamples += 1;

      const bucket = editingDurationsByType.get(typeLabel) || { total: 0, count: 0 };
      bucket.total += days;
      bucket.count += 1;
      editingDurationsByType.set(typeLabel, bucket);

      totalProjectsCompleted += 1;
      if (days <= 2) projectsUnder48h += 1;
    }

    if (recordingDate) {
      const weekStart = startOfWeek(recordingDate, { weekStartsOn: 1 });
      const key = weekStart.getTime();
      const current = recordingByWeek.get(key) || 0;
      recordingByWeek.set(key, current + 1);
    }

    const considerForLoad = ['En progreso', 'En revisión'];
    if (considerForLoad.includes(statusLabel)) {
      const assignedManagers = managers.length > 0 ? managers : ['Sin asignar'];
      assignedManagers.forEach((manager) => {
        managerLoad.set(manager, (managerLoad.get(manager) || 0) + 1);
      });
    }

    if (typeLabel.toLowerCase().includes('evento') && deadlineDate && deadlineDate < now && !isCompleted) {
      lateEvents += 1;
    }

    if (recordingDate && isAfter(recordingDate, now)) {
      upcomingEvents.push({
        id,
        date: recordingDate,
        label: 'Grabación',
        project: displayName,
        description: 'Coordinación de equipo y logística',
      });
    }

    if (deadlineDate && isAfter(deadlineDate, now)) {
      upcomingEvents.push({
        id,
        date: deadlineDate,
        label: 'Entrega',
        project: displayName,
        description: 'Fecha comprometida con el cliente',
      });
    }

    // Contar proyectos con estado de revisión para el indicador general
    const inReviewStatusKeys = new Set(['enrevision', 'revision', 'esperandofeedback', 'corrigiendo']);
    const isInReviewStatus = !isCompleted && (
      inReviewStatusKeys.has(statusKey) || 
      statusKey.includes('revis') ||
      statusLabel.toLowerCase().includes('revis')
    );
    
    if (isInReviewStatus) {
      pendingReviewCount += 1;
    }

    const projectCycles = Array.isArray(revisionCycles?.[id]) ? revisionCycles[id] : [];
    if (projectCycles.length > 0) {
      projectsWithCycles += 1;
      totalCycleCount += projectCycles.length;

      const orderedCycles = [...projectCycles].sort((a, b) => {
        const numberA = Number(a.number) || 0;
        const numberB = Number(b.number) || 0;
        if (numberA !== numberB) return numberA - numberB;
        const createdA = new Date(a.started_at || a.created_at || 0).getTime();
        const createdB = new Date(b.started_at || b.created_at || 0).getTime();
        return createdA - createdB;
      });

      const currentCycle = orderedCycles[orderedCycles.length - 1];
      // Si el proyecto ya fue contado por su estado, no lo volvemos a contar por su ciclo
      if (!isInReviewStatus && currentCycle && ['enviado', 'esperando_feedback'].includes(currentCycle.status)) {
        pendingReviewCount += 1;
      }

      orderedCycles.forEach((cycle) => {
        if (cycle.sent_at && cycle.client_returned_at) {
          const start = parseISO(cycle.sent_at);
          const end = parseISO(cycle.client_returned_at);
          if (isValid(start) && isValid(end) && !isAfter(start, end)) {
            reviewDaysAccumulator += Math.max(differenceInCalendarDays(end, start), 0);
            reviewSamples += 1;
          }
        }
      });
    }
  });

  const avgDeliveryDays =
    deliverySamples > 0 ? Number((totalDeliveryDays / deliverySamples).toFixed(1)) : null;

  const statusData = Array.from(statusCount.entries())
    .map(([status, total]) => ({ status, total }))
    .sort((a, b) => b.total - a.total);

  const activeStatusData = Array.from(activeStatusCount.entries())
    .map(([status, total]) => ({ status, total }))
    .sort((a, b) => b.total - a.total);

  const clientsData = Array.from(clientCount.entries())
    .map(([key, { label, total }]) => ({ client: label || 'Sin cliente', total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const editingAverageByType = Array.from(editingDurationsByType.entries())
    .map(([type, { total, count }]) => ({
      type,
      avgDays: Number((total / count).toFixed(1)),
    }))
    .sort((a, b) => b.avgDays - a.avgDays);

  const recordingsByWeek = Array.from(recordingByWeek.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(-8)
    .map(([timestamp, total]) => ({
      week: format(new Date(Number(timestamp)), "d MMM", { locale: es }),
      total,
    }));

  const managerLoadData = Array.from(managerLoad.entries())
    .map(([manager, total]) => ({
      manager,
      total,
      level: total >= 5 ? 'Carga alta' : total >= 3 ? 'Carga media' : 'Carga controlada',
    }))
    .sort((a, b) => b.total - a.total);

  const upcoming = upcomingEvents
    .filter((event) => differenceInCalendarDays(event.date, now) <= 30)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 8);

  const averageReviewDays = reviewSamples > 0 ? Number((reviewDaysAccumulator / reviewSamples).toFixed(1)) : null;
  const avgCyclesPerProject = projectsWithCycles > 0 ? Number((totalCycleCount / projectsWithCycles).toFixed(1)) : 0;

  return {
    totals,
    completedThisMonth,
    avgDeliveryDays,
    statusData,
    activeStatusData,
    clientsData,
    recordingsByWeek,
    editingAverageByType,
    projectsUnder48h,
    totalProjectsCompleted,
    lateEvents,
    upcomingEvents: upcoming,
    managerLoad: managerLoadData,
    revisionMetrics: {
      totalCycles: totalCycleCount,
      averageReviewDays,
      pendingReviews: pendingReviewCount,
      avgCyclesPerProject,
    },
  };
};
