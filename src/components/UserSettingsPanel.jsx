'use client';

import { useState, useEffect } from 'react';
import { X, User, Mic, MicOff, Check, Loader2 } from 'lucide-react';
import useStore from '../hooks/useStore';
import { supabase } from '../config/supabase';
import { toast } from 'react-hot-toast';

// ─── Color palette ─────────────────────────────────────────────────────────────
export const AVATAR_COLORS = [
  { id: 'indigo',  label: 'Índigo',   hex: '#6366f1' },
  { id: 'blue',    label: 'Azul',     hex: '#3b82f6' },
  { id: 'sky',     label: 'Cielo',    hex: '#0ea5e9' },
  { id: 'cyan',    label: 'Cian',     hex: '#06b6d4' },
  { id: 'teal',    label: 'Teal',     hex: '#14b8a6' },
  { id: 'emerald', label: 'Verde',    hex: '#10b981' },
  { id: 'amber',   label: 'Ámbar',   hex: '#f59e0b' },
  { id: 'orange',  label: 'Naranja',  hex: '#f97316' },
  { id: 'red',     label: 'Rojo',     hex: '#ef4444' },
  { id: 'pink',    label: 'Rosa',     hex: '#ec4899' },
  { id: 'violet',  label: 'Violeta',  hex: '#8b5cf6' },
  { id: 'slate',   label: 'Gris',     hex: '#64748b' },
];

const MIC_KEY = 'cerezo-default-mic';

const getInitialsFromName = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase() || '').join('') || '?';

// ─── Main component ────────────────────────────────────────────────────────────

export default function UserSettingsPanel({ onClose }) {
  const currentUser = useStore((s) => s.currentUser);
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const userAvailability = useStore((s) => s.userAvailability);
  const setUserAvailability = useStore((s) => s.setUserAvailability);

  const meta = currentUser?.user_metadata || {};

  const [displayName, setDisplayName] = useState(meta.display_name || '');
  const [avatarColor, setAvatarColor] = useState(
    meta.avatar_color || AVATAR_COLORS[0].hex
  );
  const [defaultMic, setDefaultMic] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem(MIC_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [saving, setSaving] = useState(false);

  const initials = getInitialsFromName(displayName) ||
    getInitialsFromName(currentUser?.email?.split('@')[0] || '');

  const handleSave = async () => {
    setSaving(true);
    try {
      // Persist mic preference in localStorage
      localStorage.setItem(MIC_KEY, String(defaultMic));

      // Persist name + color in Supabase user metadata
      if (supabase) {
        const { data, error } = await supabase.auth.updateUser({
          data: {
            display_name: displayName.trim(),
            avatar_color: avatarColor,
          },
        });
        if (error) throw error;

        // Force-refresh the JWT so user_metadata is up to date
        const { data: sessionData } = await supabase.auth.refreshSession();
        const updatedUser = sessionData?.user ?? data?.user ?? currentUser;
        setCurrentUser(updatedUser);
      }

      toast.success('Ajustes guardados');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron guardar los ajustes');
    } finally {
      setSaving(false);
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-[160] h-full w-full max-w-sm bg-white dark:bg-[#16171D] border-l border-slate-200 dark:border-white/5 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Ajustes de perfil</h2>
            <p className="text-xs text-slate-400 mt-0.5">{currentUser?.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-white transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">

          {/* ── Avatar preview ── */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg shrink-0 transition-all duration-200"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {displayName || currentUser?.email?.split('@')[0] || 'Sin nombre'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{userAvailability}</p>
            </div>
          </div>

          {/* ── Nombre ── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
              <User size={12} />
              Nombre para mostrar
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej. Marcelo M."
              maxLength={40}
              className="w-full rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/5 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
            <p className="text-[11px] text-slate-400">
              Aparece en la sala de voz y en el chat. Si lo dejas vacío se usará tu email.
            </p>
          </div>

          {/* ── Color de avatar ── */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Color de avatar
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setAvatarColor(c.hex)}
                  title={c.label}
                  className="relative w-full aspect-square rounded-xl transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                  style={{ backgroundColor: c.hex }}
                >
                  {avatarColor === c.hex && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check size={14} className="text-white drop-shadow" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Disponibilidad ── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Estado
            </label>
            <div className="flex flex-col gap-2">
              {[
                { value: 'Activo - Editando',    emoji: '🟢' },
                { value: 'En grabación',          emoji: '🎬' },
                { value: 'Ocupado',               emoji: '🟡' },
                { value: 'Fuera de la oficina',   emoji: '⚪' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setUserAvailability(opt.value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-left transition-all border ${
                    userAvailability === opt.value
                      ? 'border-accent/40 bg-accent/5 text-accent dark:text-[#FF4B2A]'
                      : 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/8'
                  }`}
                >
                  <span>{opt.emoji}</span>
                  <span>{opt.value}</span>
                  {userAvailability === opt.value && (
                    <Check size={14} className="ml-auto shrink-0" strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ── Sala de voz ── */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Sala de voz
            </label>
            <button
              onClick={() => setDefaultMic((v) => !v)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all ${
                defaultMic
                  ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5'
                  : 'border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                defaultMic ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/15 text-red-500'
              }`}>
                {defaultMic ? <Mic size={18} /> : <MicOff size={18} />}
              </div>
              <div className="text-left">
                <p className={`text-sm font-medium ${defaultMic ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-600 dark:text-red-400'}`}>
                  {defaultMic ? 'Micrófono activado al entrar' : 'Entrar silenciado'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Click para cambiar</p>
              </div>
              {/* Toggle pill */}
              <div className={`ml-auto w-11 h-6 rounded-full transition-all shrink-0 ${defaultMic ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-all mt-0.5 ${defaultMic ? 'translate-x-5.5 ml-0.5' : 'ml-0.5'}`}
                  style={{ transform: defaultMic ? 'translateX(20px)' : 'translateX(0px)', margin: '2px' }}
                />
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-100 dark:border-white/5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </>
  );
}
