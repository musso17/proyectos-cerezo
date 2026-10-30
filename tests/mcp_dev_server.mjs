// Servidor MCP de DESARROLLO: las mismas herramientas de src/lib/mcp/proyectos.js sobre una base en memoria (no toca Supabase).
// Sirve para probar clientes (p. ej. el asistente de Cerezo) sin riesgo para los datos reales.
//   node tests/mcp_dev_server.mjs [puerto]      → http://127.0.0.1:<puerto>/api/mcp/mcp   (sin clave)
import http from 'http';
import { createMcpHandler } from 'mcp-handler';
import { registerProjectTools } from '../src/lib/mcp/proyectos.js';
import { FakeDb } from './helpers/fakeDb.mjs';

const PORT = Number(process.argv[2] || process.env.PORT || 8790);
const db = new FakeDb({
  projects: [
    { id: 'demo-1', name: 'Reels setiembre A', client: 'Carbono', status: 'Completado', manager: 'Marcelo', startDate: '2026-09-02', properties: { managers: ['Marcelo'], tasks: [] } },
    { id: 'demo-2', name: 'Reels setiembre B', client: 'Carbono', status: 'En progreso', manager: 'Edson', startDate: '2026-09-09', properties: { managers: ['Edson'], tasks: [] } },
    { id: 'demo-3', name: 'Evento Fuso', client: 'Fuso', status: 'Completado', manager: 'Mauricio', startDate: '2026-08-20', properties: { managers: ['Mauricio'], tasks: [] } },
  ],
  retainers: [{ client: 'Carbono', monthly: 4000, proyectosMensuales: 5, startDate: '2026-01-01', endDate: '' }],
});
const ok = (text) => ({ content: [{ type: 'text', text }] });
const fail = (text) => ({ content: [{ type: 'text', text: `⚠️ ${text}` }], isError: true });
const handler = createMcpHandler(
  (server) => registerProjectTools(server, { getDb: () => db, ok, fail }),
  { serverInfo: { name: 'cerezo-mcp-dev', version: '0.0.0' } },
  { basePath: '/api/mcp', maxDuration: 60 }
);

http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request(`http://127.0.0.1:${PORT}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
  });
  const response = await handler(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (!response.body) return res.end();
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}).listen(PORT, '127.0.0.1', () => console.log(`Servidor MCP de desarrollo en http://127.0.0.1:${PORT}/api/mcp/mcp (base en memoria)`));
