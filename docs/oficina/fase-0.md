# Oficina virtual · Fase 0 (seguridad y base)

## Qué cambió en el código

| Antes | Ahora |
|---|---|
| `GET /api/livekit?username=…` entregaba un token de 6 h a cualquiera, para cualquier sala y con cualquier nombre. | `POST /api/livekit` exige la sesión de Supabase y que el email esté en el equipo. Solo las salas `General` y `Carbono`, token de 10 min, nombre y color los fija el servidor, sin cámara, con pantalla compartida y su audio. |
| `/api/notifications/email` mandaba correos desde `notificaciones@cerezoperu.com` a cualquier dirección, sin sesión. | Exige sesión del equipo y solo envía a correos del equipo. |
| La ruta MCP quedaba abierta si faltaba `MCP_SECRET`. | Sin `MCP_SECRET` queda cerrada (salvo en desarrollo local). |
| Francisco podía entrar a las salas. | No ve el botón de salas y el servidor le niega el token. |
| Abrir la sala en otra pestaña o dispositivo cerraba todo. | Laptop y teléfono no se expulsan (identidad por dispositivo); con dos pestañas del mismo navegador aparece "Abierta en otra pestaña · Usar aquí". |
| Sin datos de uso. | `POST /api/livekit/webhook` guarda entradas y salidas en `office_room_events` (firma de LiveKit verificada). |

Archivos: `src/lib/auth/teamAuth.js`, `src/lib/office/livekitPolicy.js`, `src/utils/authFetch.js`, `src/app/api/livekit/route.js`, `src/app/api/livekit/webhook/route.js`, `supabase/migrations/20261030120000_fase0_seguridad.sql`, `tests/office_phase0.test.mjs`.

## Pasos que te tocan (en este orden)

1. **Supabase → SQL Editor: revisar políticas actuales.**
   ```sql
   select tablename, policyname, roles, cmd, qual, with_check
   from pg_policies where schemaname = 'public'
     and tablename in ('projects', 'room_messages');
   ```
   Si aparece alguna política para `anon` o con `qual = true`, bórrala (`drop policy "<nombre>" on public.<tabla>;`): las políticas se suman, y una abierta anula a las nuevas.
2. **Supabase → SQL Editor: ejecutar** `supabase/migrations/20261030120000_fase0_seguridad.sql`. Al final del archivo está cómo deshacerlo.
3. **Supabase → Authentication → Sign In / Providers:** desactivar *Allow new users to sign up* y *Allow anonymous sign-ins*. Los 4 del equipo y Francisco ya tienen cuenta.
4. **Vercel → Environment Variables** (Production y Preview), y luego *Redeploy*:
   - `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `NEXT_PUBLIC_LIVEKIT_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (para el webhook y el MCP)
   - `MCP_SECRET` (sin él, el conector MCP queda cerrado)
   - `RESEND_API_KEY` (pendiente del reporte de QA)
   - **No** agregar `OFFICE_DEV_AUTH` en Vercel.
5. **LiveKit Cloud → Settings → Webhooks:** agregar `https://<tu-dominio>/api/livekit/webhook` con la misma API key.
6. **LiveKit Cloud → Billing:** activar alertas de uso. Con audio a demanda, el plan gratis (5.000 min/mes) debería alcanzar; la alerta avisa antes del tope duro.
7. **Avisar al equipo** (texto sugerido abajo).

## Probar después del deploy

- Iniciar sesión como integrante → entrar a General: conecta; el nombre y el color se ven igual para todos.
- Iniciar sesión como Francisco: no aparece "Salas de voz".
- `curl -X POST https://<dominio>/api/livekit -d '{"room":"General"}'` → 401.
- `curl -X POST https://<dominio>/api/notifications/email -d '{"to":"x@ejemplo.com"}'` → 401.
- Abrir la sala en dos pestañas: la primera muestra "Abierta en otra pestaña".
- Mandar un mensaje en el chat de la sala: se guarda (si da error, revisar el paso 2).

## Pruebas locales con varias personas (sin cuentas reales)

En `.env.local` agregar `OFFICE_DEV_AUTH=1` y, en cada pestaña, en la consola del navegador:
`localStorage.setItem('cerezo-dev-member', 'Mauricio')` (o Marcelo, Edson, Luis). Solo funciona con `npm run dev`. Para no gastar minutos ni cruzarte con el equipo, usa un servidor LiveKit local (`brew install livekit` → `livekit-server --dev`, `NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880`, `LIVEKIT_API_KEY=devkey`, `LIVEKIT_API_SECRET=secret`).

## Línea base de uso (antes de la Fase 1)

Mensajes de chat por semana en las salas actuales:
```sql
select date_trunc('week', created_at) as semana, room, count(*)
from public.room_messages group by 1, 2 order by 1 desc;
```
Minutos en salas, desde que el webhook esté activo:
```sql
select member, date_trunc('week', occurred_at) as semana, count(*) filter (where event = 'participant_joined') as entradas
from public.office_room_events group by 1, 2 order by 2 desc, 1;
```
Y en LiveKit Cloud → Analytics, los minutos-participante del último mes.

**Meta para pasar al mapa (Fase 2):** 3 de 4 personas usándola 3 días por semana durante 2 semanas.

## Aviso al equipo (borrador)

> Las salas de voz de Cerezo Planner ahora solo están disponibles para el equipo. Cuando entras a una sala, tu audio y tu pantalla compartida se transmiten en vivo por LiveKit Cloud (no se graban ni se transcriben). Guardamos solo cuándo entras y sales de cada sala, para saber si la herramienta se usa; no se usa para evaluar a nadie y se borra a los 6 meses. El chat de las salas se guarda en Supabase. Los datos se procesan fuera del Perú (LiveKit y Supabase). Cualquier duda o pedido de borrado, me escriben.

Conviene confirmarlo con un abogado (Ley 29733 y su reglamento DS 016-2024-JUS) y programar el borrado de `office_room_events` con más de 180 días.
