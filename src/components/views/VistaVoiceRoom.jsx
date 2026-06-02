'use client';

import React, { useEffect, useRef, useState } from 'react';
import useStore from '../../hooks/useStore';
import { supabase } from '../../config/supabase';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
  useIsSpeaking,
  useRoomContext,
  useTrackToggle,
  useTracks,
  VideoTrack,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
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
import { TEAM_STYLES } from '../../constants/team';
const MIC_KEY = 'cerezo-default-mic';
const getDefaultMic = () => {
  if (typeof window === 'undefined') return true;
  const v = window.localStorage.getItem(MIC_KEY);
  return v === null ? true : v === 'true';
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Use participant.name (set from LiveKit token) when available, else parse identity
const getDisplayName = (identity = '', participantName = '') => {
  if (participantName && !participantName.includes('@')) return participantName;
  const base = identity.includes('@') ? identity.split('@')[0] : identity;
  return base.charAt(0).toUpperCase() + base.slice(1);
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

// Returns { bgClass?, bgHex? } — hex takes priority when set (user preference)
const getTeamStyle = (identity = '', index = 0, avatarColorHex = null) => {
  if (avatarColorHex) return { bgHex: avatarColorHex, bgClass: null };
  const FALLBACK_COLORS = [
    'bg-indigo-500','bg-pink-500','bg-teal-500',
    'bg-orange-500','bg-cyan-500','bg-rose-500',
  ];
  const first = getDisplayName(identity).split(/[\s._-]+/)[0];
  const match = TEAM_STYLES[first];
  if (match) return { bgClass: match.bg, bgHex: null };
  return { bgClass: FALLBACK_COLORS[index % FALLBACK_COLORS.length], bgHex: null };
};

// Helper to apply color as class or inline style
const colorProps = (style) => style.bgHex
  ? { style: { backgroundColor: style.bgHex } }
  : { className: style.bgClass };

// ─── Participant card ──────────────────────────────────────────────────────────

const ParticipantCard = ({ participant, isLocal = false, index = 0, localAvatarColor = null }) => {
  const isSpeaking = useIsSpeaking(participant);
  const avatarHex = isLocal ? localAvatarColor : null;
  const style = getTeamStyle(participant.identity, index, avatarHex);
  const initials = getInitials(participant.identity, participant.name);
  const displayName = getDisplayName(participant.identity, participant.name);
  const isMuted = !participant.isMicrophoneEnabled;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="relative">
        {/* Ping ring when speaking */}
        {isSpeaking && (
          <div
            className={`absolute -inset-3 rounded-full opacity-30 animate-ping ${style.bgClass || ''}`}
            style={style.bgHex ? { backgroundColor: style.bgHex } : {}}
          />
        )}
        {/* Static border when speaking */}
        <div className={`absolute -inset-1.5 rounded-full border-2 transition-all duration-200 ${
          isSpeaking ? 'border-green-400 opacity-100' : 'border-transparent opacity-0'
        }`} />

        {/* Avatar */}
        <div
          className={`relative w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-xl transition-transform duration-200 ${isSpeaking ? 'scale-110' : 'scale-100'} ${style.bgClass || ''}`}
          style={style.bgHex ? { backgroundColor: style.bgHex } : {}}
        >
          {initials}
          {/* Subtle inner shine */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
        </div>

        {/* Muted badge */}
        {isMuted && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow-md">
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
        {isSpeaking ? (
          <div className="flex items-center justify-center gap-[3px] mt-1.5">
            {[1, 2, 3, 2, 1].map((h, i) => (
              <div
                key={i}
                className="w-[3px] bg-green-400 rounded-full animate-bounce"
                style={{
                  height: `${h * 4}px`,
                  animationDelay: `${i * 80}ms`,
                  animationDuration: '500ms',
                }}
              />
            ))}
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
  const { bgClass } = getTeamStyle(sender, 0);
  const initials = getInitials(sender);
  const name = getDisplayName(sender);
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
      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white ${bgClass}`}>
        {initials}
      </div>
      {/* Bubble */}
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
        {!isOwn && <span className="text-[10px] text-slate-500 px-1">{name}</span>}
        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
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

const ChatPanel = ({ messages, onSend, localIdentity }) => {
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
    <div className="w-72 shrink-0 flex flex-col h-full border-l border-slate-800/60 bg-slate-950/60">
      <div className="px-4 py-3 border-b border-slate-800/60 shrink-0">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <MessageSquare size={14} className="text-slate-400" />
          Chat
        </h3>
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
        <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-2xl px-3 py-2 focus-within:border-indigo-500/50 transition-colors">
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

const AudioRoomInterior = ({ roomName, onLeave, onExpand, isMinimized, localAvatarColor }) => {
  const allRaw = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const room = useRoomContext();

  // Screen share
  const { toggle: toggleScreenShare, enabled: isScreenSharing } = useTrackToggle({
    source: Track.Source.ScreenShare,
    captureOptions: { audio: true },
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
  }, [messages.length]);

  const handleSend = (text) => {
    sendMessage(text, localParticipant?.identity ?? 'unknown');
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

  const toggleMic = () => room?.localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled);
  const handleLeave = () => { room?.disconnect(); onLeave(); };

  // ── Minimized pill ──────────────────────────────────────────────────────────
  if (isMinimized) {
    return (
      <div className="flex items-center justify-between w-full h-full px-3 gap-2">
        <RoomAudioRenderer />

        {/* Room name + participants */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <span className="text-sm font-semibold text-white truncate max-w-[100px]">{roomName}</span>
          {activeScreen && (
            <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-full shrink-0">
              pantalla
            </span>
          )}
          <div className="flex -space-x-2">
            {allParticipants.slice(0, 3).map(({ participant }, i) => {
              const { bgClass } = getTeamStyle(participant.identity, i);
              return (
                <div
                  key={participant.identity}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-slate-900 ${bgClass}`}
                  title={getDisplayName(participant.identity)}
                >
                  {getInitials(participant.identity)}
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
    <div className="flex h-full min-h-0">
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
      <RoomAudioRenderer />

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-slate-800/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <div>
            <h2 className="text-base font-semibold text-white leading-tight">{roomName}</h2>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Users size={10} />
              {allParticipants.length} participante{allParticipants.length !== 1 ? 's' : ''}
              {activeScreen && (
                <span className="ml-2 flex items-center gap-1 text-indigo-400">
                  <Monitor size={10} />
                  {getDisplayName(activeScreen.participant.identity)} compartiendo
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
            <div className="flex-1 min-w-0 bg-black flex items-center justify-center p-4">
              <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl border border-slate-700/40 relative">
                <VideoTrack trackRef={activeScreen} className="w-full h-full object-contain" />
                {/* Presenter label */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-white/10">
                  <Monitor size={12} className="text-indigo-400" />
                  <span className="text-xs text-white font-medium">
                    {getDisplayName(activeScreen.participant.identity)}
                  </span>
                </div>
              </div>
            </div>
            {/* Participant strip (right side) */}
            <div className="w-28 shrink-0 flex flex-col gap-3 items-center py-4 px-2 border-l border-slate-800/60 overflow-y-auto soft-scroll">
              {allParticipants.map(({ participant, isLocal }, i) => {
                const isSpeaking = false; // can't call hook inside map — handled in ParticipantCard
                const { bgClass } = getTeamStyle(participant.identity, i);
                const initials = getInitials(participant.identity);
                const name = getDisplayName(participant.identity);
                const isMuted = !participant.isMicrophoneEnabled;
                return (
                  <div key={participant.identity} className="flex flex-col items-center gap-1.5">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md ${bgClass}`}>
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
          <div className="flex-1 min-h-0 flex items-center justify-center p-8">
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
                    localAvatarColor={isLocal ? localAvatarColor : null}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="shrink-0 px-6 pb-5 pt-3 border-t border-slate-800/60">
        <div className="flex items-center justify-center gap-2.5">
          {/* Mic */}
          <button
            onClick={toggleMic}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
              isMicrophoneEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                : 'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30'
            }`}
          >
            {isMicrophoneEnabled ? <Mic size={15} /> : <MicOff size={15} />}
            {isMicrophoneEnabled ? 'Silenciar' : 'Activar mic'}
          </button>

          {/* Screen share */}
          <button
            onClick={() => typeof toggleScreenShare === 'function' && toggleScreenShare()}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
              isScreenSharing
                ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            {isScreenSharing ? <MonitorOff size={15} /> : <Monitor size={15} />}
            {isScreenSharing ? 'Dejar de compartir' : 'Compartir pantalla'}
          </button>

          {/* Chat toggle */}
          <button
            onClick={handleToggleChat}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
              showChat
                ? 'bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
            }`}
          >
            <MessageSquare size={15} />
            Chat
            {unread > 0 && !showChat && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* Leave */}
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm font-medium border border-red-500/30 transition-all duration-200"
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
          localIdentity={localParticipant?.identity}
        />
      )}
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
  const username = currentUser?.email || 'Guest';
  const displayName = currentUser?.user_metadata?.display_name || username.split('@')[0];
  const avatarColor = currentUser?.user_metadata?.avatar_color || null;

  const handleRoomError = (e) => {
    console.error('LiveKit error:', e);
    const msg = e?.message || 'Error desconocido';
    setConnError(msg);
    toast.error(`Sala de voz: ${msg}`);
  };

  useEffect(() => {
    if (!roomName) return;
    setToken('');
    setConnError(null);
    (async () => {
      try {
        const resp = await fetch(
          `/api/livekit?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(username)}&displayName=${encodeURIComponent(displayName)}`
        );
        const data = await resp.json();
        if (data.token) {
          setToken(data.token);
        } else {
          console.error('No token from LiveKit API', data.error);
          toast.error('No se pudo conectar a la sala');
        }
      } catch (e) {
        console.error(e);
        toast.error('Error de conexión');
      }
    })();
  }, [roomName, username, displayName, retryKey]);

  if (!roomName) return null;

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  // ── Config guard: si falta la URL del servidor, mostrar mensaje en vez de crashear ──
  if (!serverUrl) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
        <div className="max-w-sm w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 text-center shadow-2xl">
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

  // ── Minimized floating pill ──
  if (isVoiceRoomMinimized) {
    return (
      <div className="w-full h-full bg-slate-900/95 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
        {!token ? (
          <div className="flex items-center justify-center w-full h-full gap-2 text-slate-500">
            <div className="w-4 h-4 rounded-full border-2 border-t-blue-500 border-slate-700 animate-spin" />
            <span className="text-xs">Conectando…</span>
          </div>
        ) : (
          <LiveKitRoom
            video={false}
            audio={getDefaultMic()}
            token={token}
            serverUrl={serverUrl}
            connect={true}
            style={{ height: '100%', width: '100%' }}
            onError={handleRoomError}
            onDisconnected={() => setActiveVoiceRoom(null)}
          >
            <AudioRoomInterior
              roomName={roomName}
              onLeave={() => setActiveVoiceRoom(null)}
              onExpand={() => setIsVoiceRoomMinimized(false)}
              isMinimized={true}
              localAvatarColor={avatarColor}
            />
          </LiveKitRoom>
        )}
      </div>
    );
  }

  // ── Expanded full-screen overlay ──
  return (
    <div className="fixed inset-0 z-[100] flex items-stretch bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      {/* Glassmorphism card that fills most of the screen */}
      <div className="relative flex w-full h-full bg-slate-950 overflow-hidden shadow-2xl">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-60 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

        {/* Sidebar — projects/notes */}
        <div className="relative z-10 shrink-0 overflow-hidden">
          <ProjectTaskSidebar />
        </div>

        {/* Main room */}
        <div className="relative flex-1 flex flex-col min-h-0 min-w-0 z-10">
          {/* Minimize */}
          <button
            onClick={() => setIsVoiceRoomMinimized(true)}
            className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/50 text-slate-400 hover:text-white transition-all backdrop-blur-sm shadow-md"
            title="Minimizar"
          >
            <Minimize2 size={15} />
          </button>

          {connError ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
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
          ) : !token ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-500">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
                <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-400">Conectando a <span className="text-white">{roomName}</span></p>
                <p className="text-xs text-slate-600 mt-1">Estableciendo conexión segura…</p>
              </div>
            </div>
          ) : (
            <LiveKitRoom
              video={false}
              audio={getDefaultMic()}
              token={token}
              serverUrl={serverUrl}
              connect={true}
              style={{ height: '100%', width: '100%' }}
              onError={handleRoomError}
              onDisconnected={() => setActiveVoiceRoom(null)}
            >
              <AudioRoomInterior
                roomName={roomName}
                onLeave={() => setActiveVoiceRoom(null)}
                isMinimized={false}
                localAvatarColor={avatarColor}
              />
            </LiveKitRoom>
          )}
        </div>
      </div>
    </div>
  );
}
