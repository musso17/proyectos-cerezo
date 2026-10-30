// Presencia en vivo (canal privado "oficina" de Supabase Realtime): quién
// tiene la app abierta, en qué sala está y con qué estado elegido a mano.
import { TEAM_MEMBERS } from '../../constants/team';
import { STATUS_KINDS } from './status';

export const PRESENCE_CHANNEL = 'oficina';

// Lo que cada navegador publica sobre sí mismo.
export const buildPresencePayload = ({ member, manual, voice }) => ({
  member,
  manual: manual?.value && STATUS_KINDS[manual.value] ? manual : null,
  room: voice?.room || null,
  mic: Boolean(voice?.room && voice?.mic),
  sharing: Boolean(voice?.room && voice?.sharing),
  at: new Date().toISOString(),
});

// presenceState() → { Marcelo: { online, room, mic, sharing, manual } }.
// Con dos dispositivos abiertos se toma el que está en una sala.
export const summarizePresence = (state = {}) => {
  const summary = {};
  Object.entries(state).forEach(([key, metas]) => {
    if (!TEAM_MEMBERS.includes(key) || !Array.isArray(metas) || metas.length === 0) return;
    const inRoom = metas.find((meta) => meta?.room) || null;
    const latestManual = metas
      .map((meta) => meta?.manual)
      .filter(Boolean)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] || null;
    summary[key] = {
      online: true,
      room: inRoom?.room || null,
      mic: Boolean(inRoom?.mic),
      sharing: Boolean(inRoom?.sharing),
      manual: latestManual,
    };
  });
  return summary;
};

// { 'Mesa común': ['Edson', 'Luis'] }
export const groupByRoom = (presence = {}) => {
  const rooms = {};
  Object.entries(presence).forEach(([member, info]) => {
    if (!info?.room) return;
    (rooms[info.room] ||= []).push(member);
  });
  return rooms;
};
