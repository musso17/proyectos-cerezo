"use client";

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
} from 'recharts';
import {
  Activity,
  Video,
  PenSquare,
  CheckCircle2,
  CalendarDays,
  Clock,
  Users,
  AlertTriangle,
  GaugeCircle,
} from 'lucide-react';
import {
  differenceInCalendarDays,
  isSameMonth,
  parseISO,
  isValid,
  isAfter,
  format,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import useStore from '../../hooks/useStore';

const VistaDashboard = () => {
  const projects = useStore((state) => state.projects || []);

  const {
    totals,
    completedThisMonth,
    avgDeliveryDays,
    statusData,
    activeStatusData,
    clientsData,
    recordingsByWeek,
    editingAverageByType,
    projectsUnder48h,
    totalProjectsCompleted,
    lateEvents,
    upcomingEvents,
    managerLoad,
  } = useMemo(() => buildDashboardData(projects), [projects]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Proyectos activos"
          value={totals.active}
          description="Incluye pendientes y en progreso"
          icon={Activity}
          accent="text-emerald-300 bg-emerald-500/15 border-emerald-400/30"
        />
        <MetricCard
          title="En grabación"
          value={totals.recording}
          description="Proyectos con fecha de grabación vigente"
          icon={Video}
          accent="text-sky-300 bg-sky-500/15 border-sky-400/30"
        />
        <MetricCard
          title="En edición"
          value={totals.editing}
          description="Proyectos en etapa de post-producción"
          icon={PenSquare}
          accent="text-amber-300 bg-amber-500/15 border-amber-400/30"
        />
        <MetricCard
          title="Entregados"
          value={totals.delivered}
          description="Proyectos marcados como completados"
          icon={CheckCircle2}
          accent="text-lime-300 bg-lime-500/15 border-lime-400/30"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Completados este mes"
          value={completedThisMonth}
          description="Proyectos completados durante el mes actual"
          icon={GaugeCircle}
          accent="text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-400/30"
        />
        <MetricCard
          title="Tiempo promedio de entrega"
          value={avgDeliveryDays !== null ? `${avgDeliveryDays} días` : 'Sin datos'}
          description="Días entre inicio del proyecto y su finalización"
          icon={Clock}
          accent="text-cyan-300 bg-cyan-500/15 border-cyan-400/30"
        />
        <MetricCard
          title="Proyectos editados &lt; 48h"
          value={
            totalProjectsCompleted > 0
              ? `${projectsUnder48h} / ${totalProjectsCompleted}`
              : 'Sin entregas'
          }
          description="Proyectos completados en menos de 2 días desde su inicio"
          icon={Activity}
          accent="text-rose-300 bg-rose-500/15 border-rose-400/30"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="glass-panel col-span-1 flex flex-col gap-4 rounded-3xl border border-white/5 bg-slate-950/60 p-5 transition-all">
          <Header title="Proyectos activos por estado" subtitle="Incluye únicamente proyectos no entregados" />
          <ChartContainer>
            {activeStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="status" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: '1px solid rgba(148,163,184,0.25)',
                    }}
                    formatter={(value) => [`${value} proyectos`, 'Total']}
                  />
                  <Bar dataKey="total" fill="#34d399" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No hay datos para mostrar" />
            )}
          </ChartContainer>
        </div>

        <div className="glass-panel col-span-1 flex flex-col gap-4 rounded-3xl border border-white/5 bg-slate-950/60 p-5 transition-all xl:col-span-2">
          <Header title="Proyectos por cliente" subtitle="Clientes con proyectos registrados" />
          <ChartContainer>
            {clientsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="client" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: '1px solid rgba(148,163,184,0.25)',
                    }}
                    formatter={(value) => [`${value} proyectos`, 'Total']}
                  />
                  <Bar dataKey="total" fill="#60a5fa" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Sin clientes registrados" />
            )}
          </ChartContainer>
        </div>

        <div className="glass-panel col-span-1 flex flex-col gap-4 rounded-3xl border border-white/5 bg-slate-950/60 p-5 transition-all xl:col-span-2">
          <Header title="Grabaciones por semana" subtitle="Cantidad de grabaciones únicas" />
          <ChartContainer>
            {recordingsByWeek.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recordingsByWeek}>
                  <defs>
                    <linearGradient id="colorRecording" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: '1px solid rgba(148,163,184,0.25)',
                    }}
                    formatter={(value) => [`${value} grabaciones`, 'Total']}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#34d399"
                    fillOpacity={1}
                    fill="url(#colorRecording)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Aún no hay grabaciones registradas" />
            )}
          </ChartContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4">
        <div className="glass-panel flex flex-col gap-4 rounded-3xl border border-white/5 bg-slate-950/60 p-5 transition-all">
          <Header title="Promedio de días de edición por tipo" subtitle="Cálculo entre la fecha de inicio y de finalización" />
          <ChartContainer>
            {editingAverageByType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={editingAverageByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="type" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: '1px solid rgba(148,163,184,0.25)',
                    }}
                    formatter={(value) => [`${value} días`, 'Promedio']}
                  />
                  <Bar dataKey="avgDays" fill="#facc15" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Sin registros con fechas de entrega" />
            )}
          </ChartContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="glass-panel col-span-1 flex flex-col gap-3 rounded-3xl border border-white/5 bg-slate-950/60 p-5 transition-all xl:col-span-3">
          <Header title="Calendario de próximas grabaciones y entregas" subtitle="Eventos en los próximos 30 días" />
          {upcomingEvents.length > 0 ? (
            <ul className="divide-y divide-slate-800/60">
              {upcomingEvents.map(({ id, date, label, project, description }) => (
                <li key={`${id}-${label}`} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-slate-900 text-secondary">
                      <CalendarDays size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        {project}
                      </p>
                      <p className="text-xs text-secondary/80">{description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <span className="rounded-full border border-border/60 bg-slate-900 px-3 py-1 text-xs font-medium text-secondary">
                      {label}
                    </span>
                    <span className="text-sm font-medium text-accent">
                      {format(date, "d 'de' MMMM, HH:mm'h'", { locale: es })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="No hay eventos próximos en las próximas semanas" />
          )}
        </div>

        <div className="glass-panel col-span-1 flex flex-col gap-4 rounded-3xl border border-white/5 bg-slate-950/60 p-5 transition-all">
          <Header title="Semáforo de carga por persona" subtitle="Proyectos activos asignados" />
          {managerLoad.length > 0 ? (
            <ul className="space-y-3">
              {managerLoad.map(({ manager, total, level }) => (
                <li key={manager} className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-900/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${getLoadColor(level)}`} />
                    <p className="text-sm font-medium text-primary">{manager}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-secondary">{total} activos</p>
                    <p className="text-xs text-secondary/70">{level}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="No hay encargados asignados" />
          )}
          <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-slate-900/60 px-3 py-2 text-xs text-secondary/90">
            <AlertTriangle size={14} className="text-amber-300" />
            <span>Verifica la carga semanal para redistribuir si es necesario.</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass-panel flex flex-col gap-3 rounded-3xl border border-white/5 bg-slate-950/60 p-5 transition-all">
          <Header title="Eventos con entrega tardía" subtitle="Eventos cuya entrega ya venció" />
          <div className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-5">
            <div className="flex items-center gap-3">
              <AlertTriangle size={26} className="text-amber-300" />
              <div>
                <p className="text-lg font-semibold text-primary">{lateEvents}</p>
                <p className="text-xs uppercase tracking-wide text-secondary/70">Eventos atrasados</p>
              </div>
            </div>
            <p className="text-sm text-secondary/80">
              Considera priorizar estas entregas para mejorar la satisfacción del cliente.
            </p>
          </div>
        </div>

        <div className="glass-panel flex flex-col gap-3 rounded-3xl border border-white/5 bg-slate-950/60 p-5 transition-all">
          <Header title="Resumen general de estados" subtitle="Todos los proyectos registrados" />
          {statusData.length > 0 ? (
            <ul className="space-y-3">
              {statusData.map(({ status, total }) => (
                <li key={status} className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-900/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-secondary" />
                    <p className="text-sm font-medium text-primary">{status}</p>
                  </div>
                  <p className="text-sm font-semibold text-secondary">{total}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="Sin proyectos registrados" />
          )}
        </div>
      </section>
    </div>
  );
};

export default VistaDashboard;

const MetricCard = ({ title, value, description, icon: Icon, accent }) => (
  <div className="glass-panel flex flex-col justify-between rounded-3xl border border-white/5 bg-slate-950/60 p-5 transition-all hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_28px_60px_rgba(30,64,175,0.35)]">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-secondary/60">
          {title}
        </p>
        <p className="mt-3 text-3xl font-semibold text-primary">{value}</p>
      </div>
      <div className={`rounded-2xl border px-3 py-3 ${accent}`}>
        <Icon size={22} />
      </div>
    </div>
    <p className="mt-4 text-xs text-secondary/80">{description}</p>
  </div>
);

const Header = ({ title, subtitle }) => (
  <div>
    <h2 className="text-lg font-semibold text-primary">{title}</h2>
    <p className="text-xs uppercase tracking-[0.32em] text-secondary/60">
      {subtitle}
    </p>
  </div>
);

const ChartContainer = ({ children }) => (
  <div className="h-64 rounded-3xl border border-slate-800/70 bg-slate-900/40 p-3">
    {children}
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-800/60 bg-slate-900/50 p-6 text-xs text-secondary/70">
    {message}
  </div>
);

const getLoadColor = (level) => {
  switch (level) {
    case 'Carga alta':
      return 'bg-rose-400 shadow-[0_0_0_4px_rgba(248,113,113,0.12)]';
    case 'Carga media':
      return 'bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.12)]';
    default:
      return 'bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]';
  }
};

const buildDashboardData = (projects) => {
  const now = new Date();
  const totals = { active: 0, recording: 0, editing: 0, delivered: 0 };
  let completedThisMonth = 0;
  const statusCount = new Map();
  const activeStatusCount = new Map();
  const clientCount = new Map();
  const editingDurationsByType = new Map();
  const recordingByWeek = new Map();
  const managerLoad = new Map();
  let totalDeliveryDays = 0;
  let deliverySamples = 0;
  let projectsUnder48h = 0;
  let totalProjectsCompleted = 0;
  let lateEvents = 0;
  const upcomingEvents = [];

  projects.forEach((project) => {
    const {
      id,
      statusLabel,
      isCompleted,
      stage,
      clientLabel,
      typeLabel,
      managers,
      recordingDate,
      deadlineDate,
      startDate,
      completionDate,
      referenceCompletionDate,
      displayName,
    } = extractProjectInfo(project);

    statusCount.set(statusLabel, (statusCount.get(statusLabel) || 0) + 1);

    if (!isCompleted && statusLabel !== 'Cancelado') {
      totals.active += 1;
      activeStatusCount.set(statusLabel, (activeStatusCount.get(statusLabel) || 0) + 1);
    }

    if (stage === 'grabacion') totals.recording += 1;
    if (stage === 'edicion') totals.editing += 1;
    if (isCompleted) totals.delivered += 1;

    if (referenceCompletionDate && isSameMonth(referenceCompletionDate, now) && isCompleted) {
      completedThisMonth += 1;
    }

    clientCount.set(clientLabel, (clientCount.get(clientLabel) || 0) + 1);

    if (isCompleted && startDate && completionDate) {
      const days = Math.max(differenceInCalendarDays(completionDate, startDate), 0);
      totalDeliveryDays += days;
      deliverySamples += 1;

      const bucket = editingDurationsByType.get(typeLabel) || { total: 0, count: 0 };
      bucket.total += days;
      bucket.count += 1;
      editingDurationsByType.set(typeLabel, bucket);

      totalProjectsCompleted += 1;
      if (days <= 2) projectsUnder48h += 1;
    }

    if (recordingDate) {
      const weekStart = startOfWeek(recordingDate, { weekStartsOn: 1 });
      const key = weekStart.getTime();
      const current = recordingByWeek.get(key) || 0;
      recordingByWeek.set(key, current + 1);
    }

    if (!isCompleted) {
      const assignedManagers = managers.length > 0 ? managers : ['Sin asignar'];
      assignedManagers.forEach((manager) => {
        managerLoad.set(manager, (managerLoad.get(manager) || 0) + 1);
      });
    }

    if (typeLabel.toLowerCase().includes('evento') && deadlineDate && deadlineDate < now && !isCompleted) {
      lateEvents += 1;
    }

    if (recordingDate && isAfter(recordingDate, now)) {
      upcomingEvents.push({
        id,
        date: recordingDate,
        label: 'Grabación',
        project: displayName,
        description: 'Coordinación de equipo y logística',
      });
    }

    if (deadlineDate && isAfter(deadlineDate, now)) {
      upcomingEvents.push({
        id,
        date: deadlineDate,
        label: 'Entrega',
        project: displayName,
        description: 'Fecha comprometida con el cliente',
      });
    }
  });

  const avgDeliveryDays =
    deliverySamples > 0 ? Number((totalDeliveryDays / deliverySamples).toFixed(1)) : null;

  const statusData = Array.from(statusCount.entries())
    .map(([status, total]) => ({ status, total }))
    .sort((a, b) => b.total - a.total);

  const activeStatusData = Array.from(activeStatusCount.entries())
    .map(([status, total]) => ({ status, total }))
    .sort((a, b) => b.total - a.total);

  const clientsData = Array.from(clientCount.entries())
    .map(([client, total]) => ({ client, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const editingAverageByType = Array.from(editingDurationsByType.entries())
    .map(([type, { total, count }]) => ({
      type,
      avgDays: Number((total / count).toFixed(1)),
    }))
    .sort((a, b) => b.avgDays - a.avgDays);

  const recordingsByWeek = Array.from(recordingByWeek.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(-8)
    .map(([timestamp, total]) => ({
      week: format(new Date(Number(timestamp)), "d MMM", { locale: es }),
      total,
    }));

  const managerLoadData = Array.from(managerLoad.entries())
    .map(([manager, total]) => ({
      manager,
      total,
      level: total >= 5 ? 'Carga alta' : total >= 3 ? 'Carga media' : 'Carga controlada',
    }))
    .sort((a, b) => b.total - a.total);

  const upcoming = upcomingEvents
    .filter((event) => differenceInCalendarDays(event.date, now) <= 30)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 8);

  return {
    totals,
    completedThisMonth,
    avgDeliveryDays,
    statusData,
    activeStatusData,
    clientsData,
    recordingsByWeek,
    editingAverageByType,
    projectsUnder48h,
    totalProjectsCompleted,
    lateEvents,
    upcomingEvents: upcoming,
    managerLoad: managerLoadData,
  };
};

const extractProjectInfo = (project) => {
  const id = project.id || project.uuid || project._id || project.slug || String(Math.random());
  const statusLabel = buildLabel(project.status, 'Pendiente');
  const isCompleted = statusLabel.toLowerCase() === 'completado';
  const rawStage =
    project.stage ||
    project.properties?.stage ||
    (project.fechaGrabacion || project.properties?.fechaGrabacion ? 'grabacion' : '');
  const stage = buildLabel(rawStage, '').toLowerCase();
  const clientLabel = buildLabel(project.client || project.cliente, 'Sin cliente');
  const typeLabel = buildLabel(
    project.type || project.registrationType || project.properties?.registrationType,
    'Sin tipo'
  );
  const recordingDate = parseProjectDate(
    project.fechaGrabacion ||
      project.fecha_grabacion ||
      project.fechaGrabación ||
      project.recordingDate ||
      project.recording_date ||
      project.properties?.fechaGrabacion
  );
  const deadlineDate = parseProjectDate(
    project.deadline || project.endDate || project.end_date || project.fecha_entrega || project.properties?.deadline
  );
  const startDate = parseProjectDate(
    project.startDate ||
      project.start_date ||
      project.fecha_inicio ||
      project.properties?.startDate ||
      project.properties?.fecha_inicio
  );
  const completionDate = parseProjectDate(
    project.completedAt ||
      project.completed_at ||
      project.fechaEntrega ||
      project.fecha_entrega ||
      project.properties?.completedAt ||
      project.properties?.completed_at ||
      project.properties?.fechaEntrega ||
      project.properties?.fecha_entrega
  );
  const referenceCompletionDate = completionDate || deadlineDate || startDate;
  const managers = getProjectManagers(project);
  const displayName =
    buildLabel(project.name || project.projectName || project.titulo || project.title, '').length > 0
      ? buildLabel(project.name || project.projectName || project.titulo || project.title, '')
      : `Proyecto sin título (${clientLabel})`;

  return {
    id,
    statusLabel,
    isCompleted,
    stage,
    clientLabel,
    typeLabel,
    managers,
    recordingDate,
    deadlineDate,
    startDate,
    completionDate,
    referenceCompletionDate,
    displayName,
  };
};

const buildLabel = (value, fallback) => {
  if (!value && value !== 0) return fallback;
  const text = value.toString().trim();
  if (text.length === 0) return fallback;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const parseProjectDate = (value) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const text = value.toString().trim();
  if (text.length === 0) return null;

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text;
  const parsedISO = parseISO(normalized);
  if (isValid(parsedISO)) return parsedISO;

  const timestamp = Date.parse(text);
  if (!Number.isNaN(timestamp)) return new Date(timestamp);

  return null;
};

const getProjectManagers = (project) => {
  if (Array.isArray(project.managers)) {
    return project.managers
      .map((manager) => manager && manager.toString().trim())
      .filter(Boolean);
  }

  if (!project.manager && !project.encargado && !project.properties?.managers) {
    return [];
  }

  const rawManagers =
    project.manager || project.encargado || project.properties?.managers || '';

  if (Array.isArray(rawManagers)) {
    return rawManagers
      .map((manager) => manager && manager.toString().trim())
      .filter(Boolean);
  }

  return rawManagers
    .toString()
    .split(',')
    .map((manager) => manager.trim())
    .filter(Boolean);
};
