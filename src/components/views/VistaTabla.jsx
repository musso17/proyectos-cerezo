"use client";

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { differenceInCalendarDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit2, Trash2, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useStore from '../../hooks/useStore';
import { filterProjects } from '../../utils/filterProjects';
import { getUIPreference, setUIPreference } from '../../utils/uiPreferences';
import { STATUS_OPTIONS, getStatusLabel, normalizeStatus } from '../../utils/statusHelpers';
import { isAbsenceProject } from '../../utils/absences';
import {
  computeTurnaroundByFormat,
  estimateDeliveryDate,
  extractProjectInfo,
  getFormatLabel,
  getProjectRecordingDates,
  parseProjectDate,
} from '../../utils/dashboardHelpers';
import MemberAvatar from '../ui/MemberAvatar';
import { deleteProjectWithUndo, hasDeliverableLink } from '../ui/projectActions';

const getLabel = (value, fallback) => {
  if (!value) return fallback;
  const trimmed = value.toString().trim();
  return trimmed.length === 0 ? fallback : trimmed;
};

const formatDate = (value) => {
  const date = value instanceof Date ? value : parseProjectDate(value);
  if (!date) return '—';
  return format(date, 'd MMM', { locale: es });
};

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// Días de atraso: fecha de entrega pasada y no completado.
const getOverdueDays = (project) => {
  if (normalizeStatus(project?.status) === 'Completado') return 0;
  const deadline = parseProjectDate(project?.deadline);
  if (!deadline) return 0;
  const days = differenceInCalendarDays(startOfToday(), deadline);
  return days > 0 ? days : 0;
};

// Inicio y entrega caen el mismo día (trabajo de un solo día, no falta de margen).
const isSameDayProject = (project) => {
  const start = project?.startDate;
  const end = project?.deadline;
  if (!start || !end) return false;
  return start.toString().trim().slice(0, 10) === end.toString().trim().slice(0, 10);
};

const PHASE_COLORS = {
  grabacion: '#FF4B2A',
  edicion: '#5F6468',
  fotografia: '#000000',
};

const PHASE_LABELS = {
  grabacion: 'Grabación',
  edicion: 'Edición',
  fotografia: 'Fotografía',
  'fotografía': 'Fotografía',
};

const getStage = (project) => (project.stage || project.properties?.stage || '').toString().trim().toLowerCase();

const getPhaseLabel = (project) => PHASE_LABELS[getStage(project)] || 'Sin fase';

const isCompletedProject = (project) => normalizeStatus(project?.status) === 'Completado';

// Grabación cuyo último día ya pasó (se mueve sola a edición).
const isExpiredRecordingProject = (project) => {
  const stage = getStage(project);
  if (stage !== 'grabacion' && stage !== 'fotografia' && stage !== 'fotografía') return false;
  const days = getProjectRecordingDates(project);
  const last = days[days.length - 1];
  return Boolean(last && last < startOfToday());
};

const isFinishedProject = (project) => isCompletedProject(project) || isExpiredRecordingProject(project);

const DEFAULT_TABLE_FILTERS = {
  type: 'Todos',
  manager: 'Todos',
  status: 'Todos',
  client: 'Todos',
};

const buildInitialFilters = () => {
  const stored = getUIPreference('tableFilters', null);
  const base = { ...DEFAULT_TABLE_FILTERS };
  if (stored && typeof stored === 'object') {
    Object.keys(base).forEach((key) => {
      const value = stored[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        base[key] = value;
      }
    });
  }
  return base;
};

const STATUS_DOT = {
  Programado: 'bg-slate-400',
  'En progreso': 'bg-amber-500',
  'En revisión': 'bg-blue-500',
  Completado: 'bg-emerald-500',
  Stuck: 'bg-red-500',
};

const StatusSelector = ({ project }) => {
  const updateProject = useStore((state) => state.updateProject);
  const openModal = useStore((state) => state.openModal);
  const [loading, setLoading] = useState(false);
  const currentStatus = normalizeStatus(project.status);

  const handleChange = async (e) => {
    const newValue = e.target.value;
    if (!newValue || newValue === currentStatus || loading) return;

    // Completado exige el link del entregable: se abre el formulario para pedirlo.
    if (newValue === 'Completado' && !hasDeliverableLink(project)) {
      openModal(project, { status: 'Completado' });
      return;
    }

    setLoading(true);
    const nextProperties = { ...(project.properties || {}), status: newValue };
    const updatePayload = { ...project, status: newValue, properties: nextProperties };

    if (newValue === 'Completado') {
      // completedAt vive en properties (la columna no existe en Supabase).
      updatePayload.state = 'entregado';
      nextProperties.completedAt = new Date().toISOString();
      nextProperties.state = 'entregado';
    }

    const result = await updateProject(updatePayload);
    setLoading(false);
    if (result?.ok) {
      toast.success(`«${project.name || 'Proyecto'}» → ${getStatusLabel(newValue)}`);
    } else {
      toast.error('No se pudo cambiar el estado. Intenta de nuevo.');
    }
  };

  return (
    <div
      className="group relative inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/70 px-3 py-1.5 transition-all hover:bg-white dark:border-white/10 dark:bg-white/[0.03]"
      onClick={(e) => e.stopPropagation()}
    >
      <span className={`h-2 w-2 rounded-full ${STATUS_DOT[currentStatus] || 'bg-gray-400'}`} />
      <span className="whitespace-nowrap text-xs font-medium text-primary dark:text-white/80">{getStatusLabel(currentStatus)}</span>
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={loading}
        aria-label={`Estado de ${project.name || 'proyecto'}`}
        className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="text-secondary/70 transition-transform group-hover:text-secondary" />
    </div>
  );
};

const DeliveryCell = ({ project, estimate }) => {
  if (isCompletedProject(project)) {
    const { deliveryDate } = extractProjectInfo(project);
    return (
      <span className="text-xs font-medium text-secondary dark:text-white/60">
        {deliveryDate ? `Entregado ${formatDate(deliveryDate)}` : 'Entregado'}
      </span>
    );
  }
  const overdueDays = getOverdueDays(project);
  if (project.deadline && overdueDays > 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-400">
        {formatDate(project.deadline)} · vencido hace {overdueDays} {overdueDays === 1 ? 'día' : 'días'}
      </span>
    );
  }
  if (project.deadline) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary dark:text-white/80">
        {formatDate(project.deadline)}
        {isSameDayProject(project) && (
          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-secondary dark:bg-white/10 dark:text-white/60">
            1 día
          </span>
        )}
      </span>
    );
  }
  if (estimate) {
    return (
      <span
        className="text-xs italic text-secondary dark:text-white/60"
        title={`Estimado: ${estimate.formatLabel} suele tardar ${estimate.days} días desde el último día de grabación (promedio de ${estimate.samples} proyectos).`}
      >
        ≈ {formatDate(estimate.date)} <span className="not-italic">(estimado)</span>
      </span>
    );
  }
  return <span className="text-xs italic text-secondary dark:text-white/60">A confirmar</span>;
};

