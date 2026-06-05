import { createMcpHandler } from 'mcp-handler';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─── Supabase (service role, solo servidor) ────────────────────────────────────
// La URL tiene fallback (igual que config/supabase.js); solo es obligatorio
// configurar SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor (Vercel).
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://yoszuiotyyckvirlbleh.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;

const ALLOWED_STATUSES = ['Programado', 'En progreso', 'En revisión', 'Completado', 'Stuck'];
const TEAM = ['Marcelo', 'Mauricio', 'Edson', 'Luis'];

const ok = (text) => ({ content: [{ type: 'text', text }] });
const fail = (text) => ({ content: [{ type: 'text', text: `⚠️ ${text}` }], isError: true });

const requireDb = () => {
  if (!supabase) throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno de Vercel. Agrégala y haz Redeploy.');
};

const fmtProject = (p) => {
  const managers = Array.isArray(p.properties?.managers)
    ? p.properties.managers.join(', ')
    : p.manager || 'Sin asignar';
  const dias = Array.isArray(p.properties?.recordingDates) ? p.properties.recordingDates : [];
  const fecha = p.properties?.fechaGrabacion || p.startDate || '—';
  const fechaTxt = dias.length > 1 ? `${fecha} (+${dias.length - 1} días)` : fecha;
  return `• ${p.name} [${p.status || '—'}] — cliente: ${p.client || '—'} — encargado: ${managers} — fecha: ${fechaTxt} (id: ${p.id})`;
};

