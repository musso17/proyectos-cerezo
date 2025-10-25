export const ALLOWED_STATUSES = ['Programado', 'En progreso', 'En revisión', 'Completado'];

export const normalizeStatus = (status) => {
  if (!status) return 'Programado';
  const value = status.toString().trim().toLowerCase();
  if (value === 'finalizado' || value === 'finalizada' || value === 'terminado' || value === 'completado')
    return 'Completado';
  if (value === 'en curso' || value === 'en progreso' || value === 'progreso') return 'En progreso';
  if (value === 'revision' || value === 'revisión' || value === 'en revisión' || value === 'en revision')
    return 'En revisión';
  return 'Programado';
};

export const buildStatusUpdatePayload = (project, nextStatus) => ({
  ...project,
  status: nextStatus,
});

export default { ALLOWED_STATUSES, normalizeStatus, buildStatusUpdatePayload };
