// El store real con un Supabase simulado: guardados parciales y deshacer.
// Ejecutar: node --import ./tests/helpers/store-loader.mjs tests/store_updates.test.mjs
import assert from 'assert';
import { calls, rows } from './helpers/fakeSupabaseClient.mjs';
import { messages } from './helpers/fakeToast.mjs';

globalThis.fetch = async () => ({ ok: false, json: async () => ({ code: 'EMAIL_NOT_CONFIGURED', message: 'falta RESEND_API_KEY' }) });

const { default: useStore } = await import('../src/hooks/useStore.js');

console.log('Running store update tests...');

const original = {
  id: 'p1',
  name: 'Lanzamiento Cayenne',
  client: 'Carbono',
  status: 'Completado',
  state: 'entregado',
  startDate: '2026-09-09',
  deadline: '2026-09-15',
  manager: 'Luis',
  type: 'evento',
  properties: { stage: 'edicion', managers: ['Luis'], registrationType: 'evento', recordingDates: ['2026-09-09'] },
};
rows.set('p1', original);
await useStore.getState().fetchProjects();
assert.strictEqual(useStore.getState().projects.length, 1);

// Galería: solo cambia el link del entregable.
const before = useStore.getState().projects[0];
const result = await useStore.getState().updateProject({
  id: 'p1',
  properties: { ...before.properties, deliverableLink: 'https://drive.google.com/file/d/abc/view' },
});
assert.ok(result.ok);
const sent = calls.filter((c) => c.op === 'update').at(-1).payload;
assert.strictEqual(sent.startDate, '2026-09-09', 'no borra la fecha de inicio');
assert.strictEqual(sent.deadline, '2026-09-15', 'no borra la fecha de entrega');
assert.strictEqual(sent.manager, 'Luis', 'no borra el responsable');
assert.strictEqual(sent.properties.deliverableLink, 'https://drive.google.com/file/d/abc/view');
assert.strictEqual(useStore.getState().projects[0].status, 'Completado');

// "Stuck" se guarda tal cual.
await useStore.getState().updateProject({ ...useStore.getState().projects[0], status: 'Stuck' });
assert.strictEqual(calls.filter((c) => c.op === 'update').at(-1).payload.properties.status, 'Stuck');
assert.strictEqual(useStore.getState().projects[0].status, 'Stuck');

// Asignar un responsable nuevo avisa y, si falla el correo, lo muestra.
await useStore.getState().updateProject({ ...useStore.getState().projects[0], managers: ['Luis', 'Edson'], manager: 'Luis' });
await new Promise((r) => setTimeout(r, 0));
assert.ok(
  messages.some(([type, msg]) => type === 'error' && /Edson/.test(msg) && /no está configurado/.test(msg)),
  'avisa en pantalla que el correo no salió'
);

// Eliminar y deshacer.
const removed = await useStore.getState().deleteProject('p1');
assert.ok(removed.ok && removed.project);
assert.strictEqual(useStore.getState().projects.length, 0);
const restored = await useStore.getState().restoreProject(removed.project);
assert.ok(restored.ok);
assert.strictEqual(useStore.getState().projects.length, 1);
assert.strictEqual(rows.get('p1').startDate, '2026-09-09');

// Ausencias heredadas pasan a la fase propia.
rows.set('abs', { id: 'abs', name: 'NO ESTÁ MARCELO', client: 'Interno', status: 'Programado', manager: '', properties: { stage: 'grabacion', recordingDates: ['2026-11-06'] } });
await useStore.getState().fetchProjects();
assert.strictEqual(useStore.getState().projects.find((p) => p.id === 'abs').stage, 'ausencia');
assert.deepStrictEqual(useStore.getState().projects.find((p) => p.id === 'abs').managers, ['Marcelo'], 'la persona sale del nombre');

// Una sola consulta aunque se pida dos veces a la vez.
const before2 = calls.filter((c) => c.op === null).length;
await Promise.all([useStore.getState()._fetchProjects(), useStore.getState()._fetchProjects()]);
assert.strictEqual(calls.filter((c) => c.op === null).length - before2, 1);

// Solo columnas reales de projects: un campo de más (como recordingEndTime en
// la fase 1) hace que Supabase rechace todos los guardados.
const PROJECT_COLUMNS = new Set([
  'id', 'name', 'client', 'type', 'status', 'manager', 'deadline', 'team', 'description', 'comments',
  'properties', 'startDate', 'ingreso', 'notes', 'resources', 'costos', 'income', 'state', 'current_cycle',
  'billing_status',
]);
const rodaje = useStore.getState().projects.find((p) => p.id === 'p1');
await useStore.getState().updateProject({ ...rodaje, recordingTime: '09:00', recordingEndTime: '12:30' });
await useStore.getState().addProject({ name: 'Nuevo rodaje', client: 'X', managers: ['Luis'], recordingTime: '10:00', recordingEndTime: '11:00', properties: {} }, { skipNotifications: true });
calls
  .filter((c) => c.op === 'update' || c.op === 'insert')
  .forEach((c) => {
    (Array.isArray(c.payload) ? c.payload : [c.payload]).forEach((payload) => {
      const unknown = Object.keys(payload).filter((key) => !PROJECT_COLUMNS.has(key));
      assert.deepStrictEqual(unknown, [], `columnas que no existen en projects (${c.op})`);
    });
  });
const savedUpdate = calls.filter((c) => c.op === 'update').at(-1).payload;
assert.strictEqual(savedUpdate.properties.recordingEndTime, '12:30', 'la hora de fin se guarda en properties');

console.log('All store update tests passed.');
process.exit(0);