// ─── Handler MCP ────────────────────────────────────────────────────────────────
const handler = createMcpHandler(
  (server) => {
    // 1) Listar proyectos
    server.tool(
      'listar_proyectos',
      'Lista proyectos de Cerezo. Filtros opcionales por cliente, estado o encargado.',
      {
        cliente: z.string().optional().describe('Filtra por nombre de cliente (parcial).'),
        estado: z.enum(ALLOWED_STATUSES).optional().describe('Filtra por estado exacto.'),
        encargado: z.string().optional().describe('Filtra por encargado (Marcelo, Mauricio, Edson, Luis).'),
        limite: z.number().int().min(1).max(100).optional().describe('Máximo de resultados (default 30).'),
      },
      async ({ cliente, estado, encargado, limite }) => {
        try {
          requireDb();
          let query = supabase.from('projects').select('*').limit(limite || 30);
          if (cliente) query = query.ilike('client', `%${cliente}%`);
          if (estado) query = query.eq('status', estado);
          const { data, error } = await query;
          if (error) throw error;

          let rows = data || [];
          if (encargado) {
            const term = encargado.toLowerCase();
            rows = rows.filter((p) => {
              const m = `${p.manager || ''} ${(p.properties?.managers || []).join(' ')}`.toLowerCase();
              return m.includes(term);
            });
          }
          if (rows.length === 0) return ok('No se encontraron proyectos con esos filtros.');
          return ok(`${rows.length} proyecto(s):\n${rows.map(fmtProject).join('\n')}`);
        } catch (e) {
          return fail(e.message);
        }
      }
    );

    // 2) Agendar grabación (crea proyecto en fase grabación)
    server.tool(
      'agendar_grabacion',
      'Crea un proyecto nuevo en fase de grabación con uno o varios días agendados (rodajes de varios días).',
      {
        nombre: z.string().describe('Nombre del proyecto/grabación.'),
        cliente: z.string().describe('Cliente.'),
        fecha: z.string().describe('Día principal de grabación en formato YYYY-MM-DD.'),
        fechas: z.array(z.string()).optional().describe('Días adicionales de grabación (YYYY-MM-DD) para rodajes de varios días. Pueden saltarse fines de semana.'),
        hora: z.string().optional().describe('Hora, ej. "10:00".'),
        encargados: z.array(z.enum(TEAM)).optional().describe('Uno o más encargados responsables (ej. ["Marcelo","Edson"]).'),
        ubicacion: z.string().optional().describe('Ubicación de la grabación.'),
        descripcion: z.string().optional().describe('Detalle o notas.'),
      },
      async ({ nombre, cliente, fecha, fechas, hora, encargados, ubicacion, descripcion }) => {
        try {
          requireDb();
          const allDates = Array.from(new Set([fecha, ...(fechas || [])].filter(Boolean)));
          const invalid = allDates.find((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d));
          if (allDates.length === 0 || invalid) {
            return fail('Cada fecha debe estar en formato YYYY-MM-DD.');
          }
          const recordingDates = allDates.sort();
          const primary = recordingDates[0];
          const managers = Array.from(new Set(encargados || []));
          const payload = {
            id: randomUUID(),
            name: nombre,
            client: cliente,
            manager: managers.join(', '),
            status: 'Programado',
            type: 'grabacion',
            startDate: primary,
            state: 'grabacion',
            properties: {
              stage: 'grabacion',
              state: 'grabacion',
              managers,
              fechaGrabacion: primary,
              recordingDates,
              recordingTime: hora || '',
              recordingLocation: ubicacion || '',
              recordingDescription: descripcion || '',
            },
          };
          const { data, error } = await supabase.from('projects').insert([payload]).select().single();
          if (error) throw error;
          const diasTxt = recordingDates.length > 1
            ? `${recordingDates.length} días (${recordingDates[0]} → ${recordingDates[recordingDates.length - 1]})`
            : `el ${primary}`;
          return ok(`✅ Grabación agendada: "${nombre}" para ${cliente} en ${diasTxt}${hora ? ` a las ${hora}` : ''}${managers.length ? ` con ${managers.join(', ')}` : ''}. (id: ${data.id})`);
        } catch (e) {
          return fail(e.message);
        }
      }
    );

    // 2b) Asignar encargados a un proyecto existente
    server.tool(
      'asignar_encargados',
      'Define los encargados de un proyecto existente (reemplaza la lista actual). Soporta múltiples.',
      {
        project_id: z.string().describe('ID del proyecto.'),
        encargados: z.array(z.enum(TEAM)).describe('Lista de encargados, ej. ["Marcelo","Mauricio"].'),
      },
      async ({ project_id, encargados }) => {
        try {
          requireDb();
          const { data: project, error: e1 } = await supabase
            .from('projects').select('id,name,properties').eq('id', project_id).single();
          if (e1 || !project) return fail('No se encontró el proyecto con ese ID.');
          const managers = Array.from(new Set(encargados || []));
          const nextProperties = { ...(project.properties || {}), managers };
          const { error } = await supabase
            .from('projects')
            .update({ manager: managers.join(', '), properties: nextProperties })
            .eq('id', project_id);
          if (error) throw error;
          return ok(`✅ "${project.name}": encargados → ${managers.length ? managers.join(', ') : 'sin asignar'}.`);
        } catch (e) {
          return fail(e.message);
        }
      }
    );

    // 3) Actualizar estado de proyecto
    server.tool(
      'actualizar_estado_proyecto',
      'Cambia el estado de un proyecto existente.',
      {
        project_id: z.string().describe('ID del proyecto (usa listar_proyectos para obtenerlo).'),
        estado: z.enum(ALLOWED_STATUSES).describe('Nuevo estado.'),
      },
      async ({ project_id, estado }) => {
        try {
          requireDb();
          const { data: current, error: e1 } = await supabase
            .from('projects').select('id,name,status').eq('id', project_id).single();
          if (e1 || !current) return fail('No se encontró el proyecto con ese ID.');
          const { error } = await supabase.from('projects').update({ status: estado }).eq('id', project_id);
          if (error) throw error;
          return ok(`✅ "${current.name}": ${current.status || '—'} → ${estado}.`);
        } catch (e) {
          return fail(e.message);
        }
      }
    );

    // 4) Agregar tarea/nota a un proyecto
    server.tool(
      'agregar_tarea',
      'Agrega una tarea o nota a un proyecto (se guarda en properties.tasks).',
      {
        project_id: z.string().describe('ID del proyecto.'),
        texto: z.string().describe('Texto de la tarea o nota.'),
      },
      async ({ project_id, texto }) => {
        try {
          requireDb();
          const { data: project, error: e1 } = await supabase
            .from('projects').select('id,name,properties').eq('id', project_id).single();
          if (e1 || !project) return fail('No se encontró el proyecto con ese ID.');
          const tasks = Array.isArray(project.properties?.tasks) ? project.properties.tasks : [];
          const newTask = {
            id: Date.now().toString(),
            text: texto,
            completed: false,
            createdAt: new Date().toISOString(),
          };
          const nextProperties = { ...(project.properties || {}), tasks: [...tasks, newTask] };
          const { error } = await supabase.from('projects').update({ properties: nextProperties }).eq('id', project_id);
          if (error) throw error;
          return ok(`✅ Tarea agregada a "${project.name}": "${texto}".`);
        } catch (e) {
          return fail(e.message);
        }
      }
    );

    // 5) Actualizar fechas del proyecto
    server.tool(
      'actualizar_fechas_proyecto',
      'Actualiza las fechas de un proyecto: entrega (deadline), inicio y/o grabación. Indica al menos una.',
      {
        project_id: z.string().describe('ID del proyecto.'),
        fecha_entrega: z.string().optional().describe('Nueva fecha de entrega/deadline (YYYY-MM-DD).'),
        fecha_inicio: z.string().optional().describe('Nueva fecha de inicio (YYYY-MM-DD).'),
        fecha_grabacion: z.string().optional().describe('Nueva fecha de grabación (YYYY-MM-DD).'),
      },
      async ({ project_id, fecha_entrega, fecha_inicio, fecha_grabacion }) => {
        try {
          requireDb();
          const dates = { fecha_entrega, fecha_inicio, fecha_grabacion };
          for (const [k, v] of Object.entries(dates)) {
            if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
              return fail(`La ${k.replace('_', ' ')} debe estar en formato YYYY-MM-DD.`);
            }
          }
          if (!fecha_entrega && !fecha_inicio && !fecha_grabacion) {
            return fail('Indica al menos una fecha a actualizar.');
          }

          const { data: project, error: e1 } = await supabase
            .from('projects').select('id,name,deadline,startDate,properties').eq('id', project_id).single();
          if (e1 || !project) return fail('No se encontró el proyecto con ese ID.');

          const patch = {};
          const changes = [];
          if (fecha_entrega) { patch.deadline = fecha_entrega; changes.push(`entrega → ${fecha_entrega}`); }
          if (fecha_inicio) { patch.startDate = fecha_inicio; changes.push(`inicio → ${fecha_inicio}`); }

          const nextProperties = { ...(project.properties || {}) };
          if (fecha_entrega) { nextProperties.deadline = fecha_entrega; nextProperties.fecha_entrega = fecha_entrega; }
          if (fecha_grabacion) {
            nextProperties.fechaGrabacion = fecha_grabacion;
            changes.push(`grabación → ${fecha_grabacion}`);
          }
          patch.properties = nextProperties;

          const { error } = await supabase.from('projects').update(patch).eq('id', project_id);
          if (error) throw error;
          return ok(`✅ "${project.name}": ${changes.join(', ')}.`);
        } catch (e) {
          return fail(e.message);
        }
      }
    );

    // 6) Resumen de la semana
    server.tool(
      'resumen_semana',
      'Devuelve un resumen del estado actual: conteos por estado, grabaciones próximas y entregas pendientes.',
      {},
      async () => {
        try {
          requireDb();
          const { data, error } = await supabase.from('projects').select('*').limit(500);
          if (error) throw error;
          const rows = data || [];
          const byStatus = {};
          rows.forEach((p) => { byStatus[p.status || '—'] = (byStatus[p.status || '—'] || 0) + 1; });

          const today = new Date().toISOString().slice(0, 10);
          const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
          const proximas = rows.filter((p) => {
            const f = p.properties?.fechaGrabacion || (p.properties?.stage === 'grabacion' ? p.startDate : null);
            return f && f >= today && f <= in7;
          });
          const entregas = rows.filter((p) => p.deadline && p.deadline >= today && p.deadline <= in7 && p.status !== 'Completado');

          const statusLine = Object.entries(byStatus).map(([s, n]) => `${s}: ${n}`).join(' · ');
          let out = `📊 Resumen (${rows.length} proyectos)\nEstados → ${statusLine}\n`;
          out += `\n🎬 Grabaciones próximas (7 días): ${proximas.length}\n${proximas.map(fmtProject).join('\n') || '  ninguna'}`;
          out += `\n\n📦 Entregas pendientes (7 días): ${entregas.length}\n${entregas.map(fmtProject).join('\n') || '  ninguna'}`;
          return ok(out);
        } catch (e) {
          return fail(e.message);
        }
      }
    );
  },
  {
    serverInfo: { name: 'cerezo-mcp', version: '1.0.0' },
  },
  {
    basePath: '/api/mcp',
    maxDuration: 60,
    verboseLogs: true,
  }
);

// ─── Auth por token compartido ──────────────────────────────────────────────────
const authed = async (req) => {
  const secret = process.env.MCP_SECRET;
  // Si no hay secreto configurado, permitir (modo abierto) pero advertir en logs.
  if (!secret) {
    console.warn('[MCP] MCP_SECRET no configurado: el conector está ABIERTO.');
    return handler(req);
  }
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
  const headerKey = req.headers.get('x-api-key');
  const urlKey = new URL(req.url).searchParams.get('key');
  if (bearer === secret || headerKey === secret || urlKey === secret) {
    return handler(req);
  }
  return new Response(JSON.stringify({ error: 'unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
};

export { authed as GET, authed as POST, authed as DELETE };
