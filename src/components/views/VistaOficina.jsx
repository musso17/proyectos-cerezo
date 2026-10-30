'use client';

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { AlertTriangle, LogIn, Mic, MicOff, Monitor, Phone, Radio } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useStore from '../../hooks/useStore';
import { supabase } from '../../config/supabase';
import { MEMBER_ABBREV, TEAM_MEMBERS } from '../../constants/team';
import MemberAvatar from '../ui/MemberAvatar';
import { useMemberStatus, useMyMember, useNow } from '../../hooks/useOffice';
import { STATUS_KINDS, dayKey, statusMutesMic } from '../../lib/office/status';
import {
  OFFICE_ROOMS,
  buildCallRoom,
  buildJoinLink,
  buildWhatsAppLink,
  parseCallRoom,
} from '../../lib/office/rooms';
import { groupByRoom } from '../../lib/office/presence';
import { ADOPTION_GOAL, summarizeAdoption, summarizeMonthUsage } from '../../lib/office/usage';

const USAGE_ALERT_KEY = 'cerezo-usage-alert';

const cardClass =
  'rounded-lg border border-slate-200 bg-white p-4 dark:border-white/5 dark:bg-[#1E1F23]';
const buttonClass =
  'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all active:scale-95 disabled:cursor-default disabled:opacity-50';

const roomTitle = (room) => {
  const call = parseCallRoom(room);
  return call ? `Llamada ${call.join(' y ')}` : room;
};

// Números de WhatsApp del equipo (cada uno carga el suyo en Ajustes).
const useOfficeDirectory = () => {
  const [directory, setDirectory] = useState({});
  useEffect(() => {
    if (!supabase) return;
    supabase.rpc('office_directory').then(({ data, error }) => {
      if (error) {
        console.warn('[Oficina] Sin directorio de WhatsApp:', error.message);
        return;
      }
      setDirectory(Object.fromEntries((data || []).map((row) => [row.member, row.whatsapp])));
    });
  }, []);
  return directory;
};

// Entradas y salidas de las salas desde hace 3 semanas (o desde el 1 del mes).
const useRoomEvents = () => {
  const [events, setEvents] = useState([]);
  useEffect(() => {
    if (!supabase) return;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
    const since = monthStart < threeWeeksAgo ? monthStart : threeWeeksAgo;
    supabase
      .from('office_room_events')
      .select('event, room, user_id, member, occurred_at')
      .gte('occurred_at', since.toISOString())
      .order('occurred_at', { ascending: true })
      .limit(5000)
      .then(({ data, error }) => {
        if (error) console.warn('[Oficina] Sin eventos de uso:', error.message);
        else setEvents(data || []);
      });
  }, []);
  return events;
};

const StatusDot = ({ kind }) => (
  <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', STATUS_KINDS[kind]?.dot || 'bg-slate-400')} />
);

// ─── Integrante ───────────────────────────────────────────────────────────────

const MemberRow = ({ member, isMe, presence, myRoom, onCall, onJoin }) => {
  const status = useMemberStatus(member);
  const online = Boolean(presence?.online);
  const room = presence?.room || null;
  const together = room && room === myRoom;

  return (
    <li className={clsx(cardClass, 'flex items-start gap-3')}>
      <span className="relative">
        <MemberAvatar name={member} size="lg" className="h-10 w-10 text-sm" />
        <span
          className={clsx(
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#1E1F23]',
            online ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
          )}
          title={online ? 'Con la app abierta' : 'Sin la app abierta'}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-primary dark:text-white">
          {member}
          {isMe && <span className="ml-1 text-xs font-normal text-secondary dark:text-white/50">(tú)</span>}
        </p>
        <p className="flex items-start gap-1.5 text-sm text-secondary dark:text-white/70">
          <StatusDot kind={status.kind} />
          <span className="min-w-0 break-words">
            {status.line}
            {status.manual && <span className="text-xs text-secondary/70 dark:text-white/40"> · elegido a mano</span>}
          </span>
        </p>
        {status.next && (
          <p className="mt-0.5 text-xs text-secondary dark:text-white/50">Más tarde: {status.next.line}</p>
        )}
        {room ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-medium text-green-600 dark:text-green-400">
            <span className="inline-flex items-center gap-1">
              <Radio size={12} className="shrink-0" /> En {roomTitle(room)}
              {presence.mic
                ? <Mic size={12} className="shrink-0" aria-label="micrófono abierto" />
                : <MicOff size={12} className="shrink-0 text-secondary dark:text-white/40" aria-label="silenciado" />}
            </span>
            {presence.sharing && (
              <span className="inline-flex items-center gap-1 text-indigo-500 dark:text-indigo-400">
                <Monitor size={12} /> compartiendo pantalla
              </span>
            )}
          </p>
        ) : (
          !online && <p className="mt-1 text-xs text-secondary/70 dark:text-white/35">Sin la app abierta</p>
        )}
      </div>

      {!isMe && (
        room ? (
          <button
            type="button"
            onClick={() => onJoin(room)}
            disabled={together}
            className={clsx(buttonClass, 'bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-400')}
          >
            <LogIn size={15} />
            {together ? 'Juntos' : 'Unirme'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onCall(member, status)}
            className={clsx(buttonClass, 'bg-slate-100 text-primary hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15')}
          >
            <Phone size={15} />
            Llamar
          </button>
        )
      )}
    </li>
  );
};

