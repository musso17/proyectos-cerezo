"use client";

import React, { useEffect, useMemo, useState } from 'react';
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
  Activity, Briefcase,
  Video,
  PenSquare,
  CheckCircle2,
  CalendarDays,
  Clock,
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
import { normalizeString } from '../../utils/normalize';
import useStore from '../../hooks/useStore';
import { useShallow } from 'zustand/react/shallow';
import MetricCard from '../shared/MetricCard';
import VistaFinanzasCEO from './VistaFinanzasCEO';

// By defining the selector outside the component, we ensure it's a stable function reference.
// This prevents the useStore hook from re-subscribing on every render.
const selectDashboardState = (state) => ({
  projects: state.projects,
  revisionCycles: state.revisionCycles,
  currentUser: state.currentUser,
});

const VistaDashboard = () => {
  // useShallow performs a shallow equality check on the selected state object.
  // This prevents re-renders if the object's properties haven't changed,
  // which is crucial for breaking the render loop.
  const { projects, revisionCycles, currentUser } = useStore(useShallow(selectDashboardState));

  const isCeoUser = (user) => user?.email?.toString().trim().toLowerCase() === 'hola@cerezoperu.com';
  const canViewFinances = isCeoUser(currentUser);
  const [activeView, setActiveView] = useState('resumen');

  useEffect(() => {
    if (!canViewFinances && activeView === 'finanzas') {
      setActiveView('resumen');
    }
  }, [canViewFinances, activeView]);

  const {
    totals,
    avgDeliveryDays,
    statusData,
    activeStatusData,
    clientsData,
    recordingsByWeek,
    editingAverageByType,
    projectsUnder48h,
    totalProjectsCompleted,
    lateEvents,
    managerLoad,
    revisionMetrics = {
      totalCycles: 0,
      averageReviewDays: null,
      pendingReviews: 0,
      avgCyclesPerProject: 0,
    },
  } = useMemo(() => buildDashboardData(projects || [], revisionCycles || {}), [projects, revisionCycles]);

  const { carbonoProjectsThisMonth, variableProjectsCount } = useMemo(() => {
    const now = new Date();
    const carbonoProjects = (projects || []).filter(p => 
      (p.client?.toLowerCase() === 'carbono' || p.cliente?.toLowerCase() === 'carbono' || p.properties?.tag === 'carbono') &&
      p.startDate && isSameMonth(parseISO(p.startDate), now)
    );

    const variableProjects = (projects || []).filter(p => 
      !(p.client?.toLowerCase() === 'carbono' || p.cliente?.toLowerCase() === 'carbono' || p.properties?.tag === 'carbono')
    );
    return {
      carbonoProjectsThisMonth: carbonoProjects.length,
      variableProjectsCount: variableProjects.length,
    };
  }, [projects]);

  return (
    <div className="space-y-8 px-3 py-4 sm:px-4 md:px-6 md:py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Panel ejecutivo</h1>
          <p className="text-sm text-secondary/80">
            Monitorea el desempeño operativo y financiero del estudio.
          </p>
        </div>
        {canViewFinances ? (
          <div className="flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveView('resumen')}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                activeView === 'resumen'
                  ? 'bg-accent/10 text-accent shadow-none'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Resumen
            </button>
            <button
              type="button"
              onClick={() => setActiveView('finanzas')}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                activeView === 'finanzas'
                  ? 'bg-accent/10 text-accent shadow-none'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Finanzas
            </button>
          </div>
        ) : null}
      </div>

      {activeView === 'finanzas' && canViewFinances ? (
        <div className="glass-panel overflow-hidden p-0">
          <VistaFinanzasCEO />
        </div>
      ) : (
      <>
      {carbonoProjectsThisMonth > 6 && (
        <div className="bg-red-500/15 border border-red-400/30 text-red-300 p-4 rounded-lg flex items-center gap-3">
          <AlertTriangle />
          <span>
            <strong>Alerta:</strong> Se han agendado más de 6 proyectos de Carbono para este mes.
          </span>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Proyectos activos"
          value={totals.active}
          description="Incluye pendientes y en progreso"
          icon={Activity}
          accent="border-transparent bg-[#E7F3FF] text-[#2563EB] dark:border-[#2B2D31] dark:bg-[#212226] dark:text-blue-300"
        />
        <MetricCard
          title="En grabación"
          value={totals.recording}
          description="Proyectos con fecha de grabación vigente"
          icon={Video}
          accent="border-transparent bg-[#E7F1FF] text-[#4C8EF7] dark:border-[#2B2D31] dark:bg-[#212226] dark:text-blue-300"
        />
        <MetricCard
          title="En edición"
          value={totals.editing}
          description="Proyectos en etapa de post-producción"
          icon={PenSquare}
          accent="border-transparent bg-[#EEF1FF] text-accent dark:border-[#2B2D31] dark:bg-[#212226] dark:text-purple-300"
        />
        <MetricCard
          title="Entregados"
          value={totals.delivered}
          description="Proyectos marcados como completados"
          icon={CheckCircle2}
          accent="border-transparent bg-[#E6F5EC] text-[#2F9E44] dark:border-[#2B2D31] dark:bg-[#212226] dark:text-emerald-300"
        />
      </section>


      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Proyectos Carbono (Mes)"
          value={`${carbonoProjectsThisMonth} / 6`}
          description="Proyectos mensuales con Carbono"
          icon={Briefcase}
          accent="border-transparent bg-[#EEF1FF] text-accent dark:border-[#2B2D31] dark:bg-[#212226] dark:text-purple-300"
        />
        <MetricCard
          title="Proyectos en Revisión (Cliente)"
          value={
            revisionMetrics.totalCycles > 0
              ? `${revisionMetrics.pendingReviews} / ${revisionMetrics.totalCycles}`
              : revisionMetrics.pendingReviews
          }
          icon={GaugeCircle}
          accent="border-transparent bg-[#E7F3FF] text-[#2563EB] dark:border-[#2B2D31] dark:bg-[#212226] dark:text-amber-300"
        />
        <MetricCard
          title="Eficiencia de Revisión"
          value={revisionMetrics.avgCyclesPerProject || 0}
          icon={CalendarDays}
          accent="border-transparent bg-[#EEF1FF] text-accent dark:border-[#2B2D31] dark:bg-[#212226] dark:text-purple-300"
        />
        <MetricCard
          title="Tiempo medio de feedback"
          value={
            revisionMetrics.averageReviewDays !== null
              ? `${revisionMetrics.averageReviewDays} días`
              : 'Sin datos'
          }
          description="Días entre envío y devolución del cliente"
          icon={Clock}
          accent="border-transparent bg-[#FFF4E6] text-[#FFB020] dark:border-[#2B2D31] dark:bg-[#212226] dark:text-amber-300"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="glass-panel col-span-1 flex flex-col gap-4 p-6 transition-all xl:col-span-1">
          <Header title="Proyectos por cliente" subtitle="Clientes con proyectos registrados" />
          <ChartContainer>
            {clientsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="client" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid rgba(209,213,219,0.7)',
                      boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
                      color: '#2E2E2E',
                    }}
                    formatter={(value) => [`${value} proyectos`, 'Total']}
                  />
                  <Bar dataKey="total" fill="#6C63FF" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Sin clientes registrados" />
            )}
          </ChartContainer>
        </div>

        <div className="glass-panel col-span-1 flex flex-col gap-4 p-6 transition-all xl:col-span-2">
          <Header title="Grabaciones por semana" subtitle="Cantidad de grabaciones únicas" />
          <ChartContainer>
            {recordingsByWeek.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={recordingsByWeek}>
                  <defs>
                    <linearGradient id="colorRecording" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4C8EF7" stopOpacity={0.85} />
                      <stop offset="95%" stopColor="#4C8EF7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="week" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid rgba(209,213,219,0.7)',
                      boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
                      color: '#2E2E2E',
                    }}
                    formatter={(value) => [`${value} grabaciones`, 'Total']}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#4C8EF7"
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

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="glass-panel col-span-1 flex flex-col gap-4 p-6 transition-all">
          <Header title="Promedio de días de edición por tipo" subtitle="Cálculo entre la fecha de inicio y de finalización" />
          <ChartContainer>
            {editingAverageByType.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={editingAverageByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="type" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid rgba(209,213,219,0.7)',
                      boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
                      color: '#2E2E2E',
                    }}
                    formatter={(value) => [`${value} días`, 'Promedio']}
                  />
                  <Bar dataKey="avgDays" fill="#6C63FF" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="Sin registros con fechas de entrega" />
            )}
          </ChartContainer>
        </div>
        <div className="glass-panel col-span-1 flex flex-col gap-4 p-6 transition-all">
          <Header title="Semáforo de carga por persona" subtitle="Proyectos activos asignados" />
          {managerLoad.length > 0 ? (
            <ul className="space-y-3">
              {managerLoad.map(({ manager, total, level }) => (
                <li
                  key={manager}
                  className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 dark:border-white/10 dark:bg-white/5 dark:backdrop-blur"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${getLoadColor(level)}`} />
                    <p className="text-sm font-medium text-primary">{manager}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-secondary dark:text-white/70">{total} activos</p>
                    <p className="text-xs text-secondary/70 dark:text-white/60">{level}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState message="No hay encargados asignados" />
          )}
          <div className="flex items-center gap-2 rounded-xl border border-[#FFE4C4] bg-[#FFF4E6] px-3 py-2 text-xs text-[#C07A00] dark:border-[#FCD34D]/30 dark:bg-[#422006] dark:text-[#FCD34D]">
            <AlertTriangle size={14} className="text-[#FFB020] dark:text-[#FCD34D]" />
            <span>Verifica la carga semanal para redistribuir si es necesario.</span>
          </div>
        </div>
        <div className="glass-panel col-span-1 flex flex-col gap-4 p-6 transition-all">
          <Header title="Proyectos activos por estado" subtitle="Incluye únicamente proyectos no entregados" />
          <ChartContainer>
            {activeStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="status" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid rgba(209,213,219,0.7)',
                      boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
                      color: '#2E2E2E',
                    }}
                    formatter={(value) => [`${value} proyectos`, 'Total']}
                  />
                  <Bar dataKey="total" fill="#4CAF50" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No hay datos para mostrar" />
            )}
          </ChartContainer>
        </div>
      </section>

      </>
      )}
    </div>
  );
};

