const LIMA_TIMEZONE_OFFSET = '-05:00';

const formatCalendarDate = (dateStr, time) => {
  if (!dateStr) return null;

  const date = new Date(`${dateStr}T${time}${LIMA_TIMEZONE_OFFSET}`);
  if (Number.isNaN(date.getTime())) return null;

  const iso = date.toISOString();
  return iso.replace(/[-:]/g, '').replace('.000', '');
};

const buildCalendarField = (label, value) =>
  value && value.trim().length > 0 ? `${label}${value.trim()}` : '';

export const generarLinkGoogleCalendar = (proyecto) => {
  if (!proyecto) return '';

  const contenido = proyecto.contenido || proyecto.name || 'Proyecto';
  const cliente = proyecto.cliente || proyecto.client || 'Cliente';
  const detalle = proyecto.detalle || proyecto.description || '';
  const encargado = proyecto.encargado || proyecto.manager || '';
  const fechaInicio = proyecto.fechaInicio || proyecto.startDate || '';
  const fechaFin = proyecto.fechaFin || proyecto.deadline || '';

  const startStamp = formatCalendarDate(fechaInicio, '09:00:00');
  const endStamp = formatCalendarDate(fechaFin, '18:00:00');

  if (!startStamp || !endStamp) {
    return '';
  }

  const text = encodeURIComponent(`Proyecto: ${contenido} - Cliente: ${cliente}`);
  const detailsLines = [
    buildCalendarField('Encargado: ', encargado),
    detalle || '',
  ].filter(Boolean);

  const details = encodeURIComponent(detailsLines.join('\n'));
  const dates = `${startStamp}/${endStamp}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&dates=${dates}`;
};

