# Oficina · Fase 1 (sin mapa)

## Qué incluye

- **Panel «Oficina»** (pestaña nueva, solo el equipo). Los 4 siempre visibles con su estado sacado de la agenda: «En rodaje · Spot Hilux · Miraflores desde 9:00», «Editando · Recap Fuso», «Fuera · Vacaciones», «Disponible». Debajo, el rodaje que viene más tarde. El punto verde del avatar indica que la persona tiene la app abierta.
- **Cálculo del estado corregido** (`src/lib/office/status.js`):
  - Ya no arranca en «Editando» para todos: sin agenda, la persona queda «Disponible».
  - Completar tus tareas ya no te pasa a «Fuera».
  - Se recalcula cada minuto, no una vez al día.
  - El rodaje cuenta desde la hora de inicio hasta la **hora de fin**, un campo nuevo en el formulario. Sin hora de fin cuenta 4 h, y sin hora de inicio, todo el día.
  - Lo que elijas a mano (Disponible, Ocupado, En grabación, Fuera) vale hasta el final del día. «Automático» vuelve a la agenda.
- **Salas a demanda:**
  - **Mesa común**, más General y Carbono para llamadas puntuales, y una sala por pareja para «Llamar» (`Llamada Edson y Marcelo`).
  - Quién está en cada sala se ve sin entrar, en el panel y en el botón «Salas».
- **Micrófono:**
  - Se entra siempre silenciado.
  - Con el micrófono abierto y 5 minutos sin hablar, se silencia solo.
  - Pasar a «Ocupado» o «En grabación», a mano o por la agenda, silencia.
  - En la sala se lee «Te escuchan: Edson y Luis».
- **Pantalla compartida:** 1080p a 30 fps con audio (antes iba a 15 fps), priorizando la fluidez para revisar cortes.
- **Llamar / Unirme:**
  - Junto a cada persona aparece «Unirme» si está en una sala, o «Llamar» si no.
  - «Llamar» te mete en la sala de la pareja y abre WhatsApp con el aviso y el enlace (`/?sala=…`).
  - Si la otra persona tiene la app abierta, además le aparece «Marcelo te está llamando · Contestar».
  - No hay notificaciones push.
- **Móvil:**
  - La oficina se ve como lista y hay pestaña «Oficina» en la barra de abajo.
  - La píldora de la sala minimizada ya no tapa el botón «+».
  - Dentro de la sala, el chat ocupa toda la pantalla y se ocultan los proyectos.
- **Uso:**
  - Minutos del mes contra los 5.000 del plan gratis y minutos por persona por día hábil (el plan alcanza para unos 57).
  - Aviso en la app al pasar el 80%.
  - Tabla de la meta para pasar al mapa.

## Pasos que te tocan

1. **Supabase → SQL Editor:** ejecutar `supabase/migrations/20261031120000_fase1_oficina.sql`. Sin esto la app funciona igual, pero sin presencia en vivo (quién está en cada sala) ni números de WhatsApp. El panel lo avisa.
2. **Cada integrante → Ajustes → WhatsApp:** cargar su número con código de país. Sin número, «Llamar» abre WhatsApp para elegir el contacto a mano.
3. **Mergear el PR** para publicar.

## Probar después de publicar

- Abrir la app en dos cuentas (o laptop y teléfono de dos personas). Cada una ve a la otra con punto verde.
- Entrar a «Mesa común»: la otra persona lo ve sin entrar, y la sala arranca silenciada.
- Abrir el micrófono: aparece «Te escuchan: …». Ponerse «Ocupado»: se silencia.
- Compartir una pantalla con un video: en `chrome://webrtc-internals` del que mira, el framesPerSecond del video ronda 30.
- «Llamar» a alguien: se abre WhatsApp con el enlace, y al abrirlo la otra persona entra a la misma sala.

## Costo

- **Minutos:** los 5.000 minutos-participante del plan Build dan unos 57 min por persona por día hábil. Al llegar al tope, LiveKit corta las conexiones nuevas (no cobra). El panel avisa al 80%, porque el plan Build no tiene alertas propias.
- **Datos:** la pantalla compartida a 1080p30 usa hasta unos 5 Mbps por persona que la mira (≈ 2,2 GB por hora). Revisa el límite de transferencia de tu plan en LiveKit → Billing. Si se queda corto, baja a `h1080fps15` o `h720fps30` en `SCREEN_SHARE_PRESET` (`src/components/views/VistaVoiceRoom.jsx`). Con la sala minimizada no se envía la pantalla, gracias a `adaptiveStream` y `dynacast`.

## Meta para pasar al mapa (Fase 2)

3 de 4 personas en una sala 3 días por semana, 2 semanas seguidas. Se ve en el panel (Uso → Meta), calculada con `office_room_events`.

## Seguridad y privacidad

- La presencia viaja por un canal privado (`oficina`) que solo el equipo puede leer y escribir (políticas sobre `realtime.messages`). Francisco no lo ve.
- Los números de WhatsApp quedan en `office_members`, sin acceso directo desde el navegador. Solo se leen con `office_directory()` y cada uno escribe el suyo con `set_my_whatsapp()`.
- Límite conocido: dentro del equipo, alguien con conocimientos técnicos podría publicar presencia a nombre de otro integrante. No da acceso a nada nuevo.
- Al aviso de privacidad de la fase 0 hay que sumarle que se comparte, en vivo, quién tiene la app abierta y en qué sala está.
