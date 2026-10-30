// Fase 0 de la oficina: autorización del equipo, token de LiveKit y correo.
// Ejecutar: node --import ./tests/helpers/extensionless.mjs tests/office_phase0.test.mjs
import assert from 'assert';
import { AccessToken, TrackSource } from 'livekit-server-sdk';
import { requireTeamMember } from '../src/lib/auth/teamAuth.js';
import {
  ALLOWED_ROOMS,
  TOKEN_TTL,
  buildIdentity,
  buildParticipantMetadata,
  buildVideoGrant,
  getUserIdFromIdentity,
  isAllowedRoom,
} from '../src/lib/office/livekitPolicy.js';
import { isTeamUser } from '../src/constants/team.js';

console.log('Running office phase 0 tests...');

const request = (headers = {}, body) =>
  new Request('http://localhost/api/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });

const users = {
  'jwt-marcelo': { id: 'u-marcelo', email: 'hola@cerezoperu.com', user_metadata: { avatar_color: '#ef4444' } },
  'jwt-francisco': { id: 'u-fran', email: 'francisco@carbonomkt.com', user_metadata: {} },
  'jwt-anon': { id: 'u-anon', email: null, is_anonymous: true },
  'jwt-desconocido': { id: 'u-x', email: 'alguien@gmail.com' },
};
const verifyToken = async (jwt) => {
  if (!users[jwt]) throw new Error('invalid');
  return users[jwt];
};

// ─── Autenticación y autorización ─────────────────────────────────────────────
assert.strictEqual((await requireTeamMember(request(), { verifyToken })).response.status, 401, 'sin sesión');
assert.strictEqual((await requireTeamMember(request({ authorization: 'Bearer basura' }), { verifyToken })).response.status, 401);
assert.strictEqual((await requireTeamMember(request({ authorization: 'Bearer jwt-anon' }), { verifyToken })).response.status, 403, 'anónimo');
assert.strictEqual((await requireTeamMember(request({ authorization: 'Bearer jwt-francisco' }), { verifyToken })).response.status, 403, 'Francisco no entra');
assert.strictEqual((await requireTeamMember(request({ authorization: 'Bearer jwt-desconocido' }), { verifyToken })).response.status, 403, 'JWT válido no basta');
const ok = await requireTeamMember(request({ authorization: 'Bearer jwt-marcelo' }), { verifyToken });
assert.strictEqual(ok.member, 'Marcelo');

// La identidad de prueba solo vale en desarrollo con OFFICE_DEV_AUTH=1.
assert.strictEqual((await requireTeamMember(request({ 'x-dev-member': 'Marcelo' }), { verifyToken })).response.status, 401);
const prevEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'development';
process.env.OFFICE_DEV_AUTH = '1';
assert.strictEqual((await requireTeamMember(request({ 'x-dev-member': 'Mauricio' }), { verifyToken })).member, 'Mauricio');
assert.strictEqual((await requireTeamMember(request({ 'x-dev-member': 'Francisco' }), { verifyToken })).response.status, 401);
process.env.NODE_ENV = prevEnv;
delete process.env.OFFICE_DEV_AUTH;

assert.ok(isTeamUser({ email: 'Luis.Matallana.30@gmail.com' }));
assert.ok(!isTeamUser({ email: 'francisco@carbonomkt.com' }));

// ─── Política del token ───────────────────────────────────────────────────────
assert.deepStrictEqual(ALLOWED_ROOMS, ['Mesa común', 'General', 'Carbono'], 'fase 1: se suma la Mesa común');
assert.ok(!isAllowedRoom('cualquier-sala'));
assert.strictEqual(buildIdentity('u1', 'abc123def'), 'u1:abc123def');
assert.strictEqual(buildIdentity('u1', '../malo'), 'u1:web', 'deviceId inválido');
assert.strictEqual(getUserIdFromIdentity('u1:abc123def'), 'u1');
assert.strictEqual(JSON.parse(buildParticipantMetadata({ member: 'Luis', userId: 'u', avatarColor: 'red;x' })).avatarColor, null);

const SOURCES = {
  microphone: TrackSource.MICROPHONE,
  screen_share: TrackSource.SCREEN_SHARE,
  screen_share_audio: TrackSource.SCREEN_SHARE_AUDIO,
};
const at = new AccessToken('key', 'secret'.repeat(6), { identity: buildIdentity('u1', 'device01'), name: 'Marcelo', ttl: TOKEN_TTL });
at.addGrant(buildVideoGrant('General', (s) => SOURCES[s]));
const claims = JSON.parse(Buffer.from((await at.toJwt()).split('.')[1], 'base64url').toString());
assert.strictEqual(claims.exp - claims.nbf, 600, 'TTL de 10 minutos');
assert.deepStrictEqual(claims.video.canPublishSources, ['microphone', 'screen_share', 'screen_share_audio'], 'sin cámara');
assert.strictEqual(claims.video.canUpdateOwnMetadata, false, 'no puede cambiar su nombre');
assert.strictEqual(claims.video.room, 'General');

// ─── Rutas ────────────────────────────────────────────────────────────────────
const livekitRoute = await import('../src/app/api/livekit/route.js');
assert.strictEqual((await livekitRoute.GET()).status, 405, 'el GET abierto ya no existe');
assert.strictEqual((await livekitRoute.POST(request({}, { room: 'General' }))).status, 401, 'token sin sesión');

const emailRoute = await import('../src/app/api/notifications/email/route.js');
const emailRes = await emailRoute.POST(request({}, { to: 'victima@ejemplo.com', subject: 'x' }));
assert.strictEqual(emailRes.status, 401, 'el correo ya no es un relay abierto');

// Con identidad de prueba: destinatario fuera del equipo → 403.
process.env.NODE_ENV = 'development';
process.env.OFFICE_DEV_AUTH = '1';
process.env.RESEND_API_KEY = 're_test';
const outsider = await emailRoute.POST(request({ 'x-dev-member': 'Marcelo' }, { to: 'victima@ejemplo.com', subject: 'x' }));
assert.strictEqual(outsider.status, 403);
assert.strictEqual((await outsider.json()).code, 'RECIPIENT_NOT_ALLOWED');
const { MEMBER_EMAILS } = await import('../src/utils/calendar.js');
assert.strictEqual(MEMBER_EMAILS.marcelo, 'mmusso209817@gmail.com', 'los avisos de Marcelo van a su correo personal');
const realFetch = globalThis.fetch;
const resendCalls = [];
globalThis.fetch = async (url, opts) => {
  resendCalls.push({ url: String(url), body: opts?.body });
  return new Response(JSON.stringify({ id: 'email_test' }), { status: 200, headers: { 'content-type': 'application/json' } });
};
const marceloRes = await emailRoute.POST(request({ 'x-dev-member': 'Marcelo' }, { to: 'mmusso209817@gmail.com', subject: 'x' }));
globalThis.fetch = realFetch;
assert.notStrictEqual(marceloRes.status, 403, 'el correo de avisos de Marcelo está permitido');
assert.ok(resendCalls.some((c) => String(c.body).includes('mmusso209817@gmail.com')), 'se envía al correo personal');
const badRoom = await livekitRoute.POST(request({ 'x-dev-member': 'Marcelo' }, { room: 'otra' }));
assert.strictEqual(badRoom.status, 403, 'sala fuera de la lista');
process.env.LIVEKIT_API_KEY = 'key';
process.env.LIVEKIT_API_SECRET = 'secret'.repeat(6);
const good = await livekitRoute.POST(request({ 'x-dev-member': 'Edson' }, { room: 'Carbono', deviceId: 'laptop01' }));
assert.strictEqual(good.status, 200);
const goodBody = await good.json();
assert.strictEqual(goodBody.member, 'Edson');
assert.strictEqual(goodBody.identity, 'dev-edson:laptop01');

console.log('All office phase 0 tests passed.');
