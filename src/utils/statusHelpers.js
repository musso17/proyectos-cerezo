export const ALLOWED_STATUSES = ['Programado', 'En progreso', 'En revisión', 'Completado', 'Stuck'];

export const normalizeStatus = (status) => {
  if (!status) return 'Programado';
  const value = status.toString().trim().toLowerCase();
  if (value === 'finalizado' || value === 'finalizada' || value === 'terminado' || value === 'completado')
    return 'Completado';
  if (value === 'en curso' || value === 'en progreso' || value === 'progreso' || value === 'editando')
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

export const buildStatusUpdatePayload = (project, nextStatus) => ({
  ...project,
  status: nextStatus,
});

const statusHelpers = {
  ALLOWED_STATUSES,
  normalizeStatus,
  buildStatusUpdatePayload,
};

export default statusHelpers;
