// Pruebas de las correcciones del reporte de QA (fechas, clientes, ausencias,
// métricas, cruces de agenda y entrega estimada).
// Ejecutar: node --import ./tests/helpers/extensionless.mjs tests/qa_fixes.test.mjs
import assert from 'assert';
import {
  sanitizeRecordingDates,
  parseProjectDate,
  buildDashboardData,
  extractProjectInfo,
  isProjectInPeriod,
  computeTurnaroundByFormat,
  estimateDeliveryDate,
  getFormatLabel,
} from '../src/utils/dashboardHelpers.js';
import { canonicalizeProjectClients, getClientKey } from '../src/utils/clients.js';
import { isAbsenceProject, getAbsenceMembersFromName } from '../src/utils/absences.js';
import { findProjectConflicts, findUpcomingConflicts } from '../src/utils/scheduleConflicts.js';
import { normalizeStatus, getStatusLabel, STATUS_OPTIONS } from '../src/utils/statusHelpers.js';
import { getMemberInitials, getMemberNameForUser } from '../src/constants/team.js';
import { getMemberAgenda } from '../src/lib/office/status.js';

console.log('Running QA fixes tests...');

// ─── Fechas: el año tipeado a medias (0002) no se acepta ─────────────────────
assert.deepStrictEqual(sanitizeRecordingDates(['0002-10-10', '2026-10-10']), ['2026-10-10']);
assert.strictEqual(parseProjectDate('0002-10-10'), null);
assert.strictEqual(parseProjectDate('2026-10-10').getFullYear(), 2026);

// ─── Estados: una sola lista, "Stuck" se guarda y se muestra en español ──────
assert.strictEqual(normalizeStatus('Stuck'), 'Stuck');
assert.strictEqual(normalizeStatus('En edición'), 'En progreso', '"En edición" ya no cae en Programado');
assert.strictEqual(getStatusLabel('Stuck'), 'Atascado');
assert.deepStrictEqual(
  STATUS_OPTIONS.map((o) => o.value),
  ['Programado', 'En progreso', 'En revisión', 'Completado', 'Stuck']
);

// ─── Clientes duplicados ──────────────────────────────────────────────────────
const clientProjects = canonicalizeProjectClients([
  { id: '1', client: 'Fuso' },
  { id: '2', client: 'Fuso' },
  { id: '3', client: 'FUSO' },
  { id: '4', client: 'Interno' },
  { id: '5', client: 'Interno' },
  { id: '6', client: 'Propio' },
  { id: '7', client: 'GY Service' },
  { id: '8', client: 'Gy service' },
  { id: '9', client: 'GY Service' },
]);
assert.deepStrictEqual(
  clientProjects.map((p) => p.client),
  ['Fuso', 'Fuso', 'Fuso', 'Interno', 'Interno', 'Interno', 'GY Service', 'GY Service', 'GY Service']
);
assert.strictEqual(getClientKey('Propio'), getClientKey('interno'));

// ─── Ausencias ────────────────────────────────────────────────────────────────
const legacyAbsence = {
  id: 'abs1',
  name: 'NO ESTÁ MARCELO',
  client: 'Interno',
  status: 'Programado',
  stage: 'grabacion',
  managers: ['Marcelo'],
  recordingDates: ['2026-10-10', '2026-10-11'],
};
assert.ok(isAbsenceProject(legacyAbsence));
assert.ok(isAbsenceProject({ name: 'Vacaciones', stage: 'ausencia' }));
assert.ok(!isAbsenceProject({ name: 'No está claro el guion', client: 'Fuso' }));
assert.deepStrictEqual(getAbsenceMembersFromName('NO ESTÁ EDSON'), ['Edson']);

