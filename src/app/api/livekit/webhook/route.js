import { WebhookReceiver } from 'livekit-server-sdk';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getUserIdFromIdentity } from '../../../../lib/office/livekitPolicy';

export const dynamic = 'force-dynamic';

// Webhook de LiveKit Cloud → tabla office_room_events. Sirve para medir el uso
// de las salas (línea base y meta de adopción). Solo entradas y salidas: sin
// audio, sin contenido, sin emails.
const TRACKED_EVENTS = new Set(['participant_joined', 'participant_left', 'room_finished']);

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yoszuiotyyckvirlbleh.supabase.co';

export async function POST(req) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit no configurado' }, { status: 503 });
  }

  // Firma verificada sobre el cuerpo crudo (nunca skipAuth).
  let event;
  try {
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    event = await receiver.receive(await req.text(), req.headers.get('authorization') || undefined);
  } catch (error) {
    return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
  }

  if (!TRACKED_EVENTS.has(event.event)) return NextResponse.json({ ok: true, ignored: true });
  if (!serviceKey) {
    console.error('[livekit-webhook] Falta SUPABASE_SERVICE_ROLE_KEY: evento no guardado.');
    return NextResponse.json({ ok: true, stored: false });
  }

  const supabase = createClient(SUPABASE_URL, serviceKey, { auth: { persistSession: false } });
  const identity = event.participant?.identity || null;
  const { error } = await supabase.from('office_room_events').upsert(
    {
      event_id: event.id,
      event: event.event,
      room: event.room?.name || null,
      user_id: identity ? getUserIdFromIdentity(identity) : null,
      member: event.participant?.name || null,
      occurred_at: new Date(Number(event.createdAt || 0) * 1000 || Date.now()).toISOString(),
    },
    { onConflict: 'event_id', ignoreDuplicates: true }
  );
  if (error) {
    console.error('[livekit-webhook] No se pudo guardar el evento:', error.message);
    // 500 → LiveKit reintenta; el upsert por event_id evita duplicados.
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