const ProjectActions = ({ project, onEdit }) => (
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onEdit(project);
      }}
      aria-label={`Editar ${project.name || 'proyecto'}`}
      title="Editar"
      className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-secondary transition-all hover:bg-dark-bg hover:text-white active:scale-95 dark:bg-white/5 dark:text-white/60 dark:hover:bg-accent dark:hover:text-dark-bg"
    >
      <Edit2 size={14} />
    </button>
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        deleteProjectWithUndo(project);
      }}
      aria-label={`Eliminar ${project.name || 'proyecto'}`}
      title="Eliminar"
      className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 transition-all hover:bg-red-600 hover:text-white active:scale-95 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white"
    >
      <Trash2 size={14} />
    </button>
  </div>
);

const FilterSelect = ({ id, label, value, options, onChange }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-xs font-semibold text-secondary dark:text-white/60">
      {label}
    </label>
    <select
      id={id}
      value={value}
      onChange={onChange}
      className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-primary focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 dark:border-white/10 dark:bg-[#0B0C10] dark:text-white"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

const VistaTabla = ({ projects: projectsProp }) => {
  const projectsFromStore = useStore((state) => state.projects);
  const projects = projectsProp !== undefined ? projectsProp : projectsFromStore;
  const openModal = useStore((state) => state.openModal);
  const searchTerm = useStore((state) => state.searchTerm);
  const setSearchTerm = useStore((state) => state.setSearchTerm);

  const [filters, setFilters] = useState(() => buildInitialFilters());
  const [showFinished, setShowFinished] = useState(() => getUIPreference('tableShowFinished', false) === true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setUIPreference('tableFilters', filters);
  }, [filters]);

  useEffect(() => {
    setUIPreference('tableShowFinished', showFinished);
  }, [showFinished]);

  const isSearching = searchTerm.trim().length > 0;
  // Al buscar se incluyen también los terminados: si no, "porsche" decía
  // "No se encontraron proyectos" aunque hubiera una decena entregados.
  const includeFinished = showFinished || isSearching;

  const workProjects = useMemo(() => (projects || []).filter((project) => !isAbsenceProject(project)), [projects]);

  const listedProjects = useMemo(
    () => (includeFinished ? workProjects : workProjects.filter((project) => !isFinishedProject(project))),
    [workProjects, includeFinished]
  );

  const turnaround = useMemo(() => computeTurnaroundByFormat(workProjects), [workProjects]);

  const orderedProjects = useMemo(() => {
    // Activos primero (por fecha de inicio, la más cercana arriba); los
    // terminados al final, por fecha de entrega del más reciente al más
    // antiguo. Sin fecha, al final de su grupo.
    const keyed = listedProjects.map((project) => {
      const finished = isFinishedProject(project);
      const info = extractProjectInfo(project);
      const date = finished ? info.deliveryDate : info.workStart;
      return { project, finished, time: date ? date.getTime() : null };
    });
    return keyed
      .sort((a, b) => {
        if (a.finished !== b.finished) return a.finished ? 1 : -1;
        if (a.time === null || b.time === null) return a.time === null ? (b.time === null ? 0 : 1) : -1;
        return a.finished ? b.time - a.time : a.time - b.time;
      })
      .map(({ project }) => project);
  }, [listedProjects]);

  const filterOptions = useMemo(() => {
    const typeSet = new Set();
    const managerSet = new Set();
    const statusSet = new Set();
    const clientSet = new Set();

    listedProjects.forEach((project) => {
      typeSet.add(getPhaseLabel(project));
      const managers = getProjectManagers(project);
      if (managers.length === 0) {
        managerSet.add('Sin asignar');
      } else {
        managers.forEach((manager) => managerSet.add(getLabel(manager, 'Sin asignar')));
      }
      statusSet.add(getStatusLabel(project.status));
      clientSet.add(getLabel(project.client, 'Sin cliente'));
    });

    const toSortedArray = (set) => ['Todos', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))];

    return {
      types: toSortedArray(typeSet),
      managers: toSortedArray(managerSet),
      statuses: toSortedArray(statusSet),
      clients: toSortedArray(clientSet),
    };
  }, [listedProjects]);

  const filteredProjects = useMemo(() => {
    return orderedProjects.filter((project) => {
      if (filters.type !== 'Todos' && filters.type !== getPhaseLabel(project)) return false;
      if (filters.manager !== 'Todos') {
        const managers = getProjectManagers(project);
        if (managers.length === 0) {
          if (filters.manager !== 'Sin asignar') return false;
        } else if (!managers.some((manager) => getLabel(manager, 'Sin asignar') === filters.manager)) {
          return false;
        }
      }
      if (filters.status !== 'Todos' && filters.status !== getStatusLabel(project.status)) return false;
      if (filters.client !== 'Todos' && filters.client !== getLabel(project.client, 'Sin cliente')) return false;
      return true;
    });
  }, [orderedProjects, filters]);

  const searchFilteredProjects = useMemo(
    () => filterProjects(filteredProjects, searchTerm),
    [filteredProjects, searchTerm]
  );

  const finishedMatches = useMemo(
    () => searchFilteredProjects.filter((project) => isFinishedProject(project)).length,
    [searchFilteredProjects]
  );

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => value !== DEFAULT_TABLE_FILTERS[key]).length;

  const handleFilterChange = (key) => (event) => {
    const value = event.target.value;
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // "Limpiar" deja la vista como recién abierta: filtros y búsqueda.
  const handleResetFilters = () => {
    setFilters(() => ({ ...DEFAULT_TABLE_FILTERS }));
    setSearchTerm('');
  };

  const estimateFor = (project) => (project.deadline ? null : estimateDeliveryDate(project, turnaround));

  const emptyMessage = isSearching
    ? `No hay proyectos que coincidan con «${searchTerm.trim()}»${activeFilterCount ? ' con estos filtros' : ''}.`
    : activeFilterCount
      ? 'No hay proyectos activos con estos filtros.'
      : 'No hay proyectos activos.';

  return (
    <div className="flex h-full flex-col gap-5 p-2 sm:p-4 md:p-6 animate-fade-up">
      {/* Filtros: plegables en móvil para no ocupar la primera pantalla */}
      <div className="flex items-center gap-2 md:hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
          aria-controls="table-filters"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-primary dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <SlidersHorizontal size={16} />
          Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
        {(activeFilterCount > 0 || isSearching) && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-secondary underline-offset-2 hover:underline dark:text-white/60"
          >
            Limpiar
          </button>
        )}
      </div>

      <div
        id="table-filters"
        className={clsx(
          'glass-panel items-end gap-4 rounded-xl p-4 sm:grid-cols-2 md:grid lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:p-5',
          filtersOpen ? 'grid' : 'hidden'
        )}
      >
        <FilterSelect id="filter-phase" label="Fase" value={filters.type} options={filterOptions.types} onChange={handleFilterChange('type')} />
        <FilterSelect id="filter-manager" label="Responsable" value={filters.manager} options={filterOptions.managers} onChange={handleFilterChange('manager')} />
        <FilterSelect id="filter-status" label="Estado" value={filters.status} options={filterOptions.statuses} onChange={handleFilterChange('status')} />
        <FilterSelect id="filter-client" label="Cliente" value={filters.client} options={filterOptions.clients} onChange={handleFilterChange('client')} />
        <button
          type="button"
          onClick={handleResetFilters}
          className="w-full rounded-lg bg-dark-bg px-6 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-95 sm:w-auto dark:bg-accent dark:text-dark-bg"
        >
          Limpiar
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-secondary dark:text-white/60">
        <p aria-live="polite">
          {searchFilteredProjects.length} {searchFilteredProjects.length === 1 ? 'proyecto' : 'proyectos'}
          {isSearching && <> para «<strong className="text-primary dark:text-white">{searchTerm.trim()}</strong>»</>}
          {isSearching && finishedMatches > 0 && ` (incluye ${finishedMatches} terminado${finishedMatches === 1 ? '' : 's'})`}
        </p>
        <label className="inline-flex cursor-pointer items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={showFinished}
            onChange={(e) => setShowFinished(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[#FF4B2A]"
          />
          Mostrar terminados
        </label>
      </div>

      {/* ── Mobile: tarjetas apiladas (en vez de la tabla con scroll horizontal) ── */}
      <div className="flex flex-col gap-3 md:hidden">
        {searchFilteredProjects.length === 0 ? (
          <div className="glass-panel rounded-xl border border-border p-8 text-center dark:border-white/5">
            <p className="text-sm font-medium text-secondary dark:text-white/60">{emptyMessage}</p>
          </div>
        ) : (
          searchFilteredProjects.map((project, index) => {
            const stage = getStage(project) || 'edicion';
            const managers = getProjectManagers(project);
            const finished = isFinishedProject(project);
            return (
              <div
                key={project.id || index}
                role="button"
                tabIndex={0}
                onClick={() => openModal(project)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') openModal(project);
                }}
                className={clsx(
                  'glass-panel rounded-xl border border-border p-4 transition-transform active:scale-[0.99] dark:border-white/5',
                  finished && 'opacity-75'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: PHASE_COLORS[stage] || '#5F6468' }} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-primary dark:text-white">{project.name || 'Sin título'}</p>
                    <p className="mt-0.5 text-xs text-secondary dark:text-white/60">
                      {getPhaseLabel(project)} · {getFormatLabel(project.registrationType || project.type)} · {project.client || 'Sin cliente'}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <StatusSelector project={project} />
                      {managers.map((m) => <MemberAvatar key={m} name={m} size="sm" />)}
                      {managers.length === 0 && <span className="text-xs italic text-secondary dark:text-white/50">Sin asignar</span>}
                    </div>

                    <div className="mt-3 flex items-center gap-2 border-t border-border/40 pt-3 text-xs font-medium text-secondary dark:border-white/5 dark:text-white/60">
                      <span className="whitespace-nowrap">{formatDate(project.startDate)}</span>
                      <span aria-hidden="true">→</span>
                      <DeliveryCell project={project} estimate={estimateFor(project)} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Desktop: tabla ── */}
      <div className="hidden glass-panel overflow-hidden rounded-xl border border-border shadow-xl md:block dark:border-white/5">
        <div className="overflow-x-auto soft-scroll">
          <table className="w-full border-collapse text-sm text-secondary">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold text-secondary dark:bg-black/40 dark:text-white/60">
                <th scope="col" className="sticky left-0 z-10 bg-slate-50 py-3 pl-6 pr-4 dark:bg-[#0d0e12]">Proyecto</th>
                <th scope="col" className="px-4 py-3">Responsables</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3">Inicio → Entrega</th>
                <th scope="col" className="px-4 py-3">Cliente</th>
                <th scope="col" className="sticky right-0 z-10 bg-slate-50 py-3 pl-4 pr-6 text-right dark:bg-[#0d0e12]">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 dark:divide-white/5">
              {searchFilteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-16 text-center">
                    <p className="text-sm font-medium text-secondary dark:text-white/60">{emptyMessage}</p>
                  </td>
                </tr>
              ) : (
                searchFilteredProjects.map((project, index) => {
                  const managers = getProjectManagers(project);
                  const finished = isFinishedProject(project);
                  const stage = getStage(project) || 'edicion';
                  return (
                    <tr
                      key={project.id || index}
                      className={clsx(
                        'group cursor-pointer bg-white/40 transition-colors hover:bg-slate-50 dark:bg-transparent dark:hover:bg-white/[0.03]',
                        finished && 'text-secondary/80'
                      )}
                      onClick={() => openModal(project)}
                    >
                      <td className="sticky left-0 z-10 bg-white py-4 pl-6 pr-4 group-hover:bg-slate-50 dark:bg-[#121316] dark:group-hover:bg-[#17181c]">
                        <div className="flex min-w-[220px] max-w-[320px] gap-3">
                          <div className="w-1 shrink-0 rounded-full" style={{ backgroundColor: PHASE_COLORS[stage] || '#5F6468' }} />
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openModal(project);
                              }}
                              className={clsx(
                                'line-clamp-2 text-left text-[15px] font-semibold leading-snug tracking-tight transition-colors hover:text-accent focus:outline-none focus-visible:underline',
                                finished ? 'text-secondary dark:text-white/60' : 'text-primary dark:text-white'
                              )}
                            >
                              {project.name || 'Sin título'}
                            </button>
                            <span className="text-xs text-secondary dark:text-white/50">
                              {getPhaseLabel(project)} · {getFormatLabel(project.registrationType || project.type)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {managers.map((m) => (
                            <span key={m} className="inline-flex items-center gap-1.5">
                              <MemberAvatar name={m} size="sm" />
                              <span className="text-xs font-medium text-primary dark:text-white/80">{m}</span>
                            </span>
                          ))}
                          {managers.length === 0 && (
                            <span className="text-xs italic text-secondary dark:text-white/50">Sin asignar</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusSelector project={project} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-secondary dark:text-white/60">{formatDate(project.startDate)} →</span>
                          <DeliveryCell project={project} estimate={estimateFor(project)} />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs font-semibold text-primary dark:text-white/80">{project.client || 'Sin cliente'}</span>
                      </td>
                      <td className="sticky right-0 z-10 bg-white py-4 pl-4 pr-6 group-hover:bg-slate-50 dark:bg-[#121316] dark:group-hover:bg-[#17181c]">
                        <div className="flex justify-end">
                          <ProjectActions project={project} onEdit={openModal} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};


export default VistaTabla;

function getProjectManagers(project) {
  if (Array.isArray(project.managers)) {
    return project.managers.filter((manager) => manager && manager.toString().trim().length > 0);
  }
  if (!project.manager) return [];
  return project.manager
    .toString()
    .split(',')
    .map((manager) => manager.trim())
    .filter(Boolean);
}
