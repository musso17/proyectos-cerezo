'use client';

import React, { useState } from 'react';
import { Phone, X } from 'lucide-react';
import useStore from '../../hooks/useStore';
import { useMyMember } from '../../hooks/useOffice';
import { parseCallRoom } from '../../lib/office/rooms';

// Si alguien te llama (entró a "Llamada <tú> y <otro>") y tienes la app
// abierta, lo ves acá además del WhatsApp.
const IncomingCallBanner = () => {
  const me = useMyMember();
  const presence = useStore((state) => state.officePresence);
  const voiceState = useStore((state) => state.voiceState);
  const setActiveVoiceRoom = useStore((state) => state.setActiveVoiceRoom);
  const [dismissed, setDismissed] = useState(() => new Set());

  if (!me) return null;
  const incoming = Object.entries(presence).find(([member, info]) => {
    if (member === me || !info?.room || info.room === voiceState.room || dismissed.has(info.room)) return false;
    return (parseCallRoom(info.room) || []).includes(me);
  });
  if (!incoming) return null;
  const [caller, { room }] = incoming;

  return (
    <div
      role="alert"
      className="fixed inset-x-3 top-3 z-[120] mx-auto flex max-w-md items-center gap-3 rounded-lg border border-green-500/30 bg-slate-900/95 px-4 py-3 text-white shadow-2xl backdrop-blur-md"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-400">
        <Phone size={16} className="animate-pulse" />
      </span>
      <p className="min-w-0 flex-1 text-sm">
        <span className="font-semibold">{caller}</span> te está llamando
      </p>
      <button
        type="button"
        onClick={() => setActiveVoiceRoom(room)}
        className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-600"
      >
        Contestar
      </button>
      <button
        type="button"
        onClick={() => setDismissed((prev) => new Set(prev).add(room))}
        aria-label="Ignorar llamada"
        className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default IncomingCallBanner;