export default VistaDashboard;

const Header = ({ title, subtitle }) => (
  <div>
    <h2 className="text-lg font-semibold text-primary">{title}</h2>
    <p className="text-xs uppercase tracking-[0.32em] text-secondary/60">
      {subtitle}
    </p>
  </div>
);

const ChartContainer = ({ children }) => (
  <div className="h-64 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-[inset_0_1px_0_rgba(229,231,235,0.6)] dark:border-[#2B2D31] dark:bg-[#1B1C20] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
    {children}
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[#CBD5F5] bg-[#F9FAFF] p-6 text-xs text-secondary dark:border-[#2B2D31] dark:bg-[#1B1C20] dark:text-white/50">
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

const buildDashboardData = (projects, revisionCycles = {}) => {
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
  let totalCycleCount = 0;
  let reviewSamples = 0;
  let reviewDaysAccumulator = 0;
  let pendingReviewCount = 0;
  let projectsWithCycles = 0;

  const editingStatusKeys = new Set([
    'enprogreso',
    'enrevision',
    'revision',
    'corrigiendo',
    'esperandofeedback',
    'editando',
  ]);

  projects.forEach((project) => {
    const {
      id,
      statusLabel,
      statusKey,
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

    if (!isCompleted && stage === 'grabacion') totals.recording += 1;
    if (
      !isCompleted &&
      (stage === 'edicion' || stage === 'postproduccion') &&
      editingStatusKeys.has(statusKey)
    ) {
      totals.editing += 1;
    }
    if (isCompleted) totals.delivered += 1;

    if (referenceCompletionDate && isSameMonth(referenceCompletionDate, now) && isCompleted) {
      completedThisMonth += 1;
    }

  // Use normalized key to avoid duplicates due to case/accents (e.g., Fuso vs FUSO)
    const clientKey = normalizeString(clientLabel || 'Sin cliente');
    const existing = clientCount.get(clientKey) || { total: 0 };
    existing.total += 1;
    // Use the capitalized version of the key as the consistent label.
    existing.label = clientKey.charAt(0).toUpperCase() + clientKey.slice(1);
    clientCount.set(clientKey, existing);

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

    // Manager load should only consider projects that are actively being worked on
    // We include only projects whose status is 'En progreso' or 'En revisión' (normalized labels)
    const considerForLoad = ['En progreso', 'En revisión'];
    if (considerForLoad.includes(statusLabel)) {
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

    const projectCycles = Array.isArray(revisionCycles?.[id]) ? revisionCycles[id] : [];
    if (projectCycles.length > 0) {
      projectsWithCycles += 1;
      totalCycleCount += projectCycles.length;

      const orderedCycles = [...projectCycles].sort((a, b) => {
        const numberA = Number(a.number) || 0;
        const numberB = Number(b.number) || 0;
        if (numberA !== numberB) return numberA - numberB;
        const createdA = new Date(a.started_at || a.created_at || 0).getTime();
        const createdB = new Date(b.started_at || b.created_at || 0).getTime();
        return createdA - createdB;
      });

      const currentCycle = orderedCycles[orderedCycles.length - 1];
      if (currentCycle && ['enviado', 'esperando_feedback'].includes(currentCycle.status)) {
        pendingReviewCount += 1;
      }

      orderedCycles.forEach((cycle) => {
        if (cycle.sent_at && cycle.client_returned_at) {
          const start = parseISO(cycle.sent_at);
          const end = parseISO(cycle.client_returned_at);
          if (isValid(start) && isValid(end) && !isAfter(start, end)) {
            reviewDaysAccumulator += Math.max(differenceInCalendarDays(end, start), 0);
            reviewSamples += 1;
          }
        }
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
    .map(([key, { label, total }]) => ({ client: label || 'Sin cliente', total }))
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

  const averageReviewDays = reviewSamples > 0 ? Number((reviewDaysAccumulator / reviewSamples).toFixed(1)) : null;
  const avgCyclesPerProject = projectsWithCycles > 0 ? Number((totalCycleCount / projectsWithCycles).toFixed(1)) : 0;

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
    revisionMetrics: {
      totalCycles: totalCycleCount,
      averageReviewDays,
      pendingReviews: pendingReviewCount,
      avgCyclesPerProject,
    },
  };
};

const extractProjectInfo = (project) => {
  const id = project.id || project.uuid || project._id || project.slug || String(Math.random());
  const statusLabel = buildLabel(project.status, 'Programado');
  const statusKey = normalizeString(project.status || statusLabel || '').replace(/\s+/g, '');
  const isCompleted = statusLabel.toLowerCase() === 'completado';
  const rawStageValue =
    project.stage ||
    project.properties?.stage ||
    (project.fechaGrabacion || project.properties?.fechaGrabacion ? 'grabacion' : '');
  const stage = normalizeString(rawStageValue || '').replace(/\s+/g, '');
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
    statusKey,
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
