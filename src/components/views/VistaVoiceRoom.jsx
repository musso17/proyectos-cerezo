'use client';

import React, { useEffect, useRef, useState } from 'react';
import useStore from '../../hooks/useStore';
import { supabase } from '../../config/supabase';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
  useTrackVolume,
  useRoomContext,
  useTrackToggle,
  useTracks,
  VideoTrack,
} from '@livekit/components-react';
import { DisconnectReason, ParticipantEvent, ScreenSharePresets, Track } from 'livekit-client';
import '@livekit/components-styles';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  Minimize2,
  Maximize2,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  Send,
  LogOut,
  Users,
  Volume2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DEFAULT_MEMBER_COLOR, MEMBER_COLORS, ensureMemberName, getTeamMemberByEmail } from '../../constants/team';
import { authFetch, getDeviceId } from '../../utils/authFetch';
import { useMyStatus } from '../../hooks/useOffice';
import { STATUS_KINDS, statusMutesMic } from '../../lib/office/status';
import { parseCallRoom } from '../../lib/office/rooms';

// Se entra silenciado; con el micrófono abierto y sin hablar este tiempo, se
// silencia solo.
const AUTO_MUTE_AFTER_MS = 5 * 60 * 1000;

// Pantalla compartida a 1080p y 30 fps (por defecto LiveKit manda 15 fps,
// poco para revisar cortes). 'motion' prioriza la fluidez sobre la nitidez.
const SCREEN_SHARE_PRESET = ScreenSharePresets.h1080fps30;
// En Safari 17 fijar cualquier resolución baja la calidad (bug documentado por
// LiveKit): ahí se deja la de por defecto.
const IS_SAFARI = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const SCREEN_SHARE_CAPTURE = {
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  ...(IS_SAFARI ? {} : { resolution: SCREEN_SHARE_PRESET.resolution }),
  contentHint: 'motion',
  systemAudio: 'include',
  selfBrowserSurface: 'exclude',
};
const SCREEN_SHARE_PUBLISH = {
  screenShareEncoding: SCREEN_SHARE_PRESET.encoding,
  screenShareSimulcastLayers: [],
};
// adaptiveStream + dynacast: la pantalla no se envía a quien no la está viendo
// (sala minimizada), lo que ahorra datos en el plan gratis.
const ROOM_OPTIONS = { adaptiveStream: true, dynacast: true, publishDefaults: SCREEN_SHARE_PUBLISH };

const getRoomTitle = (roomName) => {
  const call = parseCallRoom(roomName);
  return call ? `Llamada · ${call.join(' y ')}` : roomName;
};

// "Te escuchan: Edson y Luis"
const describeListeners = (micOn, names) => {
  if (!micOn) return 'Silenciado: nadie te escucha';
  if (names.length === 0) return 'Micrófono abierto · no hay nadie más';
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
  return `Te escuchan: ${list}`;
};

