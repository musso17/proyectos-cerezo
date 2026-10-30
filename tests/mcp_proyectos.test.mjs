// Pruebas de src/lib/mcp/proyectos.js con una base de datos simulada en memoria (no toca Supabase).
// Ejecutar: node tests/mcp_proyectos.test.mjs
import assert from 'assert';
import { z } from 'zod';
import {
  esFechaValida, normalizarTarea, construirProyecto, buscarDuplicado, proyectosDelMes, retainerDe, mesActualLima,
  registerProjectTools, ErrorValidacion, describirTarea,
} from '../src/lib/mcp/proyectos.js';
import { FakeDb } from './helpers/fakeDb.mjs';

console.log('Running MCP project tools tests...');

// ─── utilidades ─────────────────────────────────────────────────────────────────
assert.ok(esFechaValida('2026-10-09'));
assert.ok(!esFechaValida('2026-02-30'), 'rechaza días que no existen');
assert.ok(!esFechaValida('09/10/2026'));
assert.ok(!esFechaValida(undefined));
assert.strictEqual(mesActualLima(new Date('2026-10-01T02:00:00Z')), '2026-09', 'a las 21:00 en Lima todavía es setiembre');

let n = 0;
const genId = () => `id-${++n}`;
const ahora = new Date('2026-09-24T12:00:00Z');

// ─── tareas ─────────────────────────────────────────────────────────────────────
const simple = normalizarTarea({ texto: 'Llamar al cliente' }, { genId, ahora });
assert.strictEqual(simple.text, 'Llamar al cliente', 'sin atributos queda igual que antes (compatibilidad)');
assert.strictEqual(simple.completed, false);

const t = normalizarTarea({ texto: 'Editar reel 1', responsable: 'Edson', fecha_limite: '2026-10-06', etapa: 'edicion' }, { genId, ahora });
assert.strictEqual(t.text, '[Edición] Editar reel 1 — Edson · vence 2026-10-06', 'el tablero solo muestra text: debe llevar responsable y fecha');
assert.deepStrictEqual([t.assignee, t.dueDate, t.stage, t.title], ['Edson', '2026-10-06', 'edicion', 'Editar reel 1']);
assert.throws(() => normalizarTarea({ texto: '  ' }), ErrorValidacion);
assert.throws(() => normalizarTarea({ texto: 'x', fecha_limite: '2026-13-01' }), /fecha límite/);

// ─── construirProyecto ──────────────────────────────────────────────────────────
const { payload, avisos } = construirProyecto({
  nombre: 'Reels Audi Q5', cliente: 'Audi', tipo: 'contenido', encargados: ['Marcelo', 'Edson', 'Marcelo'],
  fechas_grabacion: ['2026-10-03', '2026-10-02'], fecha_entrega: '2026-10-09', hora: '10:00', descripcion: '3 reels 9:16',
  tareas: [{ texto: 'Grabar día 1', responsable: 'Marcelo', fecha_limite: '2026-10-02', etapa: 'rodaje' },
           { texto: 'Editar reels', responsable: 'Edson', fecha_limite: '2026-10-12', etapa: 'edicion' }],
}, { genId, ahora });
assert.strictEqual(payload.startDate, '2026-10-02', 'inicio = primer día de grabación');
assert.strictEqual(payload.state, 'grabacion');
assert.strictEqual(payload.manager, 'Marcelo, Edson');
assert.deepStrictEqual(payload.properties.managers, ['Marcelo', 'Edson'], 'sin duplicados');
assert.deepStrictEqual(payload.properties.recordingDates, ['2026-10-02', '2026-10-03']);
assert.strictEqual(payload.properties.fechaGrabacion, '2026-10-02');
assert.strictEqual(payload.properties.deadline, '2026-10-09');
assert.strictEqual(payload.properties.fecha_entrega, '2026-10-09');
assert.strictEqual(payload.deadline, '2026-10-09');
assert.strictEqual(payload.type, 'contenido');
assert.strictEqual(payload.properties.registrationType, 'contenido');
assert.strictEqual(payload.status, 'Programado');
assert.strictEqual(payload.properties.tasks.length, 2);
assert.strictEqual(payload.properties.origen, 'asistente-mcp');
assert.ok(avisos.some((a) => a.includes('Editar reels') && a.includes('después de la entrega')), 'avisa tareas que vencen tras la entrega');

