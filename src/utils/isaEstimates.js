import { addBusinessDays, addDays, differenceInCalendarDays, isValid, parseISO, startOfDay } from 'date-fns';

export const parseToDay = (value) => {
  if (!value) return null;
  try {
    const stringValue = value.toString().trim();
    if (!stringValue) return null;
    const parsed = parseISO(stringValue.length <= 10 ? `${stringValue}T00:00:00` : stringValue);
    if (isValid(parsed)) {
      return startOfDay(parsed);
    }
    const fallback = new Date(stringValue);
    return isValid(fallback) ? startOfDay(fallback) : null;
  } catch {
    return null;
  }
};

const sortCycles = (cycles = []) =>
  [...cycles].sort((a, b) => {
    const numberA = Number(a.number) || 0;
    const numberB = Number(b.number) || 0;
    if (numberA !== numberB) return numberA - numberB;
    const startedA = parseToDay(a.started_at || a.created_at || 0)?.getTime() || 0;
    const startedB = parseToDay(b.started_at || b.created_at || 0)?.getTime() || 0;
    return startedA - startedB;
  });

const durationInDays = (start, end) => {
  if (!start || !end) return null;
  if (end.getTime() < start.getTime()) return null;
  return Math.max(1, differenceInCalendarDays(end, start) || 0);
};

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

export const isEditingAllowedDay = (date) => {
  if (!date) return false;
  return !isWeekend(date);
};

const ensureEditingAllowedDay = (date) => {
  let current = startOfDay(date);
  while (!isEditingAllowedDay(current)) {
    current = startOfDay(addDays(current, 1));
  }
  return current;
};

const addEditingBusinessDays = (start, amount) => {
  if (!start) return null;
  const normalizedStart = ensureEditingAllowedDay(start);
  if (!amount || amount <= 1) {
    return normalizedStart;
  }
  const target = addBusinessDays(normalizedStart, amount - 1);
  return ensureEditingAllowedDay(target);
};

const ISA_EDITING_MILESTONES = new Set(['isa_first_version', 'isa_review', 'isa_final_delivery']);

export const isAllowedIsaMilestoneDay = (milestoneType, date) => {
  if (!date) return false;
  if (ISA_EDITING_MILESTONES.has(milestoneType)) {
    return isEditingAllowedDay(date);
  }
  return true;
};

const averageOrFallback = (values, fallback) => {
  if (!Array.isArray(values) || values.length === 0) return fallback;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.max(1, Math.round(mean));
};

export const getProjectRecordingDate = (project) => {
  if (!project) return null;
  const candidates = [
    project.fechaGrabacion,
    project.fecha_grabacion,
    project.fechaGrabación,
    project.recordingDate,
    project.recording_date,
    project.startDate,
    project.start_date,
    project.fecha_inicio,
    project.properties?.fechaGrabacion,
    project.properties?.fecha_grabacion,
    project.properties?.startDate,
    project.properties?.start_date,
  ];
  for (const candidate of candidates) {
    const parsed = parseToDay(candidate);
    if (parsed) return parsed;
  }
  return null;
};

export const computeIsaAverages = (revisionCycles = {}) => {
  const editingSamples = [];
  const reviewSamples = [];
  const feedbackSamples = [];

  Object.values(revisionCycles || {}).forEach((cycles) => {
    if (!Array.isArray(cycles) || cycles.length === 0) return;
    const ordered = sortCycles(cycles);

    ordered.forEach((cycle, index) => {
      const started = parseToDay(cycle.started_at || cycle.created_at || cycle.sent_at);
      const sent = parseToDay(cycle.sent_at);
      const returned = parseToDay(cycle.client_returned_at);
      const nextCycle = ordered[index + 1];
      const nextStart = nextCycle
        ? parseToDay(nextCycle.started_at || nextCycle.created_at || nextCycle.sent_at)
        : null;

      const editingDuration = durationInDays(started, sent);
      if (editingDuration !== null) editingSamples.push(editingDuration);

      const reviewDuration = durationInDays(sent, returned);
      if (reviewDuration !== null) reviewSamples.push(reviewDuration);

      const feedbackDuration = durationInDays(returned, nextStart);
      if (feedbackDuration !== null) feedbackSamples.push(feedbackDuration);
    });
  });

  const editingAvgDays = averageOrFallback(editingSamples, 2);
  const reviewAvgDays = averageOrFallback(reviewSamples, 1);
  const feedbackAvgDays = averageOrFallback(feedbackSamples, 1);
  const totalEstimatedDays = Math.max(1, editingAvgDays + reviewAvgDays + feedbackAvgDays);

  return {
    editingAvgDays,
    reviewAvgDays,
    feedbackAvgDays,
    totalEstimatedDays,
  };
};

export const buildIsaMilestones = (project, stats, options = {}) => {
  if (!project || !stats || !stats.totalEstimatedDays) return [];
  const recordingDate = getProjectRecordingDate(project);
  if (!recordingDate) return [];

  const editingDays = Math.max(1, options.editingDays || stats.editingAvgDays);
  const reviewDays = Math.max(1, options.reviewDays || stats.reviewAvgDays);
  const feedbackDays = Math.max(1, options.feedbackDays || stats.feedbackAvgDays);
  const startOffset = typeof options.offsetDays === 'number' ? options.offsetDays : 1;

  const editingStartBase = startOfDay(addDays(recordingDate, Math.max(startOffset, 1)));
  const editingStart = ensureEditingAllowedDay(editingStartBase);
  const firstVersionDate = addEditingBusinessDays(editingStart, editingDays);
  const reviewDate = addEditingBusinessDays(firstVersionDate, reviewDays);
  const finalDeliveryDate = addEditingBusinessDays(reviewDate, feedbackDays);

  return [
    {
      key: 'isa_first_version',
      label: 'ISA · 1ra versión',
      description: 'Entrega tentativa de la primera versión',
      date: firstVersionDate,
    },
    {
      key: 'isa_review',
      label: 'ISA · Revisión',
      description: 'Tiempo estimado para revisión y feedback del cliente',
      date: reviewDate,
    },
    {
      key: 'isa_final_delivery',
      label: 'ISA · Entrega final',
      description: 'Fecha estimada de entrega tras ajustes finales',
      date: finalDeliveryDate,
    },
  ];
};

export const getIsaProjectKey = (project) => {
  if (!project) return null;
  return (
    project.id ||
    project.uuid ||
    project._id ||
    project.slug ||
    project.properties?.slug ||
    project.name ||
    null
  );
};

export const applyIsaOverridesToMilestones = (project, milestones = [], overrides = {}) => {
  const projectKey = getIsaProjectKey(project);
  if (!projectKey || !overrides || typeof overrides !== 'object') return milestones;
  const projectOverrides = overrides[projectKey];
  if (!projectOverrides || typeof projectOverrides !== 'object') return milestones;
  return milestones.map((milestone) => {
    const overrideValue = projectOverrides[milestone.key];
    if (!overrideValue) return milestone;
    const overrideDate = parseToDay(overrideValue);
    if (!overrideDate) return milestone;
    const adjusted = ensureEditingAllowedDay(overrideDate);
    return { ...milestone, date: adjusted };
  });
};
