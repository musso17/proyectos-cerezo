import { MEMBER_EMAILS, generarLinkGoogleCalendar } from './calendar';
import { authFetch } from './authFetch';

/**
 * Notifica a un encargado por correo electrónico sobre la asignación de un proyecto.
 * Nunca lanza: devuelve `{ ok, code, message }` para que la interfaz avise si falló.
 * @param {Object} project - Datos del proyecto.
 * @param {string} managerName - Nombre del encargado a notificar.
 */
export const notifyManagerAssignment = async (project, managerName) => {
  if (!managerName || managerName === 'Sin asignar') return { ok: true, skipped: true };

  const email = MEMBER_EMAILS[managerName.toLowerCase().trim()];
  if (!email) {
    console.warn(`[Notifications] No se encontró correo para el encargado: ${managerName}`);
    return { ok: false, code: 'NO_EMAIL', message: `No hay correo registrado para ${managerName}.` };
  }

  const calendarLink = generarLinkGoogleCalendar(project);

  const stage = (project.stage || '').toLowerCase();
  const isRecording = stage === 'grabacion' || stage === 'fotografia';
  const dateLabel = isRecording ? 'Fecha de Grabación' : 'Fecha de Inicio';

  // Priorizar fechas según el tipo de proyecto
  const dateValue = isRecording
    ? (project.recordingDate || project.startDate || project.fecha_grabacion || project.fecha_inicio)
    : (project.startDate || project.fecha_inicio || project.deadline);

  const payload = {
    to: email,
    subject: `Nuevo proyecto asignado: ${project.name}`,
    projectName: project.name,
    client: project.client,
    manager: managerName,
    dateLabel,
    dateValue: dateValue || 'Sin fecha',
    location: project.recordingLocation || project.location || '',
    time: project.recordingTime || '',
    calendarLink,
  };

  try {
    const response = await authFetch('/api/notifications/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        ok: false,
        code: body.code || 'SEND_FAILED',
        message: body.message || 'Error al enviar el correo',
      };
    }

    return { ok: true };
  } catch (error) {
    console.error(`[Notifications] Error al enviar notificación:`, error);
    return { ok: false, code: 'NETWORK', message: error.message || 'Error de red' };
  }
};

// Avisa a cada responsable recién asignado y devuelve un resultado por persona.
export const notifyNewManagers = async (project, previousManagers = []) => {
  const before = new Set(previousManagers.map((m) => m.toString().trim().toLowerCase()));
  const added = (project.managers || [])
    .map((m) => m.toString().trim())
    .filter((m) => m && m !== 'Sin asignar' && !before.has(m.toLowerCase()));

  const results = await Promise.all(
    added.map(async (manager) => ({ manager, ...(await notifyManagerAssignment(project, manager)) }))
  );
  return results.filter((result) => !result.skipped);
};