const edicion = construirProyecto({ nombre: 'Post Fuso', cliente: 'Fuso', fecha_inicio: '2026-10-05', fecha_entrega: '2026-10-10' }, { genId });
assert.strictEqual(edicion.payload.state, 'edicion', 'sin grabaciones, la etapa por defecto es edición');
assert.strictEqual(edicion.payload.type, null);
assert.ok(edicion.avisos.some((a) => a.includes('fin de semana')), '2026-10-10 es sábado');
assert.ok(!('tasks' in edicion.payload.properties) && !('managers' in edicion.payload.properties));

assert.throws(() => construirProyecto({ nombre: 'X', cliente: 'Y' }), /fecha_inicio o fechas_grabacion/);
assert.throws(() => construirProyecto({ nombre: 'X', cliente: 'Y', fecha_inicio: '2026-02-30' }), /fecha_inicio debe ser una fecha real/);
assert.throws(() => construirProyecto({ nombre: 'X', cliente: 'Y', fecha_inicio: '2026-10-05', fecha_entrega: '2026-10-01' }), /anterior al inicio/);
assert.throws(() => construirProyecto({ nombre: 'X', cliente: 'Y', fechas_grabacion: ['2026-10-05', '2026-10-07'], fecha_entrega: '2026-10-06' }), /último día de grabación/);
assert.throws(() => construirProyecto({ nombre: ' ', cliente: '' , fecha_inicio: '2026-10-05'}), /nombre[\s\S]*cliente/);

// ─── duplicados y contratos mensuales ───────────────────────────────────────────
const existentes = [
  { id: 'a', name: 'Reels Audi Q5', client: 'AUDI', status: 'En progreso' },
  { id: 'b', name: 'Reels Audi Q5', client: 'Audi', status: 'Completado' },
];
assert.deepStrictEqual(buscarDuplicado(existentes, { nombre: 'reels audi q5', cliente: 'Audi' }).map((p) => p.id), ['a'], 'ignora mayúsculas y completados');

const proyectos = [
  { id: '1', name: 'A', client: 'Carbono', startDate: '2026-09-02', status: 'Completado' },
  { id: '2', name: 'B', client: 'Otro', properties: { tag: 'carbono' }, startDate: '2026-09-15T00:00:00', status: 'En progreso' },
  { id: '3', name: 'C', client: 'Carbono', startDate: '2026-08-30', status: 'Completado' },
  { id: '4', name: 'D', client: 'Fuso', startDate: '2026-09-10', status: 'Programado' },
  { id: '5', name: 'E', client: 'Carbono', startDate: null, status: 'Programado' },
];
assert.deepStrictEqual(proyectosDelMes(proyectos, 'Carbono', '2026-09').map((p) => p.id), ['1', '2'], 'igual que el tablero: mes de startDate, cualquier estado, cuenta la etiqueta');
assert.strictEqual(retainerDe([{ client: 'carbono', proyectosMensuales: 5 }], 'Carbono').proyectosMensuales, 5);
assert.strictEqual(retainerDe([], 'Carbono'), null);

// ─── herramientas con base simulada ─────────────────────────────────────────────
const tools = {};
const server = { tool: (name, _desc, schema, handler) => { tools[name] = { schema: z.object(schema), handler }; } };
const ok = (text) => ({ content: [{ type: 'text', text }] });
const fail = (text) => ({ content: [{ type: 'text', text: `⚠️ ${text}` }], isError: true });
let db = new FakeDb();
registerProjectTools(server, { getDb: () => db, ok, fail });
const call = async (name, args) => {
  const parsed = tools[name].schema.parse(args); // el mismo esquema zod que valida el servidor real
  const res = await tools[name].handler(parsed);
  return { text: res.content[0].text, error: Boolean(res.isError) };
};