// Distingue "mic ocupado por otra app" (NotReadableError / "Device in use")
// de otros errores (permisos, sin dispositivo) para dar un mensaje accionable
// en vez del genérico "Client initiated disconnect" que da LiveKit.
const describeMicError = (e) => {
  const name = e?.name || '';
  const message = (e?.message || '').toLowerCase();
  if (name === 'NotReadableError' || message.includes('device in use') || message.includes('could not start')) {
    return 'Tu micrófono está siendo usado por otra app (Meet, Zoom, Teams, etc.). Ciérrala e inténtalo de nuevo.';
  }
  if (name === 'NotAllowedError' || message.includes('permission')) {
    return 'Permiso de micrófono denegado. Revisa los permisos del navegador para este sitio.';
  }
  if (name === 'NotFoundError') {
    return 'No se encontró ningún micrófono conectado.';
  }
  return e?.message || 'No se pudo activar el micrófono.';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// participant.name y metadata los pone el servidor en el token; sin
// canUpdateOwnMetadata nadie puede cambiarlos, así que identifican de verdad.
const getDisplayName = (identity = '', participantName = '') => {
  if (participantName && !participantName.includes('@')) return participantName;
  const base = identity.includes('@') ? identity.split('@')[0] : identity.split(':')[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
};

const parseMetadata = (participant) => {
  try {
    return JSON.parse(participant?.metadata || '{}') || {};
  } catch {
    return {};
  }
};

const getInitials = (identity = '', participantName = '') => {
  const name = getDisplayName(identity, participantName);
  return name
    .trim()
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('');
};

// Color del avatar: el elegido en Ajustes (viene en los metadatos del token)
// o el color fijo del integrante. Igual para todos, sin depender del orden.
const getTeamStyle = (participant) => {
  const meta = parseMetadata(participant);
  const member = ensureMemberName(meta.member || participant?.name);
  return { bgHex: meta.avatarColor || MEMBER_COLORS[member] || DEFAULT_MEMBER_COLOR, bgClass: null };
};

// Helper to apply color as class or inline style
const colorProps = (style) => style.bgHex
  ? { style: { backgroundColor: style.bgHex } }
  : { className: style.bgClass };

// ─── Participant card ──────────────────────────────────────────────────────────

const ParticipantCard = ({ participant, isLocal = false }) => {
  // Volumen continuo real (0..1) vía Web Audio — se actualiza por frame, sin el
  // debounce de useIsSpeaking (que causaba el lag, sobre todo al dejar de hablar).
  const micPub = participant.getTrackPublication?.(Track.Source.Microphone);
  const audioTrack = micPub?.audioTrack;
  const rawVolume = useTrackVolume(audioTrack);

  const style = getTeamStyle(participant);
  const initials = getInitials(participant.identity, participant.name);
  const displayName = getDisplayName(participant.identity, participant.name);
  const isMuted = !participant.isMicrophoneEnabled;

  // Nivel con algo de ganancia; silenciado = 0.
  const level = isMuted ? 0 : Math.min(1, rawVolume * 1.6);
  const speaking = level > 0.05;

  const colorStyle = style.bgHex ? { backgroundColor: style.bgHex } : undefined;
  const colorClass = style.bgHex ? '' : (style.bgClass || '');
  // Transición corta: ataque rápido, caída suave, sin sentirse desfasado.
  const ease = 'transform 130ms ease-out, opacity 160ms ease-out';

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Orbe — el contenedor mide exactamente el avatar; las capas escalan desde el centro */}
      <div className="relative h-20 w-20">
        {/* Glow exterior */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-full blur-2xl ${colorClass}`}
          style={{ ...colorStyle, transform: `scale(${1 + level * 1.35})`, opacity: 0.12 + level * 0.6, transition: ease }}
        />
        {/* Glow medio */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-full blur-lg ${colorClass}`}
          style={{ ...colorStyle, transform: `scale(${1 + level * 0.55})`, opacity: 0.18 + level * 0.5, transition: ease }}
        />
        {/* Anillo reactivo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/70"
          style={{ transform: `scale(${1.04 + level * 0.5})`, opacity: level * 0.85, transition: ease }}
        />

        {/* Avatar */}
        <div
          className={`absolute inset-0 z-10 flex items-center justify-center rounded-full text-2xl font-bold text-white shadow-xl ${colorClass}`}
          style={{ ...colorStyle, transform: `scale(${1 + level * 0.14})`, transition: ease }}
        >
          {initials}
          {/* Subtle inner shine */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
        </div>

        {/* Muted badge */}
        {isMuted && (
          <div className="absolute -bottom-1 -right-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 border border-slate-700 shadow-md">
            <MicOff size={11} className="text-red-400" />
          </div>
        )}
      </div>

      {/* Name */}
      <div className="text-center">
        <p className="text-sm font-semibold text-white truncate max-w-[100px]">
          {displayName}
          {isLocal && <span className="text-slate-500 font-normal text-xs ml-1">(tú)</span>}
        </p>
        {!isMuted ? (
          <div className="mt-1.5 h-1 w-14 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-green-400"
              style={{
                width: `${Math.round(level * 100)}%`,
                opacity: speaking ? 1 : 0.35,
                transition: 'width 120ms ease-out, opacity 200ms ease-out',
              }}
            />
          </div>
        ) : (
          <p className="text-[11px] text-slate-600 mt-1">
            {isMuted ? 'silenciado' : ' '}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Chat persistence (Supabase) ──────────────────────────────────────────────

const useChatMessages = (roomName) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomName || !supabase) { setLoading(false); return; }

    // Fetch history
    supabase
      .from('room_messages')
      .select('*')
      .eq('room', roomName)
      .order('created_at', { ascending: true })
      .limit(300)
      .then(({ data }) => {
        if (data) setMessages(data);
        setLoading(false);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`room-chat-${roomName}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'room_messages',
        filter: `room=eq.${roomName}`,
      }, (payload) => {
        setMessages((prev) =>
          prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomName]);

  const sendMessage = async (text, senderIdentity) => {
    if (!supabase || !text.trim()) return;
    await supabase.from('room_messages').insert({
      room: roomName,
      sender_identity: senderIdentity,
      text: text.trim(),
    });
  };

  return { messages, loading, sendMessage };
};

// ─── Chat helpers ─────────────────────────────────────────────────────────────

const URL_REGEX = /https?:\/\/[^\s]+/g;

const MessageBubble = ({ msg, isOwn }) => {
  const parts = msg.text.split(URL_REGEX);
  const urls = msg.text.match(URL_REGEX) || [];
  const sender = msg.sender_identity || msg.from || '';
  const member = getTeamMemberByEmail(sender);
  const bgHex = MEMBER_COLORS[member] || DEFAULT_MEMBER_COLOR;
  const initials = getInitials(sender, member || '');
  const name = member || getDisplayName(sender);
  const time = new Date(msg.created_at || msg.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

  const content = parts.reduce((acc, part, i) => {
    acc.push(<span key={`t${i}`}>{part}</span>);
    if (urls[i]) {
      acc.push(
        <a
          key={`u${i}`}
          href={urls[i]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 underline underline-offset-2 break-all hover:text-blue-300 transition-colors"
        >
          {urls[i]}
        </a>
      );
    }
    return acc;
  }, []);

  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: bgHex }}>
        {initials}
      </div>
      {/* Bubble */}
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {!isOwn && <span className="text-[10px] text-slate-500 px-1">{name}</span>}
        <div className={`px-3 py-2 rounded-lg text-sm leading-relaxed break-words ${
          isOwn
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-slate-800 text-slate-200 rounded-tl-sm'
        }`}>
          {content}
        </div>
        <span className="text-[10px] text-slate-600 px-1">{time}</span>
      </div>
    </div>
  );
};

const ChatPanel = ({ messages, onSend, localIdentity, onClose }) => {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <div className="absolute inset-0 z-30 flex h-full w-full flex-col bg-slate-950 md:static md:z-auto md:w-72 md:shrink-0 md:border-l md:border-slate-800/60 md:bg-slate-950/60">
      <div className="px-4 py-3 border-b border-slate-800/60 shrink-0 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <MessageSquare size={14} className="text-slate-400" />
          Chat
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-white md:hidden">
            Cerrar
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto soft-scroll px-3 py-3 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-600">
            <MessageSquare size={22} className="opacity-30" />
            <p className="text-xs text-center">Sin mensajes aún.<br />¡Empieza la conversación!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={(msg.sender_identity || msg.from) === localIdentity}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0 px-3 pb-4 pt-2 border-t border-slate-800/60">
        <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 focus-within:border-indigo-500/50 transition-colors">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensaje o link…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none min-w-0"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="shrink-0 text-slate-500 hover:text-indigo-400 disabled:opacity-30 transition-colors"
          >
            <Send size={15} />
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Room interior (requires LiveKitRoom context) ──────────────────────────────

const AudioRoomInterior = ({ roomName, onLeave, onExpand, onMinimize, isMinimized, chatIdentity }) => {
  const allRaw = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const room = useRoomContext();

  const setVoiceState = useStore((state) => state.setVoiceState);
  const myStatus = useMyStatus();

  // Screen share
  const { toggle: toggleScreenShare, enabled: isScreenSharing } = useTrackToggle({
    source: Track.Source.ScreenShare,
    captureOptions: SCREEN_SHARE_CAPTURE,
    publishOptions: SCREEN_SHARE_PUBLISH,
  });
  const screenTracks = useTracks([
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);
  const activeScreen = screenTracks[0] ?? null;

  // Chat — persisted via Supabase
  const [showChat, setShowChat] = useState(false);
  const [unread, setUnread] = useState(0);
  const { messages, sendMessage } = useChatMessages(roomName);
  const prevCountRef = useRef(0);

  // Count new messages received while chat is closed
  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      const added = messages.length - prevCountRef.current;
      if (!showChat) setUnread((n) => n + added);
    }
    prevCountRef.current = messages.length;
  }, [messages.length, showChat]);

  const handleSend = (text) => {
    sendMessage(text, chatIdentity || 'unknown');
  };

  const handleToggleChat = () => {
    setShowChat((v) => !v);
    if (!showChat) setUnread(0);
  };

  // Deduplicate local participant (v2 includes it in useParticipants)
  const localInList = allRaw.some((p) => p.identity === localParticipant?.identity);
  const allParticipants = (
    localInList ? allRaw : localParticipant ? [localParticipant, ...allRaw] : allRaw
  ).map((p) => ({ participant: p, isLocal: p.identity === localParticipant?.identity }));

  const lastSpokeRef = useRef(Date.now());
  const toggleMic = async () => {
    try {
      if (!isMicrophoneEnabled) lastSpokeRef.current = Date.now();
      await room?.localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled);
    } catch (e) {
      console.error('toggleMic failed:', e);
      toast.error(describeMicError(e));
    }
  };
  const handleLeave = () => { room?.disconnect(); onLeave(); };

  // La oficina ve en qué sala estás y si tu micrófono está abierto.
  useEffect(() => {
    setVoiceState({ room: roomName, mic: isMicrophoneEnabled, sharing: isScreenSharing });
  }, [roomName, isMicrophoneEnabled, isScreenSharing, setVoiceState]);
  useEffect(() => () => setVoiceState({ room: null, mic: false, sharing: false }), [setVoiceState]);

  // Micrófono abierto sin hablar durante un rato → se silencia solo.
  useEffect(() => {
    if (!localParticipant) return undefined;
    const onSpeaking = (speaking) => { if (speaking) lastSpokeRef.current = Date.now(); };
    localParticipant.on(ParticipantEvent.IsSpeakingChanged, onSpeaking);
    const id = setInterval(async () => {
      if (!localParticipant.isMicrophoneEnabled) return;
      if (Date.now() - lastSpokeRef.current < AUTO_MUTE_AFTER_MS) return;
      await localParticipant.setMicrophoneEnabled(false).catch(() => {});
      toast('Te silenciamos tras 5 minutos sin hablar.', { icon: '🔇' });
    }, 15 * 1000);
    return () => {
      localParticipant.off(ParticipantEvent.IsSpeakingChanged, onSpeaking);
      clearInterval(id);
    };
  }, [localParticipant]);

  // Pasar a "Ocupado" o "En grabación" (a mano o por la agenda) silencia.
  const myStatusKind = myStatus.kind;
  useEffect(() => {
    if (!statusMutesMic(myStatusKind) || !localParticipant?.isMicrophoneEnabled) return;
    localParticipant.setMicrophoneEnabled(false).catch(() => {});
    toast(`Te silenciamos: estás «${STATUS_KINDS[myStatusKind].label}».`, { icon: '🔇' });
  }, [myStatusKind, localParticipant]);

  const listenerNames = allParticipants
    .filter(({ isLocal }) => !isLocal)
    .map(({ participant }) => getDisplayName(participant.identity, participant.name));
  const listenersText = describeListeners(isMicrophoneEnabled, listenerNames);
  const roomTitle = getRoomTitle(roomName);

  // ── Minimized pill ──────────────────────────────────────────────────────────
  if (isMinimized) {
    return (
      <div className="flex items-center justify-between w-full h-full px-3 gap-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-lg shadow-2xl overflow-hidden">
        <RoomAudioRenderer />

        {/* Room name + participants */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{roomTitle}</p>
            <p className={`text-[10px] truncate ${isMicrophoneEnabled ? 'text-green-400' : 'text-slate-500'}`}>{listenersText}</p>
          </div>
          {activeScreen && (
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-full shrink-0">
              pantalla
            </span>
          )}
          <div className="hidden sm:flex -space-x-2 shrink-0">
            {allParticipants.slice(0, 3).map(({ participant }, i) => {
              const { bgHex } = getTeamStyle(participant);
              return (
                <div
                  key={participant.identity}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-slate-900"
                  style={{ backgroundColor: bgHex }}
                  title={getDisplayName(participant.identity, participant.name)}
                >
                  {getInitials(participant.identity, participant.name)}
                </div>
              );
            })}
            {allParticipants.length > 3 && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-slate-900 bg-slate-700">
                +{allParticipants.length - 3}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggleMic}
            title={isMicrophoneEnabled ? 'Silenciar' : 'Activar micrófono'}
            className={`p-1.5 rounded-full transition-all ${
              isMicrophoneEnabled ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {isMicrophoneEnabled ? <Mic size={13} /> : <MicOff size={13} />}
          </button>
          {onExpand && (
            <button
              onClick={onExpand}
              title="Expandir"
              className="p-1.5 rounded-full bg-slate-700 hover:bg-slate-600 text-white transition-all"
            >
              <Maximize2 size={13} />
            </button>
          )}
          <button
            onClick={handleLeave}
            title="Salir de la sala"
            className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-all"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    );
  }

  // ── Expanded layout ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-stretch bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex w-full h-full bg-slate-950 overflow-hidden shadow-2xl">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-60 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

        {/* Sidebar — projects/notes */}
        <div className="relative z-10 hidden shrink-0 overflow-hidden md:block">
          <ProjectTaskSidebar />
        </div>

        {/* Main room */}
        <div className="relative flex-1 flex flex-col min-h-0 min-w-0 z-10">
          {/* Minimize */}
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/50 text-slate-400 hover:text-white transition-all backdrop-blur-sm shadow-md"
              title="Minimizar"
            >
              <Minimize2 size={15} />
            </button>
          )}

          <div className="flex h-full min-h-0">
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
            <RoomAudioRenderer />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 pr-16 border-b border-slate-800/60 shrink-0 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <div>
            <h2 className="text-base font-semibold text-white leading-tight">{roomTitle}</h2>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Users size={10} />
              {allParticipants.length} participante{allParticipants.length !== 1 ? 's' : ''}
              {activeScreen && (
                <span className="ml-2 flex items-center gap-1 text-indigo-400">
                  <Monitor size={10} />
                  {getDisplayName(activeScreen.participant.identity, activeScreen.participant.name)} compartiendo
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeScreen ? (
          // ── Screen share mode ──
          <div className="flex flex-1 min-h-0 gap-0">
            {/* Screen share video */}
            <div className="flex-1 min-w-0 bg-black flex items-center justify-center p-1 sm:p-4">
              <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl border border-slate-700/40 relative">
                <VideoTrack trackRef={activeScreen} className="w-full h-full object-contain" />
                {/* Presenter label */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-white/10">
                  <Monitor size={12} className="text-indigo-400" />
                  <span className="text-xs text-white font-medium">
                    {getDisplayName(activeScreen.participant.identity, activeScreen.participant.name)}
                  </span>
                </div>
              </div>
            </div>
            {/* Participant strip (right side) */}
            <div className="hidden w-28 shrink-0 flex-col gap-3 items-center py-4 px-2 border-l border-slate-800/60 overflow-y-auto soft-scroll sm:flex">
              {allParticipants.map(({ participant, isLocal }, i) => {
                const { bgHex } = getTeamStyle(participant);
                const initials = getInitials(participant.identity, participant.name);
                const name = getDisplayName(participant.identity, participant.name);
                const isMuted = !participant.isMicrophoneEnabled;
                return (
                  <div key={participant.identity} className="flex flex-col items-center gap-1.5">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md" style={{ backgroundColor: bgHex }}>
                        {initials}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
                      </div>
                      {isMuted && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                          <MicOff size={8} className="text-red-400" />
                        </div>
                      )}
                      {isLocal && (
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-500 border border-blue-300/50" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 truncate w-full text-center">{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          // ── Audio-only grid ──
          <div className="flex-1 min-h-0 flex items-center justify-center p-4 sm:p-8">
            {allParticipants.length === 0 ? (
              <div className="flex flex-col items-center gap-3 text-slate-600">
                <Volume2 size={28} className="opacity-40" />
                <p className="text-sm">Sala vacía. Esperando participantes…</p>
              </div>
            ) : (
              <div
                className={`grid gap-10 w-full max-w-2xl mx-auto place-items-center ${
                  allParticipants.length === 1 ? 'grid-cols-1' :
                  allParticipants.length === 2 ? 'grid-cols-2' :
                  allParticipants.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' :
                  'grid-cols-3 sm:grid-cols-4'
                }`}
              >
                {allParticipants.map(({ participant, isLocal }, i) => (
                  <ParticipantCard
                    key={participant.identity}
                    participant={participant}
                    isLocal={isLocal}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="shrink-0 px-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 border-t border-slate-800/60 sm:px-6">
        <p
          className={`mb-2.5 text-center text-xs ${isMicrophoneEnabled ? 'text-green-400' : 'text-slate-500'}`}
          aria-live="polite"
        >
          {listenersText}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
          {/* Mic */}
          <button
            onClick={toggleMic}
            aria-label={isMicrophoneEnabled ? 'Silenciar' : 'Activar micrófono'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              isMicrophoneEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                : 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30'
            }`}
          >
            {isMicrophoneEnabled ? <Mic size={15} /> : <MicOff size={15} />}
            <span className="hidden sm:inline">{isMicrophoneEnabled ? 'Silenciar' : 'Activar mic'}</span>
          </button>

          {/* Screen share */}
          <button
            onClick={() => typeof toggleScreenShare === 'function' && toggleScreenShare()}
            aria-label={isScreenSharing ? 'Dejar de compartir pantalla' : 'Compartir pantalla'}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              isScreenSharing
                ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            {isScreenSharing ? <MonitorOff size={15} /> : <Monitor size={15} />}
            <span className="hidden sm:inline">{isScreenSharing ? 'Dejar de compartir' : 'Compartir pantalla'}</span>
          </button>

          {/* Chat toggle */}
          <button
            onClick={handleToggleChat}
            aria-label="Chat"
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              showChat
                ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            <MessageSquare size={15} />
            <span className="hidden sm:inline">Chat</span>
            {unread > 0 && !showChat && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Leave */}
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm font-medium border border-red-500/30 transition-all duration-200"
          >
            <LogOut size={15} />
            Salir
          </button>
        </div>
      </div>
      </div>

      {/* Chat panel */}
      {showChat && (
        <ChatPanel
          messages={messages}
          onSend={handleSend}
          localIdentity={chatIdentity}
          onClose={handleToggleChat}
        />
      )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Project card with its own task input state ───────────────────────────────

const STATUS_ORDER = { Stuck: 0, 'En revisión': 1, 'En progreso': 2 };

const statusStyle = {
  Stuck: 'bg-red-500/15 text-red-400 border-red-500/25',
  'En revisión': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'En progreso': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
};

const ProjectCard = ({ project, isExpanded, onToggle, onUpdate }) => {
  const [inputText, setInputText] = useState('');
  const tasks = project.properties?.tasks || [];
  const done = tasks.filter((t) => t.completed).length;

  const handleAdd = (e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    onUpdate({
      ...project,
      properties: {
        ...project.properties,
        tasks: [
          ...tasks,
          { id: Date.now().toString(), text, completed: false, createdAt: new Date().toISOString() },
        ],
      },
    });
    setInputText('');
    toast.success('Tarea agregada');
  };

  const toggleTask = (taskId) => {
    onUpdate({
      ...project,
      properties: {
        ...project.properties,
        tasks: tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)),
      },
    });
  };

  const managerLabel = (project.managers?.length ? project.managers : project.manager ? [project.manager] : [])
    .join(', ');

  return (
    <div className="rounded-xl overflow-hidden border border-slate-800/60 bg-slate-900/50">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-800/40 transition-colors text-left"
      >
        <div className="flex flex-col gap-1 truncate pr-2 min-w-0">
          <span className="font-medium text-xs text-slate-200 truncate">{project.name}</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0 ${statusStyle[project.status] || 'bg-slate-500/15 text-slate-400 border-slate-500/25'}`}>
              {project.status}
            </span>
            {managerLabel && (
              <span className="text-[10px] text-slate-600 truncate">{managerLabel}</span>
            )}
            {tasks.length > 0 && (
              <span className="text-[10px] text-slate-600 shrink-0 ml-auto">
                {done}/{tasks.length}
              </span>
            )}
          </div>
        </div>
        {isExpanded
          ? <ChevronDown size={13} className="shrink-0 text-slate-500 ml-2" />
          : <ChevronRight size={13} className="shrink-0 text-slate-500 ml-2" />}
      </button>

      {/* Expanded body */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-slate-800/50">
          {/* Task list */}
          <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto soft-scroll my-2.5">
            {tasks.length === 0 ? (
              <p className="text-[11px] text-slate-600 italic text-center py-3">
                Sin tareas aún — añade una abajo.
              </p>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="flex items-start gap-2 group">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="mt-0.5 shrink-0 transition-transform hover:scale-110"
                  >
                    {task.completed
                      ? <CheckCircle2 size={13} className="text-green-500" />
                      : <Circle size={13} className="text-slate-600 group-hover:text-slate-400" />}
                  </button>
                  <span className={`text-[11px] leading-relaxed ${task.completed ? 'text-slate-600 line-through' : 'text-slate-300'}`}>
                    {task.text}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Add task input */}
          <form onSubmit={handleAdd} className="relative flex items-center mt-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nueva tarea o nota…"
              className="w-full bg-slate-950 border border-slate-700/60 rounded-lg py-1.5 pl-2.5 pr-8 text-[11px] text-white focus:outline-none focus:border-indigo-500/60 placeholder:text-slate-600 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="absolute right-1.5 text-slate-500 hover:text-indigo-400 disabled:opacity-30 transition-colors p-0.5"
            >
              <Plus size={13} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

// ─── Project / Notes sidebar ───────────────────────────────────────────────────

const ProjectTaskSidebar = () => {
  const projects = useStore((state) => state.projects);
  const updateProject = useStore((state) => state.updateProject);
  const [expandedProjectId, setExpandedProjectId] = useState(null);

  // Show ALL active projects for the whole team — this is a collaborative space
  const activeProjects = projects
    .filter((p) => ['En progreso', 'En revisión', 'Stuck'].includes(p.status))
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));

  return (
    <div className="w-72 h-full bg-slate-950/80 border-r border-slate-800/70 flex flex-col overflow-hidden backdrop-blur-md">
      <div className="px-4 py-4 border-b border-slate-800/70 shrink-0">
        <h2 className="font-semibold text-sm text-white tracking-wide">Proyectos activos</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {activeProjects.length > 0
            ? `${activeProjects.length} proyecto${activeProjects.length !== 1 ? 's' : ''} en curso`
            : 'Notas rápidas de la reunión'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 soft-scroll">
        {activeProjects.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-600">
            <div className="w-8 h-8 rounded-full bg-slate-800/60 flex items-center justify-center">
              <Circle size={14} />
            </div>
            <p className="text-xs text-center">Sin proyectos activos</p>
          </div>
        ) : (
          activeProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isExpanded={expandedProjectId === project.id}
              onToggle={() => setExpandedProjectId(expandedProjectId === project.id ? null : project.id)}
              onUpdate={updateProject}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ─── Main export ───────────────────────────────────────────────────────────────

export default function VistaVoiceRoom() {
  const roomName = useStore((state) => state.activeVoiceRoom);
  const currentUser = useStore((state) => state.currentUser);
  const setActiveVoiceRoom = useStore((state) => state.setActiveVoiceRoom);
  const isVoiceRoomMinimized = useStore((state) => state.isVoiceRoomMinimized);
  const setIsVoiceRoomMinimized = useStore((state) => state.setIsVoiceRoomMinimized);

  const [token, setToken] = useState('');
  const [connError, setConnError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  // La sala se abrió con la misma sesión en otra pestaña: no reconectar solo
  // (las dos pestañas se expulsarían en bucle), preguntar.
  const [replacedElsewhere, setReplacedElsewhere] = useState(false);
  const chatIdentity = currentUser?.email || null;
  const userId = currentUser?.id || null;

  const handleRoomError = (e) => {
    console.error('LiveKit error:', e);
    const msg = describeMicError(e);
    setConnError(msg);
    toast.error(`Sala de voz: ${msg}`);
  };

  useEffect(() => {
    if (!roomName) return;
    setToken('');
    setConnError(null);
    setReplacedElsewhere(false);
    let cancelled = false;
    (async () => {
      try {
        // El servidor decide identidad y nombre a partir de la sesión.
        const resp = await authFetch('/api/livekit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: roomName, deviceId: getDeviceId() }),
        });
        const data = await resp.json().catch(() => ({}));
        if (cancelled) return;
        if (resp.ok && data.token) {
          setToken(data.token);
        } else {
          console.error('No token from LiveKit API', data.error);
          setConnError(data.error || 'No se pudo conectar a la sala');
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setConnError('Error de conexión');
      }
    })();
    return () => { cancelled = true; };
  }, [roomName, userId, retryKey]);

  const handleDisconnected = (reason) => {
    if (reason === DisconnectReason.DUPLICATE_IDENTITY) {
      setToken('');
      setReplacedElsewhere(true);
      return;
    }
    setActiveVoiceRoom(null);
  };

  if (!roomName) return null;

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  // ── Config guard: si falta la URL del servidor, mostrar mensaje en vez de crashear ──
  if (!serverUrl) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
        <div className="max-w-sm w-full bg-slate-900 border border-red-500/30 rounded-lg p-6 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
            <MicOff size={20} className="text-red-400" />
          </div>
          <h3 className="text-white font-semibold mb-2">Sala de voz no configurada</h3>
          <p className="text-sm text-slate-400 mb-4">
            Falta la variable <code className="text-red-300 text-xs">NEXT_PUBLIC_LIVEKIT_URL</code> en este entorno. Avísale al administrador.
          </p>
          <button
            onClick={() => setActiveVoiceRoom(null)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const useHere = () => { setReplacedElsewhere(false); setRetryKey((k) => k + 1); };

  const renderReplaced = () =>
    isVoiceRoomMinimized ? (
      <div className="flex items-center justify-between w-full h-full px-3 gap-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-lg shadow-2xl overflow-hidden">
        <span className="text-xs text-slate-300 truncate">Abierta en otra pestaña</span>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={useHere} className="px-2 py-1 rounded-full bg-slate-700 hover:bg-slate-600 text-white text-[11px] transition-all">
            Usar aquí
          </button>
          <button onClick={() => setActiveVoiceRoom(null)} title="Cerrar" aria-label="Cerrar" className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-all">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    ) : (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 p-6 text-center bg-black/80 backdrop-blur-md">
        <p className="text-sm font-medium text-white">Abriste esta sala en otra pestaña o dispositivo.</p>
        <p className="text-xs text-slate-400 max-w-xs">Solo una puede estar conectada a la vez.</p>
        <div className="flex gap-2">
          <button onClick={useHere} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-all">
            Usar aquí
          </button>
          <button onClick={() => setActiveVoiceRoom(null)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-all">
            Cerrar
          </button>
        </div>
      </div>
    );

  // Vistas previas a la conexión (aún sin contexto de sala).
  const renderConnecting = () =>
    isVoiceRoomMinimized ? (
      <div className="flex items-center justify-center w-full h-full gap-2 text-slate-500 bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-lg shadow-2xl overflow-hidden">
        <div className="w-4 h-4 rounded-full border-2 border-t-blue-500 border-slate-700 animate-spin" />
        <span className="text-xs">Conectando…</span>
      </div>
    ) : (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-md text-slate-500">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
          <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-400">Conectando a <span className="text-white">{getRoomTitle(roomName)}</span></p>
          <p className="text-xs text-slate-600 mt-1">Estableciendo conexión segura…</p>
        </div>
      </div>
    );

  const renderError = () =>
    isVoiceRoomMinimized ? (
      <div className="flex items-center justify-between w-full h-full px-3 gap-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-lg shadow-2xl overflow-hidden">
        <span className="text-xs text-red-400 truncate">No se pudo conectar</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => { setConnError(null); setToken(''); setRetryKey((k) => k + 1); }}
            className="px-2 py-1 rounded-full bg-slate-700 hover:bg-slate-600 text-white text-[11px] transition-all"
          >
            Reintentar
          </button>
          <button
            onClick={() => setActiveVoiceRoom(null)}
            title="Salir"
            className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-all"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    ) : (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 p-6 text-center bg-black/80 backdrop-blur-md">
        <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
          <MicOff size={20} className="text-red-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-red-400">No se pudo conectar a la sala</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xs break-words">{connError}</p>
          <p className="text-[11px] text-slate-600 mt-2">Revisa el permiso del micrófono del navegador.</p>
        </div>
        <button
          onClick={() => { setConnError(null); setToken(''); setRetryKey((k) => k + 1); }}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-all"
        >
          Reintentar
        </button>
      </div>
    );

  // ── UN SOLO LiveKitRoom ──
  // Mientras haya token y sin error, el <LiveKitRoom> se mantiene montado tanto en
  // minimizado como expandido (solo cambia el layout interno de AudioRoomInterior).
  // Así, minimizar/expandir ya NO desconecta ni reconecta → el screen share no se corta.
  return (
    <div className="w-full h-full">
      {replacedElsewhere ? (
        renderReplaced()
      ) : connError ? (
        renderError()
      ) : !token ? (
        renderConnecting()
      ) : (
        <LiveKitRoom
          video={false}
          // Siempre se entra silenciado; el micrófono se abre con el botón.
          audio={false}
          token={token}
          serverUrl={serverUrl}
          connect={true}
          options={ROOM_OPTIONS}
          style={{ height: '100%', width: '100%' }}
          onError={handleRoomError}
          onDisconnected={handleDisconnected}
        >
          <AudioRoomInterior
            roomName={roomName}
            onLeave={() => setActiveVoiceRoom(null)}
            onExpand={() => setIsVoiceRoomMinimized(false)}
            onMinimize={() => setIsVoiceRoomMinimized(true)}
            isMinimized={isVoiceRoomMinimized}
            chatIdentity={chatIdentity}
          />
        </LiveKitRoom>
      )}
    </div>
  );
}
