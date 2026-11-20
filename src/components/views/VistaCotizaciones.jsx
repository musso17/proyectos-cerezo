'use client';

import React, { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import useStore from '../../hooks/useStore';
import { supabase } from '../../supabaseclient';
import { mountCotizador } from '../../lib/cotizador/editor';
import { createSupabaseStore } from '../../lib/cotizador/supabaseStore';
import '../../lib/cotizador/cotizador.css';

// Cotizaciones con el formato oficial de Cerezo.Studio: se editan sobre la hoja,
// se guardan para todo el equipo (tabla public.cotizaciones) y se descargan en
// PDF vectorial liviano para enviar por correo.
const VistaCotizaciones = () => {
  const rootRef = useRef(null);
  const userId = useStore((state) => state.currentUser?.id || null);

  useEffect(() => {
    if (!rootRef.current || !supabase) return undefined;
    const notify = (message, kind) => {
      if (kind === 'success') toast.success(message);
      else if (kind === 'error') toast.error(message);
      else toast(message);
    };
    return mountCotizador(rootRef.current, {
      store: createSupabaseStore(supabase),
      userKey: userId || 'anon',
      notify,
    });
  }, [userId]);

  if (!supabase) {
    return <p className="p-6 text-sm text-secondary">El cotizador necesita la conexión con Supabase.</p>;
  }
  return <div ref={rootRef} className="min-h-[60vh]" />;
};

export default VistaCotizaciones;
