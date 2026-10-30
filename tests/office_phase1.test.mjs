// Fase 1 de la oficina: estado desde la agenda, salas y llamadas, presencia y uso.
// Ejecutar: node --import ./tests/helpers/extensionless.mjs tests/office_phase1.test.mjs
import assert from 'assert';
import {
  getMemberAgenda,
  getRecordingWindow,
  isManualActive,
  resolveStatus,
  statusMutesMic,
} from '../src/lib/office/status.js';
import {
  COMMON_ROOM,
  buildCallRoom,
  buildJoinLink,
  buildWhatsAppLink,
  isOfficeRoom,
  parseCallRoom,
} from '../src/lib/office/rooms.js';
import { isAllowedRoom } from '../src/lib/office/livekitPolicy.js';
import { buildPresencePayload, groupByRoom, summarizePresence } from '../src/lib/office/presence.js';
import { computeParticipantMinutes, summarizeAdoption, summarizeMonthUsage } from '../src/lib/office/usage.js';

console.log('Running office phase 1 tests...');

// ─── Estado desde la agenda ───────────────────────────────────────────────────
const at = (hour, minute = 0) => new Date(2026, 10, 3, hour, minute); // martes 3 nov 2026
const shoot = {
  id: 'rodaje',
  name: 'Spot Hilux',
  stage: 'grabacion',
  managers: ['Edson'],
  recordingDates: ['2026-11-03'],
  recordingTime: '09:00',
  recordingEndTime: '12:30',
  recordingLocation: 'Miraflores',
};
const editing = { id: 'edicion', name: 'Recap Fuso', stage: 'edicion', status: 'En progreso', managers: ['Edson'], deadline: '2026-11-10' };
const absence = { id: 'aus', name: 'Vacaciones', stage: 'ausencia', managers: ['Luis'], startDate: '2026-11-02', deadline: '2026-11-06' };
const agenda = [shoot, editing, absence];

// Bug: antes todos arrancaban en "Editando". Sin agenda → Disponible.
assert.strictEqual(getMemberAgenda(agenda, 'Mauricio', at(10)).kind, 'disponible');
assert.strictEqual(getMemberAgenda([], 'Marcelo', at(10)).line, 'Disponible');

// Rodaje en curso, con la frase pedida.
const during = getMemberAgenda(agenda, 'Edson', at(10));
assert.strictEqual(during.kind, 'grabacion');
assert.strictEqual(during.line, 'En rodaje · Spot Hilux · Miraflores desde 9:00');

// Bug: el rodaje contaba todo el día aunque terminara al mediodía.
assert.strictEqual(getMemberAgenda(agenda, 'Edson', at(13)).kind, 'editando', 'después del rodaje vuelve a edición');
assert.strictEqual(getMemberAgenda(agenda, 'Edson', at(13)).line, 'Editando · Recap Fuso');

// Antes de empezar: estado base y aviso del rodaje que viene.
const before = getMemberAgenda(agenda, 'Edson', at(8));
assert.strictEqual(before.kind, 'editando');
assert.strictEqual(before.next.line, 'Rodaje a las 9:00 · Spot Hilux · Miraflores');

// Sin hora de fin: 4 horas desde el inicio. Sin hora de inicio: todo el día.
assert.deepStrictEqual(getRecordingWindow({ recordingTime: '15:00' }), { start: 900, end: 1140, allDay: false });
assert.strictEqual(getRecordingWindow({}).allDay, true);
assert.strictEqual(getMemberAgenda([{ ...shoot, recordingTime: '' }], 'Edson', at(18)).kind, 'grabacion');

// Ausencia → Fuera, con el motivo.
assert.strictEqual(getMemberAgenda(agenda, 'Luis', at(10)).line, 'Fuera · Vacaciones');

// Bug: se calculaba una sola vez al día. Ahora es una función del momento.
assert.notStrictEqual(getMemberAgenda(agenda, 'Edson', at(10)).kind, getMemberAgenda(agenda, 'Edson', at(13)).kind);

// Elegido a mano: vale solo ese día. (Bug: "Fuera" al completar tareas ya no existe.)
const manual = { value: 'ocupado', date: '2026-11-03' };
assert.ok(isManualActive(manual, at(10)));
assert.ok(!isManualActive(manual, new Date(2026, 10, 4, 9)), 'al día siguiente vuelve a la agenda');
assert.strictEqual(resolveStatus({ agenda: during, manual, now: at(10) }).line, 'Ocupado');
assert.strictEqual(resolveStatus({ agenda: during, manual, now: new Date(2026, 10, 4, 9) }).kind, 'grabacion');
assert.ok(statusMutesMic('ocupado') && statusMutesMic('grabacion'));
assert.ok(!statusMutesMic('disponible') && !statusMutesMic('editando'));

