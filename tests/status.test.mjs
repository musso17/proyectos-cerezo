import assert from 'assert';
import { normalizeStatus, ALLOWED_STATUSES, buildStatusUpdatePayload } from '../src/utils/statusHelpers.js';

console.log('Running status helper tests...');

// normalizeStatus tests
assert.strictEqual(normalizeStatus('completado'), 'Completado');
assert.strictEqual(normalizeStatus('Finalizado'), 'Completado');
assert.strictEqual(normalizeStatus('en progreso'), 'En progreso');
assert.strictEqual(normalizeStatus('EN CURSO'), 'En progreso');
assert.strictEqual(normalizeStatus('revision'), 'En revisión');
assert.strictEqual(normalizeStatus('EN REVISIÓN'), 'En revisión');
assert.strictEqual(normalizeStatus('cancelado'), 'Programado');
assert.strictEqual(normalizeStatus(undefined), 'Programado');
assert.deepStrictEqual(ALLOWED_STATUSES, ['Programado', 'En progreso', 'En revisión', 'Completado']);

// buildStatusUpdatePayload tests
const project = { id: 'p1', name: 'Test', status: 'Programado' };
const payload = buildStatusUpdatePayload(project, 'En progreso');
assert.strictEqual(payload.id, 'p1');
assert.strictEqual(payload.status, 'En progreso');

console.log('All tests passed.');
