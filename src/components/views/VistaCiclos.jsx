"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  Clock4,
  Loader2,
  MessageCircle,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from 'lucide-react';
import { format, formatDistanceStrict, formatDistanceToNowStrict, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import useStore from '../../hooks/useStore';
import { getUIPreference, setUIPreference } from '../../utils/uiPreferences';

const getStoredCycleProjectId = () => {
  const stored = getUIPreference('ciclosSelectedProjectId', null);
  if (typeof stored !== 'string') return null;
  const trimmed = stored.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const getProjectManagers = (project) => {
  if (!project) return [];
  if (Array.isArray(project.managers)) {
    return project.managers
      .map((manager) => (manager ? manager.toString().trim() : ''))
      .filter(Boolean);
  }
  if (project.manager) {
    return project.manager
      .toString()
      .split(',')
      .map((manager) => manager.trim())
      .filter(Boolean);
  }
  if (Array.isArray(project.properties?.managers)) {
    return project.properties.managers
      .map((manager) => (manager ? manager.toString().trim() : ''))
      .filter(Boolean);
  }
  return [];
};

const isProjectAssignedToManager = (project, managerName) => {
  if (!managerName) return true;
  const normalizedManager = managerName.toString().trim().toLowerCase();
  if (!normalizedManager) return true;
  const managers = getProjectManagers(project);
  if (!managers.length) return false;
  return managers.some((manager) => {
    const normalizedValue = manager.toString().trim().toLowerCase();
    if (!normalizedValue) return false;
    return (
      normalizedValue === normalizedManager || normalizedValue.includes(normalizedManager)
    );
  });
};

const getRestrictedManagerForUser = (user) => {
  if (!user) return null;
  const candidates = [];
  if (user.email) {
    candidates.push(user.email);
  }
  const userMetadata = user.user_metadata || user.userMetadata || {};
  const appMetadata = user.app_metadata || user.appMetadata || {};
  [
    userMetadata.name,
    userMetadata.full_name,
    userMetadata.fullName,
    userMetadata.display_name,
    userMetadata.displayName,
    userMetadata.teamMember,
    userMetadata.team_member,
    appMetadata.name,
    appMetadata.full_name,
    appMetadata.fullName,
    appMetadata.display_name,
    appMetadata.displayName,
  ].forEach((value) => {
    if (value) candidates.push(value);
  });

  for (const candidate of candidates) {
    const normalized = candidate ? candidate.toString().trim().toLowerCase() : '';
    if (!normalized) continue;
    if (normalized.includes('mauricio')) return 'Mauricio';
    if (normalized.includes('edson')) return 'Edson';
  }
  return null;
};

const COLUMN_CONFIG = [
  {
    id: 'editando',
    label: '1. Editando',
    description: 'Equipo ajustando versión interna.',
  },
  {
    id: 'enviado',
    label: '2. Primera versión',
    description: 'Primera versión enviada al cliente.',
  },
  {
    id: 'esperando_feedback',
    label: 'Esperando Feedback',
    description: 'Cliente revisando y preparando comentarios.',
  },
  {
    id: 'corrigiendo',
    label: '4. Corrigiendo',
    description: 'Aplicando feedback recibido.',
  },
];

const STATUS_BADGES = {
  editando: 'border border-[#D9D6FF] bg-[#EEF1FF] text-[#6C63FF]',
  enviado: 'border border-[#C7DAFF] bg-[#E7F1FF] text-[#4C8EF7]',
  esperando_feedback: 'border border-[#FFE0B0] bg-[#FFF4E6] text-[#C07A00]',
  corrigiendo: 'border border-[#D9D6FF] bg-[#EEF1FF] text-[#6C63FF]',
  aprobado: 'border border-[#C8E6C9] bg-[#F1FAF3] text-[#2F9E44]',
};

const REVISION_STEP_LABELS = {
  editando: 'Editando',
  enviado: 'Primera versión',
  esperando_feedback: 'Esperando feedback',
  corrigiendo: 'Corrigiendo',
  aprobado: 'Aprobado',
};

const getStatusDisplayLabel = (status) =>
  REVISION_STEP_LABELS[status] || status?.replace?.('_', ' ') || status;

const formatTimestamp = (value) => {
  if (!value) return '—';
  const iso = value.length <= 10 ? `${value}T00:00:00Z` : value;
  const parsed = parseISO(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return format(parsed, "dd MMM yyyy · HH:mm'h'", { locale: es });
};

const formatRelative = (value) => {
  if (!value) return '';
  const iso = value.length <= 10 ? `${value}T00:00:00Z` : value;
  try {
    const parsed = parseISO(iso);
    if (Number.isNaN(parsed.getTime())) return '';
    return formatDistanceToNowStrict(parsed, { locale: es, addSuffix: true });
  } catch (error) {
    return '';
  }
};

const CycleActionButtons = ({ status, onMove, onApprove, disabled }) => {
  const buttons = [];

  const renderButton = (label, step, Icon, variant = 'primary') => {
    const baseClasses =
      'flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60';
    const stylesByVariant = {
      primary:
        'bg-accent text-white shadow-sm hover:shadow-md dark:bg-accent dark:text-white dark:hover:bg-accent/80',
      neutral:
        'border border-[#D1D5DB] bg-white text-secondary hover:bg-[#F3F4F6] dark:border-[#2B2D31] dark:bg-[#1E1F23] dark:text-white/70 dark:hover:bg-white/10',
      accent:
        'bg-[#4C8EF7] text-white shadow-sm hover:shadow-md dark:bg-blue-500 dark:hover:bg-blue-400',
      approve:
        'bg-[#4CAF50] text-white font-semibold shadow-sm hover:shadow-md dark:bg-emerald-500 dark:hover:bg-emerald-400',
      revert:
        'border border-[#D1D5DB] bg-white text-secondary hover:bg-[#F3F4F6] dark:border-[#2B2D31] dark:bg-[#1E1F23] dark:text-white/70 dark:hover:bg-white/10',
    };

    return (
      <button
        type="button"
        key={`${status}-${step}`}
        onClick={() => onMove(step)}
        disabled={disabled}
        className={clsx(baseClasses, stylesByVariant[variant] || stylesByVariant.primary)}
      >
        {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        {label}
      </button>
    );
  };

  switch (status) {
    case 'editando':
      buttons.push(renderButton('Enviar versión al cliente', 'enviado', Send));
      break;
    case 'enviado':
      buttons.push(renderButton('Registrar correcciones', 'corrigiendo', MessageCircle, 'accent'));
      buttons.push(
        <button
          type="button"
          key={`${status}-approve`}
          onClick={onApprove}
          disabled={disabled}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#4CAF50] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Marcar como completado
        </button>
      );
      break;
    case 'esperando_feedback':
      buttons.push(renderButton('Registrar feedback recibido', 'corrigiendo', MessageCircle, 'accent'));
      break;
    case 'corrigiendo':
      buttons.push(renderButton('Mover a “Esperando feedback”', 'esperando_feedback', TimerReset, 'neutral'));
      buttons.push(
        <button
          type="button"
          key="approve"
          onClick={onApprove}
          disabled={disabled}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#4CAF50] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
          {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Marcar ciclo como aprobado
        </button>
      );
      break;
    default:
      break;
  }

  return buttons.length > 0 ? <div className="flex flex-col gap-2">{buttons}</div> : null;
};

const isEligibleProject = (project) => {
  if (!project) return false;
  const status = (project.status || '').toString().trim().toLowerCase();
  const stage = (project.stage || project.properties?.stage || '').toString().trim().toLowerCase();
  if (status === 'programado' || status === 'completado') {
    return false;
  }
  const allowedStatuses = new Set(['en progreso', 'en revisión', 'en revision', 'grabación', 'grabacion']);
  return allowedStatuses.has(status) || stage === 'edicion' || stage === 'grabacion';
};

const VistaCiclos = () => {
  const projects = useStore((state) => state.projects);
  const currentUser = useStore((state) => state.currentUser);
  const revisionCycles = useStore((state) => state.revisionCycles);
  const revisionHistoryMap = useStore((state) => state.revisionHistory);
  const fetchRevisionHistory = useStore((state) => state.fetchRevisionHistory);
  const revisionLoading = useStore((state) => state.revisionCyclesLoading);
  const revisionError = useStore((state) => state.revisionCyclesError);
  const fetchRevisionCycles = useStore((state) => state.fetchRevisionCycles);
  const createRevisionCycle = useStore((state) => state.createRevisionCycle);
  const moveRevisionCycleToStep = useStore((state) => state.moveRevisionCycleToStep);
  const markCycleApproved = useStore((state) => state.markCycleApproved);
  const resetRevisionCycle = useStore((state) => state.resetRevisionCycle);
  const restrictedManager = useMemo(
    () => getRestrictedManagerForUser(currentUser),
    [currentUser]
  );
  const activeProjects = useMemo(() => {
    const eligible = (projects || []).filter(isEligibleProject);
    if (!restrictedManager) return eligible;
    return eligible.filter((project) => isProjectAssignedToManager(project, restrictedManager));
  }, [projects, restrictedManager]);

  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    const stored = getStoredCycleProjectId();
    const eligible = (projects || []).filter(isEligibleProject);
    const accessible = restrictedManager
      ? eligible.filter((project) => isProjectAssignedToManager(project, restrictedManager))
      : eligible;
    if (stored && accessible.some((project) => project.id === stored)) {
      return stored;
    }
    return accessible[0]?.id || null;
  });
  const [pendingAction, setPendingAction] = useState(false);
  const initialCycleRequestedRef = useRef({});

  useEffect(() => {
    setUIPreference('ciclosSelectedProjectId', selectedProjectId || null);
  }, [selectedProjectId]);

  const selectedProject = useMemo(
    () => activeProjects.find((project) => project.id === selectedProjectId) || null,
    [activeProjects, selectedProjectId]
  );

  const revisionHistory = useMemo(() => {
    if (!selectedProjectId) return [];
    return revisionHistoryMap?.[selectedProjectId] || [];
  }, [revisionHistoryMap, selectedProjectId]);
  const projectCycles = useMemo(
    () => (selectedProjectId ? revisionCycles?.[selectedProjectId] || [] : []),
    [revisionCycles, selectedProjectId]
  );

  const currentCycleNumber = selectedProject?.current_cycle || selectedProject?.currentCycle || 1;
  const currentCycle = useMemo(
    () =>
      projectCycles.find((cycle) => Number(cycle.number) === Number(currentCycleNumber)) ||
      projectCycles[projectCycles.length - 1] ||
      null,
    [projectCycles, currentCycleNumber]
  );

  const approvedCycles = useMemo(
    () => projectCycles.filter((cycle) => cycle.approved || cycle.status === 'aprobado'),
    [projectCycles]
  );

  const isLoading = Boolean(selectedProjectId && revisionLoading?.[selectedProjectId]);

  useEffect(() => {
    if (!activeProjects.length) {
      setSelectedProjectId(null);
      return;
    }
    if (!selectedProjectId || !activeProjects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(activeProjects[0].id);
    }
  }, [activeProjects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    fetchRevisionCycles(selectedProjectId);
    fetchRevisionHistory(selectedProjectId);
  }, [selectedProjectId, fetchRevisionCycles, fetchRevisionHistory]);

  useEffect(() => {
    if (!selectedProjectId || !selectedProject) return;
    const cycles = revisionCycles?.[selectedProjectId];
    if (!Array.isArray(cycles) || cycles.length > 0) return;
    if (initialCycleRequestedRef.current[selectedProjectId]) return;

    initialCycleRequestedRef.current[selectedProjectId] = true;
    createRevisionCycle(selectedProjectId, {
      number: currentCycleNumber,
      status: 'editando',
    }).catch((error) => {
      console.error('Error creating initial revision cycle:', error);
    });
  }, [selectedProjectId, revisionCycles, createRevisionCycle, selectedProject, currentCycleNumber]);

  const handleProjectChange = (event) => {
    const nextProjectId = event.target.value || null;
    setSelectedProjectId(nextProjectId);
  };

  const handleApprove = async () => {
    if (!selectedProjectId || !currentCycle) return;
    const finalize = window.confirm(
      '¿El cliente aprobó la versión final? Acepta para marcar el proyecto como entregado. Cancela para abrir un nuevo ciclo de correcciones.'
    );
    setPendingAction(true);
    try {
      await markCycleApproved(selectedProjectId, currentCycle.id, { finalize });
      initialCycleRequestedRef.current[selectedProjectId] = false;
    } catch (error) {
      console.error('Error approving revision cycle:', error);
    } finally {
      setPendingAction(false);
    }
  };

  const handleMoveToStep = async (step) => {
    if (!selectedProjectId || !currentCycle) return;
    setPendingAction(true);
    try {
      await moveRevisionCycleToStep(selectedProjectId, currentCycle.id, step);
    } catch (error) {
      console.error('Error updating revision cycle state:', error);
    } finally {
      setPendingAction(false);
    }
  };

  const handleResetCycle = async () => {
    if (!selectedProjectId) return;
    setPendingAction(true);
    try {
      await resetRevisionCycle(selectedProjectId);
    } catch (error) {
      console.error('Error resetting revision cycle:', error);
    } finally {
      setPendingAction(false);
    }
  };

  const boardColumns = useMemo(() => {
    const activeStatus =
      currentCycle && currentCycle.status === 'aprobado' ? 'corrigiendo' : currentCycle?.status;
    return COLUMN_CONFIG.map((column) => ({
      ...column,
      items: currentCycle && activeStatus === column.id ? [currentCycle] : [],
    }));
  }, [currentCycle]);

  const totalCycles = projectCycles.length || (selectedProject ? selectedProject.current_cycle || selectedProject.currentCycle || 1 : 0);

  const lastSentAt = currentCycle?.sent_at || currentCycle?.sentAt || null;
  const lastFeedbackAt = currentCycle?.client_returned_at || currentCycle?.clientReturnedAt || null;

  const historyEntries = useMemo(() => {
    if (!revisionHistory || revisionHistory.length === 0) return [];
    const cyclesById = new Map((projectCycles || []).map((cycle) => [cycle.id, cycle]));
    return [...revisionHistory]
      .map((event) => {
        const cycle = cyclesById.get(event.cycle_id) || cyclesById.get(event.cycleId) || null;
        const number = cycle ? cycle.number : null;
        const fromLabel = event.from_status ? (REVISION_STEP_LABELS[event.from_status] || event.from_status.replace('_', ' ')) : '—';
        const toLabel = event.to_status ? (REVISION_STEP_LABELS[event.to_status] || event.to_status.replace('_', ' ')) : '—';
        return {
          id: event.id || `${event.cycle_id}-${event.occurred_at}`,
          cycleNumber: number,
          fromStatus: fromLabel,
          toStatus: toLabel,
          occurredAt: event.occurred_at || event.occurredAt || null,
          notes: event.notes || '',
        };
      })
      .sort((a, b) => new Date(b.occurredAt || 0) - new Date(a.occurredAt || 0));
  }, [revisionHistory, projectCycles]);
  const emptyState = !currentCycle && !isLoading;

  return (
    <div className="space-y-8 px-3 py-6 sm:px-6 lg:px-8">
      <section className="glass-panel space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-secondary/70">Postproducción</p>
            <h2 className="mt-2 text-2xl font-semibold text-primary">Ciclos de revisión</h2>
            <p className="text-sm text-secondary">
              Sigue cada iteración con el cliente y ajusta fechas automáticamente.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm md:flex-row md:items-center md:gap-3">
            <div className="inline-flex items-center gap-3 rounded-full border border-[#E5E7EB] bg-white px-4 py-1.5 shadow-sm dark:border-[#2B2D31] dark:bg-[#1E1F23]">
              <span className="text-xs uppercase tracking-[0.22em] text-secondary/70">Proyecto</span>
              <select
                id="project-selector"
                value={selectedProjectId || ''}
                onChange={handleProjectChange}
                className="bg-transparent text-sm font-medium text-primary outline-none focus:border-none focus:outline-none dark:text-white/80"
              >
                {activeProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} · {project.client || 'Sin cliente'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Ciclo actual"
            icon={RefreshCcw}
            iconTone="bg-accent/10 text-accent dark:bg-white/5 dark:text-white"
            value={currentCycleNumber || '—'}
            foot={
              currentCycle ? getStatusDisplayLabel(currentCycle.status) : 'Sin datos'
            }
          />
          <SummaryCard
            title="Total de revisiones"
            icon={Clock4}
            iconTone="bg-[#E7F1FF] text-[#4C8EF7] dark:bg-[#1B1C20] dark:text-blue-300"
            value={totalCycles}
            foot="Histórico completo"
          />
          <SummaryCard
            title="Aprobados"
            icon={ShieldCheck}
            iconTone="bg-[#E6F5EC] text-[#2F9E44] dark:bg-[#1B1C20] dark:text-emerald-300"
            value={approvedCycles.length}
            foot="Ciclos finalizados"
          />
          <SummaryCard
            title="Último movimiento"
            icon={Sparkles}
            iconTone="bg-[#FFF4E6] text-[#FFB020] dark:bg-[#1B1C20] dark:text-amber-300"
            value={
              lastFeedbackAt
                ? `Feedback ${formatRelative(lastFeedbackAt)}`
                : lastSentAt
                ? `Primera versión ${formatRelative(lastSentAt)}`
                  : 'Sin envíos registrados'
            }
            valueClassName="text-base font-semibold text-primary"
            foot={lastFeedbackAt ? formatTimestamp(lastFeedbackAt) : lastSentAt ? formatTimestamp(lastSentAt) : '—'}
            footClassName="mt-2 text-xs uppercase tracking-[0.3em] text-secondary/70"
          />
        </div>
      </section>

      <section className="glass-panel p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary">Ciclo actual</h3>
            <p className="text-sm text-secondary">
              Usa los botones para cambiar de estado; el reinicio limpia las iteraciones actuales.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetCycle}
            disabled={pendingAction}
            className="inline-flex items-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-medium text-secondary shadow-sm transition hover:bg-[#EEF1F6] hover:text-primary disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#2B2D31] dark:bg-[#1E1F23] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white/90"
          >
            {pendingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Resetear ciclo
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-[#CBD5F5] bg-[#F9FAFF] dark:border-[#2B2D31] dark:bg-[#1B1C20]">
            <div className="flex items-center gap-3 text-secondary">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
              Cargando ciclos de revisión...
            </div>
          </div>
        ) : emptyState ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#CBD5F5] bg-[#F9FAFF] text-center dark:border-[#2B2D31] dark:bg-[#1B1C20] dark:text-white/70">
            <RefreshCcw className="h-8 w-8 text-accent" />
            <div>
              <p className="text-lg font-medium text-primary">No hay ciclos activos</p>
              <p className="text-sm text-secondary">
                Crea un ciclo para comenzar a registrar iteraciones con tu cliente.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetCycle}
              disabled={pendingAction}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(108,99,255,0.25)] transition hover:shadow-[0_16px_32px_rgba(108,99,255,0.3)] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-accent dark:hover:bg-accent/80"
            >
              {pendingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Resetear ciclo
            </button>
          </div>
        ) : (
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0 lg:grid-cols-4">
            {boardColumns.map((column) => (
              <div
                key={column.id}
                className="flex min-h-[260px] min-w-[260px] flex-col rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 snap-start md:min-w-0 dark:border-[#2B2D31] dark:bg-[#1E1F23]"
              >
                <header className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-primary">{column.label}</h4>
                    <span className="text-xs text-secondary/80">
                      {column.items.length}
                    </span>
                  </div>
                  <p className="text-xs text-secondary/80">{column.description}</p>
                </header>

                <div className="mt-4 flex-1 space-y-3">
                  {column.items.length === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-[#CBD5F5] bg-white text-center text-xs text-secondary dark:border-[#2B2D31] dark:bg-[#0F0F11] dark:text-white/50">
                      Sin tarjetas
                    </div>
                  ) : (
                    column.items.map((cycle) => (
                      <article
                        key={cycle.id}
                        className={clsx(
                          'rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm dark:border-[#2B2D31] dark:bg-[#0F0F11] dark:shadow-[0_16px_32px_rgba(0,0,0,0.4)]',
                          pendingAction && 'opacity-60'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-secondary/70">
                              Ciclo #{cycle.number}
                            </p>
                            <h5 className="mt-1 text-lg font-semibold text-primary">
                              {selectedProject?.name || 'Proyecto'}
                            </h5>
                          </div>
                          <span
                            className={clsx(
                              'rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]',
                              STATUS_BADGES[cycle.status] || STATUS_BADGES.editando
                            )}
                          >
                            {getStatusDisplayLabel(cycle.status)}
                          </span>
                        </div>

                        <dl className="mt-4 space-y-3 text-xs text-secondary dark:text-white/60">
                          <div className="flex items-center justify-between">
                            <dt>Primera versión</dt>
                            <dd className="text-right text-primary">
                              {formatTimestamp(cycle.sent_at)}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt>Feedback</dt>
                            <dd className="text-right text-primary">
                              {formatTimestamp(cycle.client_returned_at)}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt>Notas</dt>
                            <dd className="text-right text-primary">
                              {cycle.notes?.length ? cycle.notes : '—'}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-4">
                          <CycleActionButtons
                            status={cycle.status}
                            onMove={handleMoveToStep}
                            onApprove={handleApprove}
                            disabled={pendingAction}
                          />
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {revisionError ? (
          <p className="mt-4 rounded-lg border border-[#F4C7C7] bg-[#FDECEC] p-3 text-sm text-[#B91C1C]">
            {revisionError}
          </p>
        ) : null}
      </section>

      <section className="glass-panel p-4 sm:p-6">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary">Historial de ciclos</h3>
            <p className="text-sm text-secondary">
              Visualiza el recorrido completo y mide tiempos de respuesta.
            </p>
          </div>
        </header>
        <div className="overflow-hidden rounded-lg border border-[#E5E7EB]">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-sm text-secondary dark:divide-[#2B2D31] dark:text-white/70">
            <thead className="bg-[#F9FAFB] text-xs uppercase tracking-wider text-secondary/80 dark:bg-[#1B1C20] dark:text-white/50">
              <tr>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Ciclo</th>
                <th className="px-4 py-3 text-left">Movimiento</th>
                <th className="px-4 py-3 text-left">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] bg-white dark:divide-[#2B2D31] dark:bg-[#1E1F23]">
              {historyEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-secondary dark:text-white/60">
                    Sin movimientos registrados aún.
                  </td>
                </tr>
              ) : (
                historyEntries.map((entry) => (
                  <tr key={entry.id} className="transition hover:bg-[#F7F8FA] dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-primary">{formatTimestamp(entry.occurredAt)}</td>
                    <td className="px-4 py-3">{entry.cycleNumber ? `#${entry.cycleNumber}` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-primary">{entry.toStatus}</span>
                      <span className="mx-2 text-secondary/70">←</span>
                      <span>{entry.fromStatus}</span>
                    </td>
                    <td className="px-4 py-3">{entry.notes?.length ? entry.notes : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default VistaCiclos;

const SummaryCard = ({
  title,
  icon: Icon,
  iconTone,
  value,
  valueClassName = 'text-3xl font-semibold text-primary',
  foot,
  footClassName = 'mt-1 text-xs uppercase tracking-[0.3em] text-secondary/80',
}) => (
  <div className="flex h-full flex-col justify-between rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm dark:border-[#2B2D31] dark:bg-[#1E1F23] dark:shadow-[0_18px_34px_rgba(0,0,0,0.45)]">
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-secondary dark:text-white/70">{title}</span>
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${iconTone}`}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <div className="mt-4">
      <p className={valueClassName}>{value}</p>
      {foot ? <p className={footClassName}>{foot}</p> : null}
    </div>
  </div>
);
