export const ALLOWED_STATUSES = ['Programado', 'En progreso', 'En revisión', 'Completado', 'Stuck'];

// El valor guardado sigue siendo "Stuck" (lo usan el MCP y las salas de voz);
// en pantalla se muestra en español.
export const STATUS_LABELS = {
  Programado: 'Programado',
  'En progreso': 'En progreso',
  'En revisión': 'En revisión',
  Completado: 'Completado',
  Stuck: 'Atascado',
};

// Única lista de estados para formularios, tabla y filtros.
export const STATUS_OPTIONS = ALLOWED_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] }));

export const normalizeStatus = (status) => {
  if (!status) return 'Programado';
  const value = status.toString().trim().toLowerCase();
  if (value === 'stuck' || value === 'atascado') return 'Stuck';
  if (value === 'finalizado' || value === 'finalizada' || value === 'terminado' || value === 'completado')
    return 'Completado';
  if (
    value === 'en curso' ||
    value === 'en progreso' ||
    value === 'progreso' ||
    value === 'editando' ||
    value === 'en edición' ||
    value === 'en edicion'
  )
    return 'En progreso';
  if (
    value === 'revision' ||
    value === 'revisión' ||
    value === 'en revisión' ||
    value === 'en revision' ||
    value === 'esperando feedback'
  )
    return 'En revisión';
  return 'Programado';
};

export const getStatusLabel = (status) => STATUS_LABELS[normalizeStatus(status)];

export const buildStatusUpdatePayload = (project, nextStatus) => ({
  ...project,
  status: nextStatus,
});

const statusHelpers = {
  ALLOWED_STATUSES,
  STATUS_LABELS,
  STATUS_OPTIONS,
  normalizeStatus,
  getStatusLabel,
  buildStatusUpdatePayload,
};

export default statusHelpers;
