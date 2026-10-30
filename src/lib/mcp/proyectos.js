// Herramientas MCP para crear proyectos y gestionar tareas y contratos mensuales (retainers).
//
// Todo lo que decide qué se guarda vive aquí en funciones puras (sin red ni base de datos) para poder probarlas con
// tests/mcp_proyectos.test.mjs. El registro de las herramientas recibe la base de datos por inyección.
//
// El formato de los proyectos sigue al del tablero (useStore.prepareProjectForSupabase / normalizeProject) para que un
// proyecto creado desde aquí se vea igual que uno creado a mano: calendario, dashboards y contador de retainers.
import { randomUUID } from 'crypto';
import { z } from 'zod';

export const ALLOWED_STATUSES = ['Programado', 'En progreso', 'En revisión', 'Completado', 'Stuck'];
export const TEAM = ['Marcelo', 'Mauricio', 'Edson', 'Luis'];
export const TIPOS = ['spot', 'evento', 'contenido', 'lanzamiento']; // = REGISTRATION_TYPES de ModalDetalles
export const ETAPAS = ['grabacion', 'fotografia', 'edicion']; // = STAGES de ModalDetalles
export const ETAPAS_TAREA = ['preproduccion', 'rodaje', 'edicion', 'diseno', 'revision', 'entrega', 'otro'];

const ETIQUETA_ETAPA = {
  preproduccion: 'Preproducción', rodaje: 'Rodaje', edicion: 'Edición', diseno: 'Diseño', revision: 'Revisión', entrega: 'Entrega', otro: '',
};

export class ErrorValidacion extends Error {}

// ─── utilidades ─────────────────────────────────────────────────────────────────
export const esFechaValida = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; // rechaza 2026-02-30
};

