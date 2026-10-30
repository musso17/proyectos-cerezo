// Uso de las salas a partir de office_room_events (webhook de LiveKit):
// minutos del mes contra el plan gratis y meta de adopción para pasar al mapa.
import { addDays, format, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { TEAM_MEMBERS } from '../../constants/team';

// Plan Build de LiveKit Cloud: minutos-participante al mes.
export const LIVEKIT_FREE_MINUTES = 5000;
export const USAGE_WARNING_RATIO = 0.8;

// Una sesión sin "participant_left" (p. ej. el webhook falló) se cuenta hasta
// este tope en vez de hasta ahora.
const MAX_OPEN_SESSION_MS = 12 * 60 * 60 * 1000;

const sessionKey = (event) => `${event.user_id || event.member || '?'}|${event.room || ''}`;

// Minutos-participante entre `from` y `to` (pares joined/left por persona y sala).
export const computeParticipantMinutes = (events = [], { from, to = new Date() }) => {
  const fromMs = from.getTime();
  const toMs = to.getTime();
  const open = new Map();
  let total = 0;
  const add = (start, end) => {
    const clipped = Math.min(end, toMs) - Math.max(start, fromMs);
    if (clipped > 0) total += clipped;
  };

  const sorted = [...events].sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at));
  sorted.forEach((event) => {
    const time = Date.parse(event.occurred_at);
    if (Number.isNaN(time)) return;
    if (event.event === 'participant_joined') {
      open.set(sessionKey(event), time);
    } else if (event.event === 'participant_left') {
      const key = sessionKey(event);
      if (open.has(key)) {
        add(open.get(key), time);
        open.delete(key);
      }
    } else if (event.event === 'room_finished') {
      open.forEach((start, key) => {
        if (key.endsWith(`|${event.room || ''}`)) {
          add(start, time);
          open.delete(key);
        }
      });
    }
  });
  open.forEach((start) => add(start, Math.min(toMs, start + MAX_OPEN_SESSION_MS)));
  return Math.round(total / 60000);
};

const countBusinessDays = (from, to) => {
  let days = 0;
  for (let day = startOfDay(from); day <= to; day = addDays(day, 1)) {
    const weekday = day.getDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return Math.max(days, 1);
};

export const summarizeMonthUsage = (events = [], now = new Date(), members = TEAM_MEMBERS.length) => {
  const from = startOfMonth(now);
  const minutes = computeParticipantMinutes(events, { from, to: now });
  const ratio = minutes / LIVEKIT_FREE_MINUTES;
  return {
    minutes,
    limit: LIVEKIT_FREE_MINUTES,
    ratio,
    warning: ratio >= USAGE_WARNING_RATIO,
    perPersonPerBusinessDay: Math.round(minutes / members / countBusinessDays(from, now)),
  };
};

// Meta: 3 de 4 personas entran a una sala 3 días por semana, 2 semanas seguidas.
export const ADOPTION_GOAL = { members: 3, daysPerWeek: 3, weeks: 2 };

export const summarizeAdoption = (events = [], now = new Date()) => {
  const currentWeek = startOfWeek(now, { weekStartsOn: 1 });
  const weeks = [2, 1, 0].map((ago) => {
    const start = addDays(currentWeek, -7 * ago);
    const end = addDays(start, 7);
    const days = Object.fromEntries(TEAM_MEMBERS.map((member) => [member, new Set()]));
    events.forEach((event) => {
      if (event.event !== 'participant_joined' || !days[event.member]) return;
      const time = new Date(event.occurred_at);
      if (time >= start && time < end) days[event.member].add(format(time, 'yyyy-MM-dd'));
    });
    const daysByMember = Object.fromEntries(Object.entries(days).map(([member, set]) => [member, set.size]));
    const activeMembers = Object.values(daysByMember).filter((count) => count >= ADOPTION_GOAL.daysPerWeek).length;
    return {
      start,
      current: ago === 0,
      daysByMember,
      activeMembers,
      met: activeMembers >= ADOPTION_GOAL.members,
    };
  });
  const completed = weeks.filter((week) => !week.current);
  return { weeks, goalMet: completed.length >= ADOPTION_GOAL.weeks && completed.every((week) => week.met) };
};
