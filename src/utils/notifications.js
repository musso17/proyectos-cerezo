import { MEMBER_EMAILS, generarLinkGoogleCalendar } from './calendar';

/**
 * Notifica a un encargado por correo electrónico sobre la asignación de un proyecto.
 * @param {Object} project - Datos del proyecto.
 * @param {string} managerName - Nombre del encargado a notificar.
 */
export const notifyManagerAssignment = async (project, managerName) => {
  if (!managerName || managerName === 'Sin asignar') return;

  const email = MEMBER_EMAILS[managerName.toLowerCase().trim()];
  if (!email) {
    console.warn(`[Notifications] No se encontró correo para el encargado: ${managerName}`);
    return;
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

  console.info(`[Notifications] Enviando notificación a ${email} para el proyecto ${project.name}`);

  try {
    const response = await fetch('/api/notifications/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al enviar el correo');
    }

    console.info(`[Notifications] Notificación enviada exitosamente a ${email}`);
  } catch (error) {
    console.error(`[Notifications] Error al enviar notificación:`, error);
  }
};
