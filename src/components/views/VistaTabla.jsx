"use client";

import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, Edit2, Trash2 } from 'lucide-react';
import useStore from '../../hooks/useStore';
import { filterProjects } from '../../utils/filterProjects';
import { getClientBadgeClass } from '../../utils/clientStyles';
import { generarLinkGoogleCalendar } from '../../utils/calendar';

const statusStyles = {
  Completado: {
    badge: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100',
    dot: 'bg-emerald-300',
  },
  Finalizado: {
    badge: 'border-emerald-400/40 bg-emerald-500/20 text-emerald-100',
    dot: 'bg-emerald-300',
  },
  'En curso': {
    badge: 'border-amber-400/40 bg-amber-500/20 text-amber-100',
    dot: 'bg-amber-300',
  },
  'En progreso': {
    badge: 'border-amber-400/40 bg-amber-500/20 text-amber-100',
    dot: 'bg-amber-300',
  },
  Pendiente: {
    badge: 'border-slate-500/40 bg-slate-700/30 text-slate-200',
    dot: 'bg-slate-300',
  },
  'En revisión': {
    badge: 'border-purple-400/40 bg-purple-600/20 text-purple-100',
    dot: 'bg-purple-300',
  },
  Cancelado: {
    badge: 'border-red-500/40 bg-red-600/20 text-red-100',
    dot: 'bg-red-400',
  },
};

const getLabel = (value, fallback) => {
  if (!value) return fallback;
  const trimmed = value.toString().trim();
  return trimmed.length === 0 ? fallback : trimmed;
};

const formatDate = (value) => {
  if (!value) return '—';
  const str = value.toString().trim();
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }
  const altMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (altMatch) {
    return str;
  }
  try {
    const date = new Date(str);
    if (Number.isNaN(date.getTime())) return str;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return str;
  }
};

const TYPE_BADGES = {
  grabacion: {
    label: 'Grabación',
    className: 'bg-blue-500/10 text-blue-200 border border-blue-400/40',
  },
  edicion: {
    label: 'Edición',
    className: 'bg-emerald-500/10 text-emerald-200 border border-emerald-400/40',
  },
};

const getProjectTypeBadge = (project) => {
  if (!project) return { label: 'Sin tipo', className: 'bg-slate-700/50 text-secondary border border-border/60' };

  const rawStage = project.stage || project.properties?.stage || '';
  const rawType = project.type || project.properties?.registrationType || '';

  const normalizedStage = rawStage?.toString().trim().toLowerCase();
  const normalizedType = rawType?.toString().trim().toLowerCase();

  if (normalizedStage && TYPE_BADGES[normalizedStage]) {
    return TYPE_BADGES[normalizedStage];
  }
  if (normalizedType && TYPE_BADGES[normalizedType]) {
    return TYPE_BADGES[normalizedType];
  }

  return { label: rawType || rawStage || 'Sin tipo', className: 'bg-slate-700/50 text-secondary border border-border/60' };
};

const isCompletedProject = (project) => {
  const status = project?.status || '';
  return status.toString().trim().toLowerCase() === 'completado';
};

const renderStatusBadge = (status) => {
  const key = status && statusStyles[status] ? status : 'Pendiente';
  const { badge, dot } = statusStyles[key] || statusStyles.Pendiente;
  const label = status || 'Pendiente';
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badge}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
};