// ─── Métricas del panel: mismo criterio para KPIs y lista del periodo ────────
const sep = new Date(2026, 8, 1);
const dashboardProjects = [
  // Entregado en septiembre; se marcó completado en octubre (no debe contar en octubre).
  { id: 'a', name: 'Fuso 03 SEP', client: 'Fuso', status: 'Completado', startDate: '2026-09-03', deadline: '2026-09-05', properties: { completedAt: '2026-10-02T10:00:00Z' }, managers: ['Edson'] },
  // Ausencia completada: no cuenta como entrega ni como grabación.
  { ...legacyAbsence, id: 'b', status: 'Completado', recordingDates: ['2026-09-18', '2026-09-19'] },
  // Grabación programada de Mauricio: cuenta en la carga del equipo.
  { id: 'c', name: 'Obra Mitsu', client: 'Mitsubishi', status: 'Programado', stage: 'grabacion', startDate: '2026-09-22', recordingDates: ['2026-09-22'], managers: ['Mauricio'] },
];
const sepData = buildDashboardData(dashboardProjects, sep);
assert.strictEqual(sepData.totals.delivered, 1);
const periodCompleted = dashboardProjects.filter(
  (p) => !isAbsenceProject(p) && isProjectInPeriod(extractProjectInfo(p), sep) && p.status === 'Completado'
);
assert.strictEqual(periodCompleted.length, sepData.totals.delivered, 'Entregados = completados de la lista');
assert.ok(sepData.periodProjects.every((p) => !isAbsenceProject(p)));
assert.strictEqual(sepData.managerLoad.find((m) => m.manager === 'Mauricio').total, 1);
assert.ok(sepData.managerLoad.some((m) => m.manager === 'Luis' && m.total === 0), 'muestra a todo el equipo');
assert.strictEqual(sepData.recordingsByWeek.length, 8, 'semanas sin grabaciones también aparecen');
assert.strictEqual(sepData.recordingsByWeek.reduce((sum, w) => sum + w.total, 0), 1, 'solo la grabación de Mauricio; la ausencia no suma');

const octData = buildDashboardData(dashboardProjects, new Date(2026, 9, 1));
assert.strictEqual(octData.totals.delivered, 0, '"Fuso 03 SEP" ya no aparece en octubre');
assert.ok(!octData.periodProjects.some((p) => p.id === 'a'));
assert.strictEqual(getFormatLabel('grabacion'), 'Grabación');

// ─── Cruces de agenda ─────────────────────────────────────────────────────────
const agenda = [
  { id: 'boda', name: 'Registro Boda', stage: 'grabacion', managers: ['Marcelo'], recordingDates: ['2026-10-10'] },
  legacyAbsence,
];
const draft = { name: 'Nuevo spot', stage: 'grabacion', managers: ['Marcelo', 'Luis'], recordingDates: ['2026-10-10'] };
const conflicts = findProjectConflicts(draft, agenda);
assert.strictEqual(conflicts.length, 2, 'choca con la boda y con la ausencia');
assert.ok(conflicts.every((c) => c.member === 'Marcelo' && c.day === '2026-10-10'));
assert.strictEqual(findProjectConflicts({ ...draft, id: 'boda' }, agenda).length, 1, 'no choca consigo mismo');
const upcoming = findUpcomingConflicts([...agenda, { ...draft, id: 'spot' }], new Date(2026, 9, 7));
assert.strictEqual(upcoming.length, 1);
assert.strictEqual(upcoming[0].entries.length, 3);

// ─── Entrega estimada con el promedio del formato ────────────────────────────
const history = [5, 9, 13].map((days, i) => ({
  id: `h${i}`,
  status: 'Completado',
  registrationType: 'evento',
  startDate: '2026-06-01',
  properties: { completedAt: `2026-06-${String(1 + days).padStart(2, '0')}` },
}));
const turnaround = computeTurnaroundByFormat(history);
assert.strictEqual(turnaround[0].avgDays, 9);
const estimate = estimateDeliveryDate(
  { id: 'n', status: 'Programado', registrationType: 'evento', stage: 'grabacion', recordingDates: ['2026-10-10', '2026-10-11'] },
  turnaround
);
assert.strictEqual(estimate.days, 9);
assert.strictEqual(estimate.date.getDate(), 20, 'cuenta desde el último día de rodaje');
assert.strictEqual(estimateDeliveryDate({ registrationType: 'evento', startDate: '2026-10-10', deadline: '2026-10-30' }, turnaround), null);

// ─── Avatares y disponibilidad ────────────────────────────────────────────────
assert.strictEqual(getMemberInitials('Marcelo'), 'Ma');
assert.strictEqual(getMemberInitials('mauricio'), 'Mu');
assert.strictEqual(getMemberNameForUser({ email: 'hola@cerezoperu.com', user_metadata: {} }), 'Marcelo');
assert.strictEqual(getMemberAgenda(agenda, 'Marcelo', new Date(2026, 9, 10, 10)).kind, 'fuera');
assert.strictEqual(getMemberAgenda(agenda.slice(0, 1), 'Marcelo', new Date(2026, 9, 10, 10)).kind, 'grabacion');

console.log('All QA fixes tests passed.');