// ─── Salas ────────────────────────────────────────────────────────────────────

const RoomRow = ({ room, emoji, description, occupants, isHere, onJoin }) => (
  <li className={clsx(cardClass, 'flex items-center gap-3')}>
    <span className="text-xl leading-none" aria-hidden>{emoji}</span>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-primary dark:text-white">{roomTitle(room)}</p>
      <p className="text-xs text-secondary dark:text-white/50">
        {occupants.length > 0 ? occupants.join(', ') : description || 'Vacía'}
      </p>
    </div>
    <div className="hidden -space-x-2 sm:flex">
      {occupants.map((member) => (
        <MemberAvatar key={member} name={member} size="md" ring />
      ))}
    </div>
    <button
      type="button"
      onClick={() => onJoin(room)}
      disabled={isHere}
      className={clsx(
        buttonClass,
        isHere
          ? 'bg-green-500/10 text-green-700 dark:text-green-400'
          : 'bg-accent text-white hover:opacity-90'
      )}
    >
      {isHere ? 'Estás aquí' : 'Entrar'}
    </button>
  </li>
);

// ─── Uso del plan y meta de adopción ─────────────────────────────────────────

const UsagePanel = ({ events }) => {
  const now = useNow();
  const usage = useMemo(() => summarizeMonthUsage(events, now), [events, now]);
  const adoption = useMemo(() => summarizeAdoption(events, now), [events, now]);
  const percent = Math.min(100, Math.round(usage.ratio * 100));

  // Aviso una vez por día al pasar el 80% del plan gratis.
  useEffect(() => {
    if (!usage.warning || typeof window === 'undefined') return;
    try {
      const today = dayKey(new Date());
      if (window.localStorage.getItem(USAGE_ALERT_KEY) === today) return;
      window.localStorage.setItem(USAGE_ALERT_KEY, today);
    } catch {
      // sin almacenamiento: avisar igual
    }
    toast(`La oficina ya usó ${percent}% de los minutos gratis de LiveKit este mes.`, { icon: '⚠️', duration: 8000 });
  }, [usage.warning, percent]);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className={cardClass}>
        <p className="text-sm font-semibold text-primary dark:text-white">Uso del mes</p>
        <p className="mt-1 text-xs text-secondary dark:text-white/50">
          {usage.minutes.toLocaleString('es-PE')} de {usage.limit.toLocaleString('es-PE')} minutos del plan gratis de LiveKit
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div
            className={clsx('h-full rounded-full', usage.warning ? 'bg-amber-500' : 'bg-green-500')}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-secondary dark:text-white/50">
          ≈ {usage.perPersonPerBusinessDay} min por persona por día hábil (el plan alcanza para unos 57).
        </p>
        {usage.warning && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangle size={13} /> Cerca del límite: al llegar, LiveKit corta las conexiones nuevas hasta el mes siguiente.
          </p>
        )}
      </div>

      <div className={cardClass}>
        <p className="text-sm font-semibold text-primary dark:text-white">
          Meta para pasar al mapa {adoption.goalMet && <span className="text-green-600 dark:text-green-400">· cumplida</span>}
        </p>
        <p className="mt-1 text-xs text-secondary dark:text-white/50">
          {ADOPTION_GOAL.members} de {TEAM_MEMBERS.length} personas en una sala {ADOPTION_GOAL.daysPerWeek} días por semana, {ADOPTION_GOAL.weeks} semanas seguidas.
        </p>
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="text-left text-secondary dark:text-white/40">
              <th className="py-1 font-medium">Semana</th>
              {TEAM_MEMBERS.map((member) => (
                <th key={member} className="py-1 text-center font-medium" title={member}>{MEMBER_ABBREV[member] || member.slice(0, 2)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {adoption.weeks.map((week) => (
              <tr key={week.start.toISOString()} className="border-t border-slate-100 dark:border-white/5">
                <td className="py-1 text-secondary dark:text-white/60">
                  {week.current ? 'Esta' : week.start.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                  {week.met && ' ✓'}
                </td>
                {TEAM_MEMBERS.map((member) => (
                  <td
                    key={member}
                    className={clsx(
                      'py-1 text-center',
                      week.daysByMember[member] >= ADOPTION_GOAL.daysPerWeek
                        ? 'font-semibold text-green-600 dark:text-green-400'
                        : 'text-secondary dark:text-white/50'
                    )}
                  >
                    {week.daysByMember[member]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Vista ────────────────────────────────────────────────────────────────────

const VistaOficina = () => {
  const me = useMyMember();
  const presence = useStore((state) => state.officePresence);
  const presenceStatus = useStore((state) => state.officePresenceStatus);
  const voiceState = useStore((state) => state.voiceState);
  const activeVoiceRoom = useStore((state) => state.activeVoiceRoom);
  const setActiveVoiceRoom = useStore((state) => state.setActiveVoiceRoom);
  const setIsVoiceRoomMinimized = useStore((state) => state.setIsVoiceRoomMinimized);
  const directory = useOfficeDirectory();
  const events = useRoomEvents();

  const myRoom = voiceState.room || activeVoiceRoom;
  // Quien está en una sala según la presencia, más uno mismo mientras conecta.
  const occupantsByRoom = useMemo(() => {
    const rooms = groupByRoom(presence);
    if (me && myRoom && !(rooms[myRoom] || []).includes(me)) rooms[myRoom] = [...(rooms[myRoom] || []), me];
    return rooms;
  }, [presence, me, myRoom]);

  // Se entra minimizado para seguir viendo la oficina.
  const joinRoom = (room) => {
    setActiveVoiceRoom(room);
    setIsVoiceRoomMinimized(true);
  };

  const callMember = (member, status) => {
    if (!me) return;
    if (statusMutesMic(status.kind) && !window.confirm(`${member} está «${STATUS_KINDS[status.kind].label}». ¿Llamar igual?`)) {
      return;
    }
    const room = buildCallRoom(me, member);
    joinRoom(room);
    const text = `${me} te llama en la oficina de Cerezo: ${buildJoinLink(window.location.origin, room)}`;
    window.open(buildWhatsAppLink(directory[member], text), '_blank', 'noopener,noreferrer');
    if (!directory[member]) {
      toast(`${member} no cargó su WhatsApp en Ajustes: elige el contacto en WhatsApp.`, { icon: '💬' });
    }
  };

  const callRooms = Object.keys(occupantsByRoom).filter((room) => parseCallRoom(room));
  const members = me ? [me, ...TEAM_MEMBERS.filter((member) => member !== me)] : TEAM_MEMBERS;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold text-primary dark:text-white">Oficina</h1>
        <p className="text-sm text-secondary dark:text-white/60">
          El estado sale de la agenda y se actualiza solo. Entras a las salas silenciado.
        </p>
        {presenceStatus === 'error' && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <AlertTriangle size={13} />
            No se pudo conectar la presencia en vivo: se ve la agenda, pero no quién está en cada sala.
          </p>
        )}
      </header>

      <section aria-labelledby="oficina-equipo">
        <h2 id="oficina-equipo" className="mb-2 text-xs font-semibold uppercase tracking-widest text-secondary dark:text-white/50">
          Equipo
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {members.map((member) => (
            <MemberRow
              key={member}
              member={member}
              isMe={member === me}
              presence={presence[member]}
              myRoom={myRoom}
              onCall={callMember}
              onJoin={joinRoom}
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="oficina-salas">
        <h2 id="oficina-salas" className="mb-2 text-xs font-semibold uppercase tracking-widest text-secondary dark:text-white/50">
          Salas
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {OFFICE_ROOMS.map(({ id, emoji, description }) => (
            <RoomRow
              key={id}
              room={id}
              emoji={emoji}
              description={description}
              occupants={occupantsByRoom[id] || []}
              isHere={myRoom === id}
              onJoin={joinRoom}
            />
          ))}
          {callRooms.map((room) => (
            <RoomRow
              key={room}
              room={room}
              emoji="📞"
              occupants={occupantsByRoom[room]}
              isHere={myRoom === room}
              onJoin={joinRoom}
            />
          ))}
        </ul>
      </section>

      <section aria-labelledby="oficina-uso">
        <h2 id="oficina-uso" className="mb-2 text-xs font-semibold uppercase tracking-widest text-secondary dark:text-white/50">
          Uso
        </h2>
        <UsagePanel events={events} />
      </section>
    </div>
  );
};

export default VistaOficina;
