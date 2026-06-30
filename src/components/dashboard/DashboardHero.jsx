"use client";

import React from 'react';
import { Activity, Video, PenSquare, CheckCircle2, Radio, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { TEAM_STYLES } from '../../constants/team';
import useStore from '../../hooks/useStore';

const CARBONO_LIMIT = 5;

// ─── helpers ────────────────────────────────────────────────────────────────
const STATUS_PROGRESS = {
  Programado: 15,
  'En progreso': 55,
  'En revisión': 85,
  Completado: 100,
  Stuck: 40,
};

const STATUS_COLOR = {
  Programado: 'bg-slate-400',
  'En progreso': 'bg-amber-500',
  'En revisión': 'bg-blue-500',
  Completado: 'bg-green-500',
  Stuck: 'bg-red-500',
};

const STATUS_TEXT = {
  Programado: 'text-slate-400 dark:text-slate-400',
  'En progreso': 'text-amber-500',
  'En revisión': 'text-blue-500 dark:text-blue-400',
  Completado: 'text-green-500',
  Stuck: 'text-red-500',
};

// 2-letter abbreviations to disambiguate similar names (Marcelo vs Mauricio)
const ABBREV = { Marcelo: 'Ma', Mauricio: 'Mu', Edson: 'Ed', Luis: 'Lu' };

// Mismos niveles que ManagerLoadTable (total de proyectos activos asignados),
// con la nomenclatura pedida: Libre / Carga media / Saturado.
const LOAD_LABEL = { 'Carga alta': 'Saturado', 'Carga media': 'Carga media', 'Carga controlada': 'Libre' };
const LOAD_DOT = { 'Carga alta': 'bg-red-500', 'Carga media': 'bg-amber-400', 'Carga controlada': 'bg-emerald-500' };
const LOAD_TEXT = {
  'Carga alta': 'text-red-500',
  'Carga media': 'text-amber-500',
  'Carga controlada': 'text-emerald-500',
};

const getManagers = (p) => {
  if (Array.isArray(p.managers) && p.managers.length) return p.managers;
  if (Array.isArray(p.properties?.managers) && p.properties.managers.length) return p.properties.managers;
  if (p.manager) return p.manager.split(',').map((m) => m.trim()).filter(Boolean);
  return [];
};

const avatarLabel = (name = '') => {
  const first = name.trim().split(/[\s._-]+/)[0] || '';
  return ABBREV[first] || (first.charAt(0).toUpperCase() + (first.charAt(1) || '').toLowerCase());
};

const teamColor = (name = '') => {
  const first = name.trim().split(/[\s._-]+/)[0];
  return TEAM_STYLES[first]?.bg || TEAM_STYLES.default.bg;
};

const VOICE_ROOMS = [
  { id: 'General', emoji: '🎙️' },
  { id: 'Carbono', emoji: '🚗' },
];

// ─── priority card ────────────────────────────────────────────────────────────
const PriorityCard = ({ project, onClick }) => {
  const managers = getManagers(project);
  const progress = STATUS_PROGRESS[project.status] ?? 20;
  const dot = STATUS_COLOR[project.status] || 'bg-slate-400';
  const statusText = STATUS_TEXT[project.status] || 'text-slate-400';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-lg border border-slate-100 bg-white p-4 text-left transition-all hover:border-accent/30 hover:shadow-md dark:border-white/5 dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
    >
      <span className={`h-10 w-1 shrink-0 rounded-full ${dot}`} />

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${statusText}`}>
            {project.status}
          </span>
        </div>
        <h4 className="line-clamp-1 font-semibold text-primary dark:text-white">{project.name || 'Sin nombre'}</h4>
        <p className="mt-0.5 text-xs text-secondary/60 dark:text-white/40">{project.client || '—'}</p>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div className={`h-full rounded-full ${dot} transition-all`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <ArrowUpRight size={15} className="text-secondary/30 transition-all group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        <div className="flex -space-x-2">
          {managers.slice(0, 3).map((m, i) => (
            <div
              key={i}
              title={m}
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-sm dark:border-[#16171D] ${teamColor(m)}`}
            >
              {avatarLabel(m)}
            </div>
          ))}
          {managers.length === 0 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-300 text-[10px] font-bold text-white dark:border-[#16171D] dark:bg-slate-600">
              ?
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

// ─── KPI mini ───────────────────────────────────────────────────────────────
const MiniKpi = ({ label, value, icon: Icon }) => (
  <div className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-white p-4 dark:border-white/5 dark:bg-white/[0.03]">
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-secondary/40 dark:text-white/30">{label}</span>
      {Icon && <Icon size={15} className="text-secondary/30 dark:text-white/30" />}
    </div>
    <span className="text-2xl font-semibold text-primary dark:text-white leading-none">{value}</span>
  </div>
);

// ─── hero ─────────────────────────────────────────────────────────────────────
const DashboardHero = ({ projects, totals, carbonoProjectsThisMonth, managerLoad = [] }) => {
  const currentUser = useStore((state) => state.currentUser);
  const openModal = useStore((state) => state.openModal);
  const activeVoiceRoom = useStore((state) => state.activeVoiceRoom);
  const setActiveVoiceRoom = useStore((state) => state.setActiveVoiceRoom);

  const firstName =
    currentUser?.user_metadata?.display_name?.split(' ')[0] ||
    currentUser?.user_metadata?.full_name?.split(' ')[0] ||
    currentUser?.email?.split('@')[0] ||
    'Equipo';
  const today = new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(new Date());

  const myPriorities = (projects || []).filter((p) => {
    if (!currentUser) return false;
    const term = (currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || currentUser.email || '').toLowerCase();
    const m = getManagers(p).join(' ').toLowerCase() + ' ' + (p.manager || '').toLowerCase();
    return (m.includes(term.split('@')[0]) || m.includes(term.split(' ')[0])) &&
      ['En progreso', 'En revisión', 'Stuck', 'Programado'].includes(p.status);
  }).slice(0, 4);

  // Carbono quota
  const carbonoCount = carbonoProjectsThisMonth;
  const carbonoPct = Math.min((carbonoCount / CARBONO_LIMIT) * 100, 100);
  const carbonoState =
    carbonoCount >= CARBONO_LIMIT ? { bar: 'bg-red-500', text: 'text-red-500' } :
    carbonoCount >= CARBONO_LIMIT - 1 ? { bar: 'bg-amber-500', text: 'text-amber-500' } :
    { bar: 'bg-accent', text: 'text-primary dark:text-white' };

  // Capacity insight — managers overloaded
  const overloaded = managerLoad.filter((m) => m.level === 'Carga alta').map((m) => m.manager);

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      {/* LEFT — prioridades */}
      <div className="lg:col-span-7 xl:col-span-8">
        <div className="glass-panel rounded-xl p-6">
          <h2 className="text-xl font-bold text-primary dark:text-white">
            Hola {firstName}, hoy es {today}.
          </h2>
          <p className="mb-4 mt-1 text-sm font-medium text-secondary/60 dark:text-white/40">
            Tus prioridades de hoy
          </p>

          {/* Insight de capacidad (IA) */}
          {overloaded.length > 0 && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="text-xs leading-relaxed text-amber-600 dark:text-amber-300/80">
                <strong className="font-semibold">Capacidad al límite:</strong>{' '}
                {overloaded.join(', ')} {overloaded.length > 1 ? 'están' : 'está'} con carga alta. Considera redistribuir proyectos.
              </p>
            </div>
          )}

          {myPriorities.length > 0 ? (
            <div className="flex flex-col gap-3">
              {myPriorities.map((p) => (
                <PriorityCard key={p.id} project={p} onClick={() => openModal(p)} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-12 text-center dark:border-white/10">
              <CheckCircle2 size={26} className="text-green-500/60" />
              <p className="text-sm text-secondary/50 dark:text-white/40">
                No tienes proyectos asignados. ¡Disfruta el día!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — métricas + contexto */}
      <div className="flex flex-col gap-6 lg:col-span-5 xl:col-span-4">
        {/* Métricas clave */}
        <div className="glass-panel rounded-xl p-6">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-secondary/40 dark:text-white/30">
            Métricas clave del mes
          </p>

          {/* Carbono — cuota X/5 */}
          <div className="mb-4 rounded-lg border border-slate-100 bg-white p-4 dark:border-white/5 dark:bg-white/[0.03]">
            <div className="mb-2 flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold text-primary dark:text-white">Carbono</p>
                <p className="text-xs text-secondary/50 dark:text-white/40">Cuota mensual</p>
              </div>
              <p className="leading-none">
                <span className={`text-2xl font-bold ${carbonoState.text}`}>{carbonoCount}</span>
                <span className="text-sm text-secondary/40 dark:text-white/30"> / {CARBONO_LIMIT}</span>
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div className={`h-full rounded-full ${carbonoState.bar} transition-all`} style={{ width: `${carbonoPct}%` }} />
            </div>
            {carbonoCount >= CARBONO_LIMIT && (
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-red-500">
                Límite mensual alcanzado
              </p>
            )}
          </div>

          {/* 2x2 KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <MiniKpi label="Activos" value={totals.active} icon={Activity} />
            <MiniKpi label="Grabación" value={totals.recording} icon={Video} />
            <MiniKpi label="Edición" value={totals.editing} icon={PenSquare} />
            <MiniKpi label="Entregados" value={totals.delivered} icon={CheckCircle2} />
          </div>
        </div>

        {/* Carga del equipo — vista rápida, sin tener que bajar a la tabla de Capacidad */}
        {managerLoad.length > 0 && (
          <div className="glass-panel rounded-xl p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-secondary/40 dark:text-white/30">
              Carga del equipo
            </p>
            <div className="flex flex-col gap-2.5">
              {managerLoad.map(({ manager, total, level }) => (
                <div key={manager} className="flex items-center gap-2.5">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-sm dark:border-[#16171D] ${teamColor(manager)}`}
                  >
                    {avatarLabel(manager)}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-primary dark:text-white/80">
                    {manager}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${LOAD_DOT[level] || 'bg-slate-400'}`} />
                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${LOAD_TEXT[level] || 'text-secondary/50'}`}>
                      {LOAD_LABEL[level] || level}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Salas de voz */}
        <div className="glass-panel rounded-xl p-5">
          <div className="mb-3 flex items-center gap-2">
            <Radio size={14} className="text-secondary/50 dark:text-white/40" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-secondary/40 dark:text-white/30">
              Salas de voz
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {VOICE_ROOMS.map(({ id, emoji }) => {
              const isActive = activeVoiceRoom === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveVoiceRoom(isActive ? null : id)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'text-secondary hover:bg-slate-50 dark:text-white/60 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="text-base leading-none">{emoji}</span>
                  <span className="flex-1 text-left">{id}</span>
                  {isActive ? (
                    <span className="text-[10px] font-semibold uppercase text-green-500">En vivo</span>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHero;