// ─── Salas y llamadas ─────────────────────────────────────────────────────────
assert.strictEqual(buildCallRoom('Marcelo', 'Edson'), 'Llamada Edson y Marcelo');
assert.strictEqual(buildCallRoom('Edson', 'Marcelo'), buildCallRoom('Marcelo', 'Edson'), 'misma sala en ambos sentidos');
assert.deepStrictEqual(parseCallRoom('Llamada Edson y Marcelo'), ['Edson', 'Marcelo']);
assert.strictEqual(parseCallRoom('Llamada Marcelo y Edson'), null, 'solo el orden canónico');
assert.strictEqual(parseCallRoom('Llamada Edson y Francisco'), null, 'solo integrantes del equipo');
assert.strictEqual(parseCallRoom('Llamada Edson y Edson'), null);
assert.ok(isOfficeRoom(COMMON_ROOM) && isOfficeRoom('General') && isOfficeRoom('Carbono'));
assert.ok(isAllowedRoom('Llamada Edson y Marcelo'));
assert.ok(!isAllowedRoom('otra') && !isAllowedRoom(''));
assert.strictEqual(buildJoinLink('https://x.app', COMMON_ROOM), 'https://x.app/?sala=Mesa%20com%C3%BAn');
assert.strictEqual(buildWhatsAppLink('+51 999 888 777', 'hola'), 'https://wa.me/51999888777?text=hola');
assert.strictEqual(buildWhatsAppLink('', 'hola y chau'), 'https://wa.me/?text=hola%20y%20chau', 'sin número: elegir contacto');

// ─── Presencia ────────────────────────────────────────────────────────────────
const payload = buildPresencePayload({ member: 'Edson', manual: null, voice: { room: null, mic: true } });
assert.strictEqual(payload.mic, false, 'sin sala no hay micrófono abierto');
const presence = summarizePresence({
  Edson: [{ room: null }, { room: COMMON_ROOM, mic: true, sharing: false }],
  Luis: [{ room: COMMON_ROOM, mic: false, manual: { value: 'ocupado', date: '2026-11-03' } }],
  Francisco: [{ room: COMMON_ROOM }],
});
assert.deepStrictEqual(Object.keys(presence).sort(), ['Edson', 'Luis'], 'solo el equipo');
assert.strictEqual(presence.Edson.room, COMMON_ROOM, 'toma el dispositivo que está en una sala');
assert.strictEqual(presence.Luis.manual.value, 'ocupado');
assert.deepStrictEqual(groupByRoom(presence), { [COMMON_ROOM]: ['Edson', 'Luis'] });

// ─── Uso y meta de adopción ───────────────────────────────────────────────────
const ev = (event, member, iso, room = COMMON_ROOM) => ({ event, member, user_id: member, room, occurred_at: iso });
const events = [
  ev('participant_joined', 'Edson', '2026-11-02T14:00:00Z'),
  ev('participant_left', 'Edson', '2026-11-02T15:00:00Z'),
  ev('participant_joined', 'Luis', '2026-11-02T14:30:00Z'),
  ev('room_finished', null, '2026-11-02T15:30:00Z'),
  ev('participant_joined', 'Marcelo', '2026-10-31T23:30:00Z'),
  ev('participant_left', 'Marcelo', '2026-11-01T00:30:00Z'),
];
const novFrom = new Date('2026-11-01T00:00:00Z');
assert.strictEqual(computeParticipantMinutes(events, { from: novFrom, to: new Date('2026-11-03T00:00:00Z') }), 60 + 60 + 30);
const usage = summarizeMonthUsage(events, new Date(2026, 10, 3, 12));
assert.strictEqual(usage.limit, 5000);
assert.ok(!usage.warning);

const weekDay = (offset, member) => ev('participant_joined', member, new Date(2026, 10, 2 + offset, 10).toISOString());
const busyWeek = (shift) =>
  ['Edson', 'Luis', 'Marcelo'].flatMap((member) => [0, 1, 2].map((d) => weekDay(d + shift, member)));
const adoption = summarizeAdoption([...busyWeek(-14), ...busyWeek(-7)], new Date(2026, 10, 3, 12));
assert.strictEqual(adoption.weeks.length, 3);
assert.ok(adoption.weeks[0].met && adoption.weeks[1].met);
assert.ok(adoption.goalMet, '3 personas, 3 días, 2 semanas seguidas');
assert.ok(!summarizeAdoption(busyWeek(-7), new Date(2026, 10, 3, 12)).goalMet, 'una sola semana no alcanza');

console.log('All office phase 1 tests passed.');