export const norm = (s) =>
  (s ?? '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

const diaSemana = (s) => new Date(`${s}T00:00:00Z`).getUTCDay(); // 0 domingo … 6 sábado

const unicos = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

// ─── tareas ─────────────────────────────────────────────────────────────────────
// El tablero solo muestra `text` y `completed`, así que el responsable y la fecha también van en el texto visible;
// los campos estructurados (assignee, dueDate, stage) son los que usan las herramientas.
export function normalizarTarea(t, { ahora = new Date(), genId = randomUUID } = {}) {
  const texto = (t?.texto ?? '').toString().trim();
  if (!texto) throw new ErrorValidacion('Cada tarea necesita un texto.');
  if (t.fecha_limite && !esFechaValida(t.fecha_limite)) {
    throw new ErrorValidacion(`La fecha límite de la tarea «${texto}» debe ser una fecha real en formato YYYY-MM-DD.`);
  }
  const etapa = t.etapa || null;
  const detalle = [t.responsable, t.fecha_limite ? `vence ${t.fecha_limite}` : null].filter(Boolean).join(' · ');
  const prefijo = etapa && ETIQUETA_ETAPA[etapa] ? `[${ETIQUETA_ETAPA[etapa]}] ` : '';
  const conAtributos = Boolean(t.responsable || t.fecha_limite || etapa);
  return {
    id: genId(),
    text: conAtributos ? `${prefijo}${texto}${detalle ? ` — ${detalle}` : ''}` : texto, // sin atributos = igual que antes
    title: texto,
    completed: false,
    createdAt: ahora.toISOString(),
    assignee: t.responsable || null,
    dueDate: t.fecha_limite || null,
    stage: etapa,
    source: 'asistente',
  };
}

export const describirTarea = (t) => {
  const quien = t.assignee ? t.assignee : 'sin responsable';
  const cuando = t.dueDate ? ` · vence ${t.dueDate}` : '';
  const etapa = t.stage && ETIQUETA_ETAPA[t.stage] ? `[${ETIQUETA_ETAPA[t.stage]}] ` : '';
  return `${t.completed ? '✅' : '⏳'} ${etapa}${t.title || t.text} — ${quien}${cuando}`;
};

// ─── proyectos ──────────────────────────────────────────────────────────────────
export function construirProyecto(input, { genId = randomUUID, ahora = new Date() } = {}) {
  const errores = [];
  const nombre = (input.nombre ?? '').toString().trim();
  const cliente = (input.cliente ?? '').toString().trim();
  if (!nombre) errores.push('Falta el nombre del proyecto.');
  if (!cliente) errores.push('Falta el cliente.');

  for (const [campo, valor] of [['fecha_inicio', input.fecha_inicio], ['fecha_entrega', input.fecha_entrega]]) {
    if (valor && !esFechaValida(valor)) errores.push(`${campo} debe ser una fecha real en formato YYYY-MM-DD.`);
  }
  const grabaciones = unicos(input.fechas_grabacion);
  const malas = grabaciones.filter((d) => !esFechaValida(d));
  if (malas.length) errores.push(`Fechas de grabación inválidas: ${malas.join(', ')} (usa YYYY-MM-DD).`);
  const recordingDates = grabaciones.filter(esFechaValida).sort();

  const etapa = input.etapa || (recordingDates.length ? 'grabacion' : 'edicion');
  const inicio = input.fecha_inicio || recordingDates[0] || null;
  if (!inicio && errores.length === 0) errores.push('Indica fecha_inicio o fechas_grabacion: el tablero cuenta el proyecto en el mes de su fecha de inicio.');
  const entrega = input.fecha_entrega || null;
  if (inicio && entrega && esFechaValida(inicio) && esFechaValida(entrega) && entrega < inicio) {
    errores.push(`La entrega (${entrega}) no puede ser anterior al inicio (${inicio}).`);
  }
  if (entrega && recordingDates.length && esFechaValida(entrega) && entrega < recordingDates[recordingDates.length - 1]) {
    errores.push(`La entrega (${entrega}) es anterior al último día de grabación (${recordingDates[recordingDates.length - 1]}).`);
  }

  let tareas = [];
  try {
    tareas = (input.tareas || []).map((t) => normalizarTarea(t, { genId, ahora }));
  } catch (e) {
    if (e instanceof ErrorValidacion) errores.push(e.message);
    else throw e;
  }
  if (errores.length) throw new ErrorValidacion(errores.join('\n'));

  const avisos = [];
  if (entrega && [0, 6].includes(diaSemana(entrega))) avisos.push(`La entrega (${entrega}) cae en fin de semana.`);
  for (const t of tareas) {
    if (entrega && t.dueDate && t.dueDate > entrega) avisos.push(`La tarea «${t.title}» vence (${t.dueDate}) después de la entrega (${entrega}).`);
    if (inicio && t.dueDate && t.dueDate < inicio && etapa !== 'edicion') avisos.push(`La tarea «${t.title}» vence (${t.dueDate}) antes del inicio (${inicio}).`);
  }

  const managers = unicos(input.encargados);
  const properties = {
    stage: etapa,
    state: etapa,
    ...(input.tipo ? { registrationType: input.tipo } : {}),
    ...(managers.length ? { managers } : {}),
    ...(entrega ? { deadline: entrega, fecha_entrega: entrega } : {}),
    ...(recordingDates.length ? { fechaGrabacion: recordingDates[0], recordingDates } : {}),
    ...(input.hora ? { recordingTime: input.hora } : {}),
    ...(input.ubicacion ? { recordingLocation: input.ubicacion } : {}),
    ...(input.descripcion ? { recordingDescription: input.descripcion } : {}),
    ...(tareas.length ? { tasks: tareas } : {}),
    origen: 'asistente-mcp',
  };
  const payload = {
    id: genId(),
    name: nombre,
    client: cliente,
    manager: managers.join(', '),
    status: input.estado || 'Programado',
    type: input.tipo || null,
    startDate: inicio,
    deadline: entrega,
    state: etapa,
    properties,
  };
  return { payload, avisos };
}

export const buscarDuplicado = (existentes, { nombre, cliente }) =>
  (existentes || []).filter(
    (p) => norm(p.client) === norm(cliente) && norm(p.name) === norm(nombre) && norm(p.status) !== 'completado'
  );

// ─── contratos mensuales ────────────────────────────────────────────────────────
export const esDelCliente = (p, cliente) => {
  const n = norm(cliente);
  return Boolean(n) && (norm(p.client) === n || norm(p.properties?.tag) === n);
};

// Igual que el tablero (CarbonoMonthList): cuenta el proyecto en el mes de su startDate, sin importar el estado.
export const proyectosDelMes = (projects, cliente, mes) =>
  (projects || []).filter((p) => esDelCliente(p, cliente) && (p.startDate || '').toString().slice(0, 7) === mes);

export const retainerDe = (retainers, cliente) =>
  (retainers || []).find((r) => norm(r.client) === norm(cliente) || norm(r.tag) === norm(cliente)) || null;

export const mesActualLima = (ahora = new Date()) => new Date(ahora.getTime() - 5 * 3600e3).toISOString().slice(0, 7);

const soles = (n) => (Number.isFinite(Number(n)) ? `S/ ${Number(n).toLocaleString('en-US')}` : '—');

export const describirRetainer = (r) =>
  `• ${r.client} — ${r.monthly != null ? `${soles(r.monthly)} al mes` : 'monto no registrado'} — ` +
  `${r.proyectosMensuales != null ? `${r.proyectosMensuales} proyectos/mes` : 'volumen no registrado'} — ` +
  `${r.startDate || '—'} → ${r.endDate || 'sin fecha de fin'}`;

// ─── registro de herramientas ───────────────────────────────────────────────────
const tareaSchema = z.object({
  texto: z.string().describe('Qué hay que hacer. Ej.: "Editar reel 1 (corte final)".'),
  responsable: z.enum(TEAM).optional().describe('Quién lo hace.'),
  fecha_limite: z.string().optional().describe('Fecha límite INTERNA, YYYY-MM-DD.'),
  etapa: z.enum(ETAPAS_TAREA).optional().describe('Fase: preproduccion, rodaje, edicion, diseno, revision, entrega u otro.'),
});

export function registerProjectTools(server, { getDb, ok, fail }) {
  const conDb = (fn) => async (args) => {
    try {
      return await fn(getDb(), args);
    } catch (e) {
      if (e instanceof ErrorValidacion) return fail(e.message);
      return fail(e.message || String(e));
    }
  };

  const cargarProyecto = async (db, project_id, columnas = 'id,name,properties') => {
    const { data, error } = await db.from('projects').select(columnas).eq('id', project_id).single();
    if (error || !data) throw new ErrorValidacion('No se encontró el proyecto con ese ID.');
    return data;
  };

  const guardarTareas = async (db, proyecto, tareas) => {
    const { error } = await db.from('projects').update({ properties: { ...(proyecto.properties || {}), tasks: tareas } }).eq('id', proyecto.id);
    if (error) throw error;
  };

  // 1) Crear proyecto (cualquier etapa), con responsables, fechas y tareas
  server.tool(
    'crear_proyecto',
    'Crea un proyecto nuevo en el tablero (grabación, fotografía o edición) con cliente, tipo, encargados, fechas y tareas asignadas ' +
      '(cada tarea con responsable, fecha límite interna y etapa). Usa solo_validar:true para revisar sin crear nada. ' +
      'Rechaza duplicados (mismo cliente y nombre, no completado) salvo permitir_duplicado:true.',
    {
      nombre: z.string().describe('Nombre del proyecto.'),
      cliente: z.string().describe('Cliente (igual que en el tablero, ej. "Carbono").'),
      tipo: z.enum(TIPOS).optional().describe('Tipo de registro: spot, evento, contenido o lanzamiento.'),
      etapa: z.enum(ETAPAS).optional().describe('Etapa inicial: grabacion, fotografia o edicion. Por defecto: grabacion si hay fechas de grabación, si no edicion.'),
      estado: z.enum(ALLOWED_STATUSES).optional().describe('Estado (por defecto Programado).'),
      encargados: z.array(z.enum(TEAM)).optional().describe('Responsables del proyecto.'),
      fecha_inicio: z.string().optional().describe('Inicio, YYYY-MM-DD. Si falta, se usa el primer día de grabación. El tablero cuenta el proyecto en el mes de esta fecha.'),
      fecha_entrega: z.string().optional().describe('Fecha de entrega comprometida (deadline), YYYY-MM-DD.'),
      fechas_grabacion: z.array(z.string()).optional().describe('Días de grabación, YYYY-MM-DD.'),
      hora: z.string().optional().describe('Hora de grabación, ej. "10:00".'),
      ubicacion: z.string().optional().describe('Lugar de grabación.'),
      descripcion: z.string().optional().describe('Detalle o notas del proyecto.'),
      tareas: z.array(tareaSchema).max(30).optional().describe('Tareas iniciales con responsable y fecha límite interna.'),
      solo_validar: z.boolean().optional().describe('true = validar y mostrar qué se crearía, sin guardar.'),
      permitir_duplicado: z.boolean().optional().describe('true = crear aunque ya exista un proyecto activo con el mismo cliente y nombre.'),
    },
    conDb(async (db, input) => {
      const { payload, avisos } = construirProyecto(input);
      if (!input.permitir_duplicado) {
        const { data, error } = await db.from('projects').select('id,name,client,status').ilike('client', escapeLike(payload.client));
        if (error) throw error;
        const dup = buscarDuplicado(data, { nombre: payload.name, cliente: payload.client });
        if (dup.length) {
          return fail(`Ya existe ${dup.length === 1 ? 'un proyecto activo' : 'proyectos activos'} con ese cliente y nombre: ` +
            `${dup.map((p) => `"${p.name}" [${p.status}] (id: ${p.id})`).join('; ')}. Si es otro trabajo, repite con permitir_duplicado:true.`);
        }
      }
      const tareas = payload.properties.tasks || [];
      const resumen =
        `"${payload.name}" para ${payload.client} · etapa ${payload.state} · estado ${payload.status}` +
        `${payload.manager ? ` · encargados: ${payload.manager}` : ''} · inicio ${payload.startDate}${payload.deadline ? ` · entrega ${payload.deadline}` : ''}` +
        `${tareas.length ? `\nTareas (${tareas.length}):\n${tareas.map((t) => `  - ${describirTarea(t)}`).join('\n')}` : ''}` +
        `${avisos.length ? `\nAvisos:\n${avisos.map((a) => `  ⚠️ ${a}`).join('\n')}` : ''}`;
      if (input.solo_validar) return ok(`🔎 Validado, NO se creó nada. Se crearía:\n${resumen}`);
      const { data, error } = await db.from('projects').insert([payload]).select().single();
      if (error) throw error;
      return ok(`✅ Proyecto creado (id: ${data.id}):\n${resumen}`);
    })
  );

  // 2) Agregar una tarea (ahora con responsable, fecha límite y etapa; compatible con el uso anterior)
  server.tool(
    'agregar_tarea',
    'Agrega una tarea a un proyecto (se guarda en properties.tasks). Opcionalmente con responsable, fecha límite interna y etapa.',
    {
      project_id: z.string().describe('ID del proyecto.'),
      texto: z.string().describe('Texto de la tarea o nota.'),
      responsable: z.enum(TEAM).optional().describe('Quién la hace.'),
      fecha_limite: z.string().optional().describe('Fecha límite interna, YYYY-MM-DD.'),
      etapa: z.enum(ETAPAS_TAREA).optional().describe('preproduccion, rodaje, edicion, diseno, revision, entrega u otro.'),
    },
    conDb(async (db, { project_id, texto, responsable, fecha_limite, etapa }) => {
      const p = await cargarProyecto(db, project_id);
      const tarea = normalizarTarea({ texto, responsable, fecha_limite, etapa });
      await guardarTareas(db, p, [...(Array.isArray(p.properties?.tasks) ? p.properties.tasks : []), tarea]);
      return ok(`✅ Tarea agregada a "${p.name}": ${describirTarea(tarea)}`);
    })
  );

  // 3) Agregar varias tareas de una vez
  server.tool(
    'agregar_tareas',
    'Agrega varias tareas a un proyecto en una sola operación, cada una con responsable, fecha límite interna y etapa.',
    {
      project_id: z.string().describe('ID del proyecto.'),
      tareas: z.array(tareaSchema).min(1).max(30).describe('Tareas a agregar.'),
    },
    conDb(async (db, { project_id, tareas }) => {
      const p = await cargarProyecto(db, project_id);
      const nuevas = tareas.map((t) => normalizarTarea(t)); // si una falla, no se guarda ninguna
      await guardarTareas(db, p, [...(Array.isArray(p.properties?.tasks) ? p.properties.tasks : []), ...nuevas]);
      return ok(`✅ ${nuevas.length} tarea(s) agregadas a "${p.name}":\n${nuevas.map((t) => `  - ${describirTarea(t)} (id: ${t.id})`).join('\n')}`);
    })
  );

  // 4) Listar tareas (por proyecto, cliente o responsable)
  server.tool(
    'listar_tareas',
    'Lista tareas de los proyectos. Filtros: proyecto, cliente, responsable, estado (pendientes/completadas/todas) y vencimiento. Ordenadas por fecha límite.',
    {
      project_id: z.string().optional().describe('Solo las tareas de este proyecto.'),
      cliente: z.string().optional().describe('Solo proyectos de este cliente (parcial).'),
      responsable: z.enum(TEAM).optional().describe('Solo tareas asignadas a esta persona.'),
      estado: z.enum(['pendientes', 'completadas', 'todas']).optional().describe('Por defecto: pendientes.'),
      vencen_antes: z.string().optional().describe('Solo tareas con fecha límite hasta este día (YYYY-MM-DD).'),
      limite: z.number().int().min(1).max(200).optional().describe('Máximo de tareas (default 50).'),
    },
    conDb(async (db, { project_id, cliente, responsable, estado = 'pendientes', vencen_antes, limite = 50 }) => {
      if (vencen_antes && !esFechaValida(vencen_antes)) throw new ErrorValidacion('vencen_antes debe ser YYYY-MM-DD.');
      let q = db.from('projects').select('id,name,client,status,properties');
      if (project_id) q = q.eq('id', project_id);
      const { data, error } = await q.limit(1000);
      if (error) throw error;
      const filas = [];
      for (const p of data || []) {
        if (cliente && !norm(p.client).includes(norm(cliente))) continue;
        for (const t of Array.isArray(p.properties?.tasks) ? p.properties.tasks : []) {
          if (estado === 'pendientes' && t.completed) continue;
          if (estado === 'completadas' && !t.completed) continue;
          if (responsable && t.assignee !== responsable) continue;
          if (vencen_antes && !(t.dueDate && t.dueDate <= vencen_antes)) continue;
          filas.push({ p, t });
        }
      }
      filas.sort((a, b) => (a.t.dueDate || '9999').localeCompare(b.t.dueDate || '9999'));
      if (!filas.length) return ok('No hay tareas con esos filtros.');
      const vistas = filas.slice(0, limite);
      return ok(`${filas.length} tarea(s)${filas.length > vistas.length ? ` (mostrando ${vistas.length})` : ''}:\n` +
        vistas.map(({ p, t }) => `• ${describirTarea(t)} — proyecto: "${p.name}" (${p.client || '—'}) [tarea id: ${t.id} · proyecto id: ${p.id}]`).join('\n'));
    })
  );

  // 5) Completar / reabrir una tarea
  server.tool(
    'completar_tarea',
    'Marca una tarea como completada (o la reabre con completada:false).',
    {
      project_id: z.string().describe('ID del proyecto.'),
      task_id: z.string().describe('ID de la tarea (lo devuelve listar_tareas).'),
      completada: z.boolean().optional().describe('true (por defecto) = completada; false = reabrir.'),
    },
    conDb(async (db, { project_id, task_id, completada = true }) => {
      const p = await cargarProyecto(db, project_id);
      const tareas = Array.isArray(p.properties?.tasks) ? p.properties.tasks : [];
      const t = tareas.find((x) => String(x.id) === String(task_id));
      if (!t) throw new ErrorValidacion('No se encontró esa tarea en el proyecto.');
      await guardarTareas(db, p, tareas.map((x) => (x === t ? { ...x, completed: completada } : x)));
      return ok(`${completada ? '✅ Completada' : '↩️ Reabierta'}: ${describirTarea({ ...t, completed: completada })} (proyecto "${p.name}")`);
    })
  );

  // 6) Contratos mensuales
  server.tool(
    'listar_retainers',
    'Lista los contratos mensuales (retainers) registrados: cliente, monto mensual, proyectos por mes y vigencia.',
    {},
    conDb(async (db) => {
      const { data, error } = await db.from('retainers').select('*');
      if (error) throw new Error(`No pude leer la tabla retainers: ${error.message}`);
      if (!data?.length) return ok('No hay retainers registrados.');
      return ok(`${data.length} retainer(s):\n${data.map(describirRetainer).join('\n')}`);
    })
  );

  // 7) Consumo del contrato en un mes
  server.tool(
    'consumo_mensual_cliente',
    'Cuántos proyectos tiene un cliente en un mes y cuánto le queda de su volumen contratado (retainer). Cuenta igual que el tablero: por mes de la fecha de inicio.',
    {
      cliente: z.string().describe('Cliente, ej. "Carbono".'),
      mes: z.string().optional().describe('Mes YYYY-MM (por defecto, el mes actual en Lima).'),
    },
    conDb(async (db, { cliente, mes }) => {
      const mesRef = mes || mesActualLima();
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mesRef)) throw new ErrorValidacion('mes debe ser YYYY-MM.');
      const { data, error } = await db.from('projects').select('id,name,client,status,startDate,properties').limit(1000);
      if (error) throw error;
      const delMes = proyectosDelMes(data, cliente, mesRef);
      let retainer = null;
      let nota = '';
      const r = await db.from('retainers').select('*');
      if (r.error) nota = `\n(No pude leer retainers: ${r.error.message})`;
      else retainer = retainerDe(r.data, cliente);
      const contratados = retainer?.proyectosMensuales != null ? Number(retainer.proyectosMensuales) : null;
      let cabecera = `${cliente} · ${mesRef}: ${delMes.length} proyecto(s)`;
      if (contratados != null && Number.isFinite(contratados)) {
        const quedan = contratados - delMes.length;
        cabecera += ` de ${contratados} contratados → ${quedan >= 0 ? `quedan ${quedan}` : `EXCEDE en ${-quedan}`}`;
      } else {
        cabecera += retainer ? ' (el retainer no tiene volumen mensual registrado)' : ' (sin retainer registrado para este cliente)';
      }
      const lista = delMes.map((p) => `  • ${p.name} [${p.status || '—'}] — inicio ${(p.startDate || '—').toString().slice(0, 10)} (id: ${p.id})`).join('\n');
      return ok(`${cabecera}${retainer ? `\nContrato: ${describirRetainer(retainer).slice(2)}` : ''}${lista ? `\n${lista}` : ''}${nota}`);
    })
  );
}