assert.deepStrictEqual(Object.keys(tools).sort(),
  ['agregar_tarea', 'agregar_tareas', 'completar_tarea', 'consumo_mensual_cliente', 'crear_proyecto', 'listar_retainers', 'listar_tareas']);

// crear_proyecto: validar sin crear, crear, duplicado, forzar duplicado
const base = { nombre: 'Reels Audi Q5', cliente: 'Audi', tipo: 'contenido', encargados: ['Marcelo'], fechas_grabacion: ['2026-10-02'], fecha_entrega: '2026-10-09',
  tareas: [{ texto: 'Grabar', responsable: 'Marcelo', fecha_limite: '2026-10-02', etapa: 'rodaje' }] };
let r = await call('crear_proyecto', { ...base, solo_validar: true });
assert.ok(!r.error && r.text.includes('NO se creó nada') && r.text.includes('Grabar'));
assert.strictEqual(db.tables.projects.length, 0, 'solo_validar no escribe');
assert.strictEqual(db.writes.length, 0);

r = await call('crear_proyecto', base);
assert.ok(!r.error && r.text.startsWith('✅ Proyecto creado'), r.text);
assert.strictEqual(db.tables.projects.length, 1);
const creado = db.tables.projects[0];
assert.ok(creado.id && creado.properties.tasks[0].assignee === 'Marcelo' && creado.startDate === '2026-10-02');

r = await call('crear_proyecto', base);
assert.ok(r.error && r.text.includes('Ya existe') && r.text.includes(creado.id), 'no duplica por accidente');
assert.strictEqual(db.tables.projects.length, 1);
r = await call('crear_proyecto', { ...base, permitir_duplicado: true });
assert.ok(!r.error);
assert.strictEqual(db.tables.projects.length, 2);

r = await call('crear_proyecto', { nombre: 'Sin fechas', cliente: 'Z' });
assert.ok(r.error && r.text.includes('fecha_inicio'));
assert.throws(() => tools.crear_proyecto.schema.parse({ nombre: 'X', cliente: 'Y', encargados: ['Pedro'] }), 'solo encargados del equipo');
assert.throws(() => tools.crear_proyecto.schema.parse({ nombre: 'X', cliente: 'Y', tipo: 'boda' }), 'solo tipos que el tablero conoce');

// agregar_tarea: compatible con el uso anterior y con atributos
const pid = creado.id;
r = await call('agregar_tarea', { project_id: pid, texto: 'Nota suelta' });
assert.ok(r.text.includes('Nota suelta'));
assert.strictEqual(creado.properties.tasks.at(-1).text, 'Nota suelta');
r = await call('agregar_tarea', { project_id: pid, texto: 'Cortar reel', responsable: 'Edson', fecha_limite: '2026-10-08', etapa: 'edicion' });
assert.ok(creado.properties.tasks.at(-1).text.startsWith('[Edición] Cortar reel'));
r = await call('agregar_tarea', { project_id: 'no-existe', texto: 'x' });
assert.ok(r.error && r.text.includes('No se encontró el proyecto'));
r = await call('agregar_tarea', { project_id: pid, texto: 'x', fecha_limite: '2026-99-99' });
assert.ok(r.error && r.text.includes('fecha'));

// agregar_tareas: todo o nada
const antes = creado.properties.tasks.length;
r = await call('agregar_tareas', { project_id: pid, tareas: [{ texto: 'Diseño de portada', responsable: 'Luis', etapa: 'diseno' }, { texto: 'mala', fecha_limite: 'mañana' }] });
assert.ok(r.error);
assert.strictEqual(creado.properties.tasks.length, antes, 'si una tarea es inválida no se guarda ninguna');
r = await call('agregar_tareas', { project_id: pid, tareas: [{ texto: 'Diseño de portada', responsable: 'Luis', fecha_limite: '2026-10-05', etapa: 'diseno' }, { texto: 'Revisión interna', responsable: 'Marcelo', etapa: 'revision' }] });
assert.ok(!r.error && r.text.includes('2 tarea(s)'));
assert.strictEqual(new Set(creado.properties.tasks.map((x) => x.id)).size, creado.properties.tasks.length, 'ids únicos');

