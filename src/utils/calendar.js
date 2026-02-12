const LIMA_TIMEZONE_OFFSET = '-05:00';

const MEMBER_EMAILS = {
  'mauricio': 'Mauriciomu22ts@gmail.com',
  'mauricio muñoz': 'Mauriciomu22ts@gmail.com',
  'mauricio mu': 'Mauriciomu22ts@gmail.com',
  'mauricio muñoz torres': 'Mauriciomu22ts@gmail.com',
  'edson': 'edsonlom321@gmail.com',
  'edson lopez': 'edsonlom321@gmail.com',
  'luis': 'luis.matallana.30@gmail.com',
  'marcelo': 'hola@cerezoperu.com',
  'marcelo musso': 'hola@cerezoperu.com',
};

const normalizeTimeValue = (time, fallback = '09:00:00') => {
  if (!time) return fallback;
  const trimmed = time.toString().trim();
  if (!trimmed) return fallback;
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  return fallback;
};

const formatCalendarDate = (dateStr, time) => {
  if (!dateStr) return null;
  const normalizedTime = normalizeTimeValue(time);

  const date = new Date(`${dateStr}T${normalizedTime}${LIMA_TIMEZONE_OFFSET}`);
  if (Number.isNaN(date.getTime())) return null;

  const iso = date.toISOString();
  return iso.replace(/[-:]/g, '').replace('.000', '');
};

const buildCalendarField = (label, value) =>
  value && value.trim().length > 0 ? `${label}${value.trim()}` : '';

const normalizeName = (value) => (value ? value.toString().trim().toLowerCase() : '');

const collectMemberEmails = (encargado, team) => {
  const emails = new Set();

  const normalizedManager = normalizeName(encargado);
  if (MEMBER_EMAILS[normalizedManager]) {
    emails.add(MEMBER_EMAILS[normalizedManager]);
  }

  const teamArray = Array.isArray(team)
    ? team
    : typeof team === 'string'
      ? team.split(',').map((member) => member.trim())
      : [];

  teamArray
    .map(normalizeName)
    .forEach((member) => {
      if (MEMBER_EMAILS[member]) {
        emails.add(MEMBER_EMAILS[member]);
      }
    });

  return emails;
};

export const generarLinkGoogleCalendar = (proyecto) => {
  if (!proyecto) return '';

  const contenido = proyecto.contenido || proyecto.name || 'Proyecto';
  const cliente = proyecto.cliente || proyecto.client || 'Cliente';
  const detalle = proyecto.detalle || proyecto.description || '';
  const encargado =
    proyecto.encargado ||
    (Array.isArray(proyecto.managers) && proyecto.managers.length > 0
      ? proyecto.managers.join(', ')
      : proyecto.manager || '');
  const fechaInicio = proyecto.fechaInicio || proyecto.startDate || '';
  const fechaFin = proyecto.fechaFin || proyecto.deadline || '';
  const horaInicio = proyecto.horaInicio || proyecto.recordingTime || '';
  const horaFin =
    proyecto.horaFin || proyecto.recordingEndTime || proyecto.horaTermino || '';
  const lugar = proyecto.lugar || proyecto.location || proyecto.recordingLocation || '';
  const equipo = proyecto.team || proyecto.equipo || [];

  const startStamp = formatCalendarDate(fechaInicio, horaInicio || '09:00:00');
  const endStamp = formatCalendarDate(fechaFin, horaFin || horaInicio || '18:00:00');

  if (!startStamp || !endStamp) {
    return '';
  }

  const text = encodeURIComponent(`Proyecto: ${contenido} - Cliente: ${cliente}`);
  const detailsLines = [
    buildCalendarField('Encargado: ', encargado),
    buildCalendarField('Cliente: ', cliente),
    buildCalendarField('Lugar: ', lugar),
    detalle || '',
  ].filter(Boolean);

  const details = encodeURIComponent(detailsLines.join('\n'));
  const dates = `${startStamp}/${endStamp}`;

  const attendees = collectMemberEmails(encargado, equipo);
  const attendeesParams = Array.from(attendees)
    .map((email) => `&add=${encodeURIComponent(email)}`)
    .join('');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&dates=${dates}${attendeesParams}`;
};
