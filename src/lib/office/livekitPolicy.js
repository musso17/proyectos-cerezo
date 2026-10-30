// Reglas del token de LiveKit (sin dependencias del navegador, para poder
// probarlas en Node).
import { OFFICE_ROOMS, isOfficeRoom } from './rooms';

// Salas fijas de la oficina, más las llamadas entre dos integrantes
// ("Llamada Edson y Marcelo"). Cualquier otro nombre se rechaza.
export const ALLOWED_ROOMS = OFFICE_ROOMS.map(({ id }) => id);

// Vida corta: limita el daño de un token filtrado. LiveKit renueva el token
// de las sesiones ya conectadas, así que no corta llamadas en curso.
export const TOKEN_TTL = '10m';

// Micrófono y pantalla compartida (con su audio). Sin cámara.
export const PUBLISH_SOURCES = ['microphone', 'screen_share', 'screen_share_audio'];

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

export const isAllowedRoom = (room) => isOfficeRoom(room);

// identity = <usuario>:<dispositivo>. La misma persona en la laptop y el
// teléfono no se expulsa a sí misma; dos pestañas del mismo navegador sí
// comparten identidad y la app lo avisa en vez de reconectar en bucle.
export const buildIdentity = (userId, deviceId) => {
  const device = DEVICE_ID_PATTERN.test(deviceId || '') ? deviceId : 'web';
  return `${userId}:${device}`;
};

export const getUserIdFromIdentity = (identity = '') => identity.split(':')[0];

// Nombre y metadatos los fija el servidor; sin canUpdateOwnMetadata el
// participante no puede cambiarlos (no puede hacerse pasar por otro).
export const buildParticipantMetadata = ({ member, userId, avatarColor }) =>
  JSON.stringify({
    member,
    userId,
    avatarColor: /^#[0-9a-fA-F]{6}$/.test(avatarColor || '') ? avatarColor : null,
  });

// `toTrackSource` convierte el nombre al enum TrackSource del SDK del
// servidor (con strings, AccessToken.toJwt lanza un error).
export const buildVideoGrant = (room, toTrackSource = (source) => source) => ({
  roomJoin: true,
  room,
  canPublish: true,
  canPublishSources: PUBLISH_SOURCES.map(toTrackSource),
  canPublishData: true,
  canSubscribe: true,
  canUpdateOwnMetadata: false,
});