// listar_tareas y completar_tarea
r = await call('listar_tareas', { responsable: 'Luis' });
assert.ok(r.text.includes('Diseño de portada') && !r.text.includes('Cortar reel'));
r = await call('listar_tareas', { cliente: 'audi', vencen_antes: '2026-10-05' });
assert.ok(r.text.includes('Grabar') && r.text.includes('Diseño de portada') && !r.text.includes('Cortar reel'));
assert.ok(r.text.indexOf('Grabar') < r.text.indexOf('Diseño de portada'), 'ordenadas por fecha límite');
const tareaId = creado.properties.tasks.find((x) => x.title === 'Grabar').id;
r = await call('completar_tarea', { project_id: pid, task_id: tareaId });
assert.ok(r.text.startsWith('✅ Completada'));
r = await call('listar_tareas', { cliente: 'audi' });
assert.ok(!r.text.includes(tareaId), 'la tarea completada sale de pendientes (el proyecto duplicado conserva la suya)');
r = await call('listar_tareas', { estado: 'completadas' });
assert.ok(r.text.includes(tareaId));
r = await call('completar_tarea', { project_id: pid, task_id: tareaId, completada: false });
assert.ok(r.text.startsWith('↩️ Reabierta'));
r = await call('completar_tarea', { project_id: pid, task_id: 'nope' });
assert.ok(r.error);
r = await call('listar_tareas', { responsable: 'Mauricio' });
assert.strictEqual(r.text, 'No hay tareas con esos filtros.');

// contratos mensuales
db = new FakeDb({
  projects: [
    { id: 'p1', name: 'A', client: 'Carbono', status: 'Completado', startDate: '2026-09-02' },
    { id: 'p2', name: 'B', client: 'Carbono', status: 'En progreso', startDate: '2026-09-10' },
    { id: 'p3', name: 'C', client: 'Carbono', status: 'Programado', startDate: '2026-09-20' },
    { id: 'p4', name: 'D', client: 'Carbono', status: 'Programado', startDate: '2026-08-20' },
  ],
  retainers: [{ client: 'Carbono', monthly: 4000, proyectosMensuales: 5, startDate: '2026-01-01', endDate: '' }],
});
r = await call('consumo_mensual_cliente', { cliente: 'Carbono', mes: '2026-09' });
assert.ok(r.text.includes('3 proyecto(s) de 5 contratados → quedan 2'), r.text);
assert.ok(r.text.includes('S/ 4,000 al mes'));
db.tables.projects.push({ id: 'p5', name: 'E', client: 'Carbono', status: 'Programado', startDate: '2026-09-25' }, { id: 'p6', name: 'F', client: 'Carbono', status: 'Programado', startDate: '2026-09-26' }, { id: 'p7', name: 'G', client: 'Carbono', status: 'Programado', startDate: '2026-09-27' });
r = await call('consumo_mensual_cliente', { cliente: 'Carbono', mes: '2026-09' });
assert.ok(r.text.includes('6 proyecto(s) de 5 contratados → EXCEDE en 1'), r.text);
r = await call('consumo_mensual_cliente', { cliente: 'Fuso', mes: '2026-09' });
assert.ok(r.text.includes('0 proyecto(s)') && r.text.includes('sin retainer registrado'));
r = await call('consumo_mensual_cliente', { cliente: 'Carbono', mes: '2026-9' });
assert.ok(r.error && r.text.includes('YYYY-MM'));
r = await call('listar_retainers', {});
assert.ok(r.text.includes('Carbono') && r.text.includes('5 proyectos/mes') && r.text.includes('sin fecha de fin'));

db = new FakeDb({ retainers: null }); // la tabla no existe
r = await call('listar_retainers', {});
assert.ok(r.error && r.text.includes('retainers'));
r = await call('consumo_mensual_cliente', { cliente: 'Carbono', mes: '2026-09' });
assert.ok(!r.error && r.text.includes('No pude leer retainers'), 'sin tabla retainers igual cuenta los proyectos');

console.log('MCP project tools tests passed.');
