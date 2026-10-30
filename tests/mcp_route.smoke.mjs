// Prueba de humo del servidor MCP real (src/app/api/mcp/[transport]/route.js) hablando el protocolo, SIN base de datos.
// Ejecutar: node tests/mcp_route.smoke.mjs
import assert from 'assert';

process.env.MCP_SECRET = 'secreto-de-prueba';
delete process.env.SUPABASE_SERVICE_ROLE_KEY; // sin base de datos: solo se comprueba el protocolo y los esquemas
const { POST } = await import('../src/app/api/mcp/[transport]/route.js');

console.log('Running MCP route smoke test...');

const post = (body, { key = 'secreto-de-prueba', session } = {}) =>
  POST(new Request('http://localhost/api/mcp/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(key ? { authorization: `Bearer ${key}` } : {}),
      ...(session ? { 'mcp-session-id': session } : {}),
    },
    body: JSON.stringify(body),
  }));

const leer = async (res) => {
  const texto = await res.text();
  const linea = texto.split('\n').find((l) => l.startsWith('data:'));
  return JSON.parse(linea ? linea.slice(5) : texto);
};

// sin clave o con clave mala: 401
assert.strictEqual((await post({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { key: null })).status, 401);
assert.strictEqual((await post({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, { key: 'mala' })).status, 401);

// protocolo: initialize → tools/list
const init = await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'humo', version: '0' } } });
assert.strictEqual(init.status, 200);
const initBody = await leer(init);
assert.strictEqual(initBody.result.serverInfo.name, 'cerezo-mcp');
assert.strictEqual(initBody.result.serverInfo.version, '1.1.0');
const session = init.headers.get('mcp-session-id') || undefined;

const lista = await leer(await post({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, { session }));
const nombres = lista.result.tools.map((t) => t.name).sort();
assert.deepStrictEqual(nombres, [
  'actualizar_estado_proyecto', 'actualizar_fechas_proyecto', 'agendar_grabacion', 'agregar_tarea', 'agregar_tareas', 'asignar_encargados',
  'completar_tarea', 'consumo_mensual_cliente', 'crear_proyecto', 'listar_proyectos', 'listar_retainers', 'listar_tareas', 'resumen_semana',
], 'las 7 herramientas de antes (con agregar_tarea ampliada) + las nuevas');

const crear = lista.result.tools.find((t) => t.name === 'crear_proyecto');
assert.deepStrictEqual(crear.inputSchema.required.sort(), ['cliente', 'nombre']);
assert.deepStrictEqual(crear.inputSchema.properties.tipo.enum, ['spot', 'evento', 'contenido', 'lanzamiento']);
assert.deepStrictEqual(crear.inputSchema.properties.encargados.items.enum, ['Marcelo', 'Mauricio', 'Edson', 'Luis']);
const tarea = lista.result.tools.find((t) => t.name === 'agregar_tarea');
assert.deepStrictEqual(tarea.inputSchema.required.sort(), ['project_id', 'texto'], 'agregar_tarea sigue aceptando solo project_id y texto');

// una llamada sin base configurada responde con error claro (no revienta)
const llamada = await leer(await post({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'listar_tareas', arguments: {} } }, { session }));
assert.ok(llamada.result.isError && llamada.result.content[0].text.includes('SUPABASE_SERVICE_ROLE_KEY'));

console.log('MCP route smoke test passed.');
process.exit(0); // mcp-handler deja un recurso abierto: sin esto el proceso no termina solo
