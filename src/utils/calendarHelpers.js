import { startOfDay, parseISO, isValid } from 'date-fns';
import { getClientStyles } from './clientStyles';
import { getProjectRecordingDate } from './isaEstimates';

export const getClientDetailBadgeClass = (client) => {
  const styles = getClientStyles(client);
  const paletteClass = styles?.badge || 'bg-[#EEF1FF] text-accent border-accent/40';
  return `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${paletteClass}`;
};

export const normalizeStageValue = (value) => {
  if (!value) return '';
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export const isIsaEligibleProject = (project) => {
  const recordingDate = getProjectRecordingDate(project);
  if (!recordingDate) return false;

  const stageCandidates = [
    project?.stage,
    project?.properties?.stage,
    project?.state,
    project?.properties?.state,
  ];
  const statusCandidates = [project?.status, project?.properties?.status];

  const normalizedStages = stageCandidates.map((value) => normalizeStageValue(value)).filter(Boolean);
  const normalizedStatuses = statusCandidates
    .map((value) => normalizeStageValue(value))
    .filter(Boolean);

  const completedLabels = ['completado', 'completada', 'entregado', 'entregada', 'finalizado', 'finalizada'];
  if (
    normalizedStages.some((value) => completedLabels.includes(value)) ||
    normalizedStatuses.some((value) => completedLabels.includes(value))
  ) {
    return false;
  }

  return true;
};

export const parseDate = (value) => {
  if (!value) return null;
  const iso = value.length <= 10 ? `${value}T00:00:00` : value;
  const date = parseISO(iso);
  if (Number.isNaN(date.getTime())) return null;
  return startOfDay(date);
};
