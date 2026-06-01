import { AccessToken } from 'livekit-server-sdk';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const room = req.nextUrl.searchParams.get('room');
  const username = req.nextUrl.searchParams.get('username');
  const displayName = req.nextUrl.searchParams.get('displayName');

  if (!room || !username) {
    return NextResponse.json({ error: 'Faltan los parámetros "room" o "username"' }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Credenciales de LiveKit no configuradas en el servidor' }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: username,
    name: displayName || username.split('@')[0],
  });

  at.addGrant({ roomJoin: true, room: room, canPublish: true, canSubscribe: true });

  const token = await at.toJwt();
  
  return NextResponse.json({ token });
}
