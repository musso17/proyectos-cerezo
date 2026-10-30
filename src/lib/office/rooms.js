// Salas de la oficina, llamadas entre dos personas y enlaces para entrar.
// Sin dependencias del navegador: lo usan la vista y la ruta del token.
import { TEAM_MEMBERS } from '../../constants/team';

export const COMMON_ROOM = 'Mesa común';

// Mesa común para estar juntos; las otras, para llamadas puntuales.
export const OFFICE_ROOMS = [
  { id: COMMON_ROOM, emoji: '☕', description: 'Para trabajar acompañados' },
  { id: 'General', emoji: '🎙️', description: 'Llamadas puntuales' },
  { id: 'Carbono', emoji: '🚗', description: 'Llamadas sobre Carbono' },
];

const CALL_ROOM = /^Llamada (\S+) y (\S+)$/;

// Una sala por pareja, con los nombres en orden: Marcelo llamando a Edson y
// Edson llamando a Marcelo terminan en la misma sala.
export const buildCallRoom = (a, b) => {
  const [first, second] = [a, b].sort((x, y) => x.localeCompare(y, 'es'));
  return `Llamada ${first} y ${second}`;
};

export const parseCallRoom = (room) => {
  const match = CALL_ROOM.exec(room || '');
  if (!match) return null;
  const [, a, b] = match;
  if (a === b || !TEAM_MEMBERS.includes(a) || !TEAM_MEMBERS.includes(b)) return null;
  return buildCallRoom(a, b) === room ? [a, b] : null;
};

export const isOfficeRoom = (room) =>
  OFFICE_ROOMS.some(({ id }) => id === room) || Boolean(parseCallRoom(room));

export const buildJoinLink = (origin, room) => `${origin}/?sala=${encodeURIComponent(room)}`;

// Sin número guardado, WhatsApp abre el selector de contactos con el texto.
export const buildWhatsAppLink = (phone, text) => {
  const digits = (phone || '').toString().replace(/\D/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
};
