import { AccessToken, TrackSource } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';
import { requireTeamMember } from '../../../lib/auth/teamAuth';
import {
  TOKEN_TTL,
  buildIdentity,
  buildParticipantMetadata,
  buildVideoGrant,
  isAllowedRoom,
} from '../../../lib/office/livekitPolicy';

export const dynamic = 'force-dynamic';

const TRACK_SOURCES = {
  microphone: TrackSource.MICROPHONE,
  screen_share: TrackSource.SCREEN_SHARE,
  screen_share_audio: TrackSource.SCREEN_SHARE_AUDIO,
};

const json = (body, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// POST { room, deviceId } con Authorization: Bearer <access_token de Supabase>.
// La identidad y el nombre los decide el servidor a partir de la sesión.
export async function POST(req) {
  const auth = await requireTeamMember(req);
  if (auth.response) return auth.response;
  const { user, member } = auth;

  let body = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Cuerpo inválido.' }, 400);
  }

  const room = (body.room || '').toString();
  if (!isAllowedRoom(room)) return json({ error: 'Sala no permitida.' }, 403);

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    return json({ error: 'Credenciales de LiveKit no configuradas en el servidor' }, 500);
  }

  const identity = buildIdentity(user.id, body.deviceId);
  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: member,
    ttl: TOKEN_TTL,
    metadata: buildParticipantMetadata({
      member,
      userId: user.id,
      avatarColor: user.user_metadata?.avatar_color,
    }),
  });
  at.addGrant(buildVideoGrant(room, (source) => TRACK_SOURCES[source]));

  return json({ token: await at.toJwt(), identity, member });
}

// El GET anterior (sin autenticación) queda cerrado.
export async function GET() {
  return json({ error: 'Usa POST con tu sesión.' }, 405);
}