const VistaTabla = () => {
  const projects = useStore((state) => state.projects);
  const openModal = useStore((state) => state.openModal);
  const deleteProject = useStore((state) => state.deleteProject);
  const searchTerm = useStore((state) => state.searchTerm);

  const [filters, setFilters] = useState({
    type: 'Todos',
    manager: 'Todos',
    status: 'Todos',
    client: 'Todos',
  });

  const activeProjects = useMemo(
    () => projects.filter((project) => !isCompletedProject(project)),
    [projects]
  );

const orderedProjects = useMemo(() => {
    return [...activeProjects].sort((a, b) => {
      const aDate = a.startDate ? new Date(a.startDate).getTime() : Number.POSITIVE_INFINITY;
      const bDate = b.startDate ? new Date(b.startDate).getTime() : Number.POSITIVE_INFINITY;
      return aDate - bDate;
    });
  }, [activeProjects]);

  const filterOptions = useMemo(() => {
    const typeSet = new Set();
    const managerSet = new Set();
    const statusSet = new Set();
    const clientSet = new Set();

    activeProjects.forEach((project) => {
      typeSet.add(getLabel(project.type, 'Sin tipo'));
      const managers = getProjectManagers(project);
      if (managers.length === 0) {
        managerSet.add('Sin asignar');
      } else {
        managers.forEach((manager) => managerSet.add(getLabel(manager, 'Sin asignar')));
      }
      statusSet.add(getLabel(project.status, 'Pendiente'));
      clientSet.add(getLabel(project.client, 'Sin cliente'));
    });

    const toSortedArray = (set) => ['Todos', ...Array.from(set).sort((a, b) => a.localeCompare(b, 'es'))];

    return {
      types: toSortedArray(typeSet),
      managers: toSortedArray(managerSet),
      statuses: toSortedArray(statusSet),
      clients: toSortedArray(clientSet),
    };
  }, [activeProjects]);

  const filteredProjects = useMemo(() => {
    return orderedProjects.filter((project) => {
      const typeLabel = getLabel(project.type, 'Sin tipo');
      const statusLabel = getLabel(project.status, 'Pendiente');
      const clientLabel = getLabel(project.client, 'Sin cliente');

      if (filters.type !== 'Todos' && filters.type !== typeLabel) return false;
      if (filters.manager !== 'Todos') {
        const managers = getProjectManagers(project);
        if (managers.length === 0) {
          if (filters.manager !== 'Sin asignar') return false;
        } else if (!managers.some((manager) => getLabel(manager, 'Sin asignar') === filters.manager)) {
          return false;
        }
      }
      if (filters.status !== 'Todos' && filters.status !== statusLabel) return false;
      if (filters.client !== 'Todos' && filters.client !== clientLabel) return false;
      return true;
    });
  }, [orderedProjects, filters]);

  const searchFilteredProjects = useMemo(
    () => filterProjects(filteredProjects, searchTerm),
    [filteredProjects, searchTerm]
  );

  const handleFilterChange = (key) => (event) => {
    const value = event.target.value;
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      type: 'Todos',
      manager: 'Todos',
      status: 'Todos',
      client: 'Todos',
    });
  };

  const handleEdit = (project, event) => {
    event.stopPropagation();
    openModal(project);
  };

  const handleDelete = (project, event) => {
    event.stopPropagation();
    if (!project.id) return;
    const confirmed = window.confirm(`¿Eliminar el proyecto "${project.name}"?`);
    if (confirmed) {
      deleteProject(project.id);
    }
  };

  const renderTypeBadge = (project, extraClasses = '') => {
    const meta = getProjectTypeBadge(project);
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${meta.className} ${extraClasses}`}>
        {meta.label}
      </span>
    );
  };

  return (
    <div className="soft-scroll flex h-full flex-col gap-4 overflow-auto">
      <div className="glass-panel flex flex-wrap items-end gap-4 rounded-3xl px-4 py-4 text-xs text-secondary sm:px-6">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:gap-0">
          <label className="mb-1 font-medium uppercase tracking-wide text-secondary">Tipo</label>
          <select
            value={filters.type}
            onChange={handleFilterChange('type')}
            className="rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {filterOptions.types.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:gap-0">
          <label className="mb-1 font-medium uppercase tracking-wide text-secondary">Encargado</label>
          <select
            value={filters.manager}
            onChange={handleFilterChange('manager')}
            className="rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {filterOptions.managers.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:gap-0">
          <label className="mb-1 font-medium uppercase tracking-wide text-secondary">Estado</label>
          <select
            value={filters.status}
            onChange={handleFilterChange('status')}
            className="rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {filterOptions.statuses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:gap-0">
          <label className="mb-1 font-medium uppercase tracking-wide text-secondary">Cliente</label>
          <select
            value={filters.client}
            onChange={handleFilterChange('client')}
            className="rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          >
            {filterOptions.clients.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleResetFilters}
          className="w-full rounded-2xl border border-accent/60 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-500/30 sm:ml-auto sm:w-auto"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:hidden">
        {searchFilteredProjects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/60 bg-slate-900/60 p-6 text-center text-sm text-secondary">
            No hay proyectos para mostrar.
          </div>
        ) : (
          searchFilteredProjects.map((project, index) => {
            const managers = getProjectManagers(project);
            const managerLabel = managers.length > 0 ? managers.join(', ') : 'Sin asignar';
            const calendarLink = generarLinkGoogleCalendar({
              contenido: project.name || 'Proyecto',
              detalle: project.description || '',
              fechaInicio: project.startDate || '',
              fechaFin: project.deadline || '',
              encargado: managerLabel,
              cliente: project.client || '',
            });
            const calendarDisabled = !calendarLink;

            return (
              <div
                key={project.id || index}
                className="space-y-4 rounded-3xl border border-border/60 bg-slate-900/70 p-5 shadow-[0_14px_42px_rgba(2,6,23,0.38)] transition hover:border-accent/40"
                onClick={() => openModal(project)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openModal(project);
                  }
                }}
              >
                <div className="space-y-3">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-primary">
                      {project.name || 'Sin título'}
                    </h3>
                    {renderTypeBadge(project, 'w-fit')}
                  </div>
                  <div className="space-y-2 text-sm text-secondary">
                    <p>
                      <span className="text-secondary/70">Responsable: </span>
                      <span className="text-primary">{managerLabel}</span>
                    </p>
                    <p>
                      <span className="text-secondary/70">Cliente: </span>
                      <span className="text-primary">{project.client || 'Sin cliente'}</span>
                    </p>
                    <div className="space-y-2 text-sm">
                      {[
                        { label: 'Inicio', value: formatDate(project.startDate) },
                        { label: 'Entrega', value: formatDate(project.deadline) },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between gap-3">
                          <span className="text-secondary/70">
                            {label}:{' '}
                            <span className="text-primary">{value}</span>
                          </span>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!calendarLink) return;
                              window.open(calendarLink, '_blank', 'noopener');
                            }}
                            disabled={calendarDisabled}
                            className={`flex h-8 w-8 items-center justify-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                              calendarDisabled
                                ? 'cursor-not-allowed border border-border/60 text-secondary'
                                : 'border border-accent/50 text-accent hover:bg-accent/10'
                            }`}
                            aria-label={`Agendar ${label.toLowerCase()} en Calendar`}
                          >
                            <CalendarIcon size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div>{renderStatusBadge(project.status)}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openModal(project);
                    }}
                    className="w-full rounded-2xl border border-accent/70 bg-emerald-500/20 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-accent hover:bg-emerald-500/30"
                  >
                    Ver detalles
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(project, event);
                    }}
                    className="w-full rounded-2xl border border-red-500/60 bg-red-600/20 px-4 py-3 text-sm font-semibold text-red-200 transition hover:-translate-y-0.5 hover:bg-red-600/30"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="glass-panel overflow-hidden rounded-3xl">
        <table className="hidden w-full border-collapse text-sm text-secondary sm:table">
          <thead>
            <tr className="bg-white/5 text-xs uppercase tracking-wide text-secondary">
              {['Proyecto', 'Encargado', 'Estado', 'Inicio', 'Entrega', 'Cliente', 'Acciones'].map((header) => (
                <th key={header} className="px-6 py-4 text-left font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {searchFilteredProjects.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-secondary">
                  No hay proyectos para mostrar.
                </td>
              </tr>
            ) : (
              searchFilteredProjects.map((project, index) => {
                const calendarLink = generarLinkGoogleCalendar({
                  contenido: project.name || 'Proyecto',
                  detalle: project.description || '',
                  fechaInicio: project.startDate || '',
                  fechaFin: project.deadline || '',
                  encargado: project.manager || '',
                  cliente: project.client || '',
                });
                const calendarDisabled = !calendarLink;

                return (
                  <tr
                    key={project.id || index}
                    className="border-t border-border/60 transition-all duration-200 ease-[var(--ease-ios-out)] hover:-translate-y-0.5 hover:bg-slate-900/40"
                    onClick={() => openModal(project)}
                  >
                    <td className="px-6 py-5 text-sm font-semibold text-primary">
                      {project.name || 'Sin título'}
                      <div className="mt-2">
                        {renderTypeBadge(project)}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-secondary">
                      {(() => {
                        const managers = getProjectManagers(project);
                        return managers.length > 0 ? managers.join(', ') : 'Sin asignar';
                      })()}
                    </td>
                    <td className="px-6 py-5">{renderStatusBadge(project.status)}</td>
                    <td className="px-6 py-5 text-sm text-secondary">
                      <div className="flex items-center gap-2">
                        <span>{formatDate(project.startDate)}</span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!calendarLink) return;
                            window.open(calendarLink, '_blank', 'noopener');
                          }}
                          disabled={calendarDisabled}
                          className={`flex h-8 w-8 items-center justify-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                            calendarDisabled
                              ? 'cursor-not-allowed border border-border/60 text-secondary'
                              : 'border border-accent/50 text-accent hover:bg-accent/10'
                          }`}
                          aria-label="Agendar inicio en Calendar"
                        >
                          <CalendarIcon size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-secondary">
                      <div className="flex items-center gap-2">
                        <span>{formatDate(project.deadline)}</span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!calendarLink) return;
                            window.open(calendarLink, '_blank', 'noopener');
                          }}
                          disabled={calendarDisabled}
                          className={`flex h-8 w-8 items-center justify-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                            calendarDisabled
                              ? 'cursor-not-allowed border border-border/60 text-secondary'
                              : 'border border-accent/50 text-accent hover:bg-accent/10'
                          }`}
                          aria-label="Agendar entrega en Calendar"
                        >
                          <CalendarIcon size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {(() => {
                        const clientLabel = project.client || 'Sin cliente';
                        return <span className={getClientBadgeClass(clientLabel)}>{clientLabel}</span>;
                      })()}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => handleEdit(project, event)}
                          className="rounded-full border border-border/50 bg-slate-900/70 p-2 text-secondary transition hover:-translate-y-0.5 hover:border-accent/60 hover:text-accent"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => handleDelete(project, event)}
                          className="rounded-full border border-red-500/60 bg-red-600/20 p-2 text-red-200 transition hover:-translate-y-0.5 hover:bg-red-600/30"
                        >
                          <Trash2 size={14} />
                        </button>
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
