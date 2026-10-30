'use client';

import { useEffect, useRef, useState } from 'react';
import useStore from './useStore';
import { supabase } from '../config/supabase';
import { getMemberNameForUser, isTeamUser } from '../constants/team';
import { getMemberAgenda, resolveStatus } from '../lib/office/status';
import { PRESENCE_CHANNEL, buildPresencePayload, summarizePresence } from '../lib/office/presence';

// Hora actual que se renueva sola: el estado de agenda cambia con el reloj
// (un rodaje empieza o termina) aunque nadie toque nada.
export const useNow = (intervalMs = 60 * 1000) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

// Estado de un integrante: agenda + lo que eligió a mano. Para uno mismo se usa
// la elección local; para los demás, la que publican por presencia.
export const useMemberStatus = (member) => {
  const projects = useStore((state) => state.projects);
  const currentUser = useStore((state) => state.currentUser);
  const ownManual = useStore((state) => state.manualStatus);
  const presence = useStore((state) => state.officePresence);
  const now = useNow();
  const isMe = member && member === getMemberNameForUser(currentUser);
  const manual = isMe ? ownManual : presence[member]?.manual || null;
  return resolveStatus({ agenda: getMemberAgenda(projects, member, now), manual, now });
};

export const useMyMember = () => getMemberNameForUser(useStore((state) => state.currentUser));

export const useMyStatus = () => useMemberStatus(useMyMember());

// Une al usuario al canal privado "oficina" de Supabase Realtime y publica su
// estado elegido a mano y su sala. Solo el equipo puede leerlo o escribirlo
// (políticas sobre realtime.messages, ver supabase/migrations).
export const useOfficePresence = () => {
  const currentUser = useStore((state) => state.currentUser);
  const manualStatus = useStore((state) => state.manualStatus);
  const voiceState = useStore((state) => state.voiceState);
  const setOfficePresence = useStore((state) => state.setOfficePresence);
  const setOfficePresenceStatus = useStore((state) => state.setOfficePresenceStatus);
  const member = getMemberNameForUser(currentUser);
  const enabled = Boolean(supabase && member && isTeamUser(currentUser));
  const channelRef = useRef(null);
  const joinedRef = useRef(false);
  const latestRef = useRef({ manualStatus, voiceState });
  latestRef.current = { manualStatus, voiceState };

  useEffect(() => {
    if (!enabled) return undefined;
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { private: true, presence: { key: member } },
    });
    channelRef.current = channel;
    setOfficePresenceStatus('connecting');

    channel
      .on('presence', { event: 'sync' }, () => setOfficePresence(summarizePresence(channel.presenceState())))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          joinedRef.current = true;
          setOfficePresenceStatus('live');
          const { manualStatus: manual, voiceState: voice } = latestRef.current;
          await channel.track(buildPresencePayload({ member, manual, voice }));
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          joinedRef.current = false;
          setOfficePresenceStatus('error');
        }
      });

    return () => {
      joinedRef.current = false;
      channelRef.current = null;
      supabase.removeChannel(channel);
      setOfficePresence({});
      setOfficePresenceStatus('idle');
    };
  }, [enabled, member, setOfficePresence, setOfficePresenceStatus]);

  useEffect(() => {
    if (!joinedRef.current || !channelRef.current) return;
    channelRef.current.track(buildPresencePayload({ member, manual: manualStatus, voice: voiceState }));
  }, [member, manualStatus, voiceState]);
};
