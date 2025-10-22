"use client";

import React, { useMemo, useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import useStore from '../../hooks/useStore';
import { filterProjects } from '../../utils/filterProjects';
import { getClientBadgeClass } from '../../utils/clientStyles';
import { generarLinkGoogleCalendar } from '../../utils/calendar';

const statusStyles = {
  Completado: {
    badge: 'border-blue-400/40 bg-blue-500/20 text-blue-100',
    dot: 'bg-blue-300',
  },
  Finalizado: {
    badge: 'border-blue-400/40 bg-blue-500/20 text-blue-100',
    dot: 'bg-blue-300',
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
    badge: 'border-slate-400/40 bg-slate-600/30 text-slate-100',
    dot: 'bg-slate-200',
  },
  'En revisión': {
    badge: 'border-purple-400/40 bg-purple-500/20 text-purple-100',
    dot: 'bg-purple-300',
  },
  Cancelado: {
    badge: 'border-red-400/40 bg-red-600/20 text-red-100',
    dot: 'bg-red-300',
  },
};

const typeStylesMap = {
  grabacion: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-100',
  edicion: 'border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-100',
  default: 'border-slate-600/60 bg-slate-700/60 text-slate-200',
};

const clientStyles = 'bg-rose-500/20 text-rose-200 border border-rose-400/40';

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

  const orderedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aDate = a.startDate ? new Date(a.startDate).getTime() : Number.POSITIVE_INFINITY;
      const bDate = b.startDate ? new Date(b.startDate).getTime() : Number.POSITIVE_INFINITY;
      return aDate - bDate;
    });
  }, [projects]);

  const filterOptions = useMemo(() => {
    const typeSet = new Set();
    const managerSet = new Set();
    const statusSet = new Set();
    const clientSet = new Set();

    projects.forEach((project) => {
      typeSet.add(getLabel(project.type, 'Sin tipo'));
      managerSet.add(getLabel(project.manager, 'Sin asignar'));
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
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return orderedProjects.filter((project) => {
      const typeLabel = getLabel(project.type, 'Sin tipo');
      const managerLabel = getLabel(project.manager, 'Sin asignar');
      const statusLabel = getLabel(project.status, 'Pendiente');
      const clientLabel = getLabel(project.client, 'Sin cliente');

      if (filters.type !== 'Todos' && filters.type !== typeLabel) return false;
      if (filters.manager !== 'Todos' && filters.manager !== managerLabel) return false;
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

  return (
    <div className="soft-scroll flex h-full flex-col gap-4 overflow-auto">
      <div className="glass-panel flex flex-wrap items-end gap-4 rounded-3xl px-6 py-4 text-xs text-slate-200">
        <div className="flex flex-col">
          <label className="mb-1 font-medium uppercase tracking-wide text-slate-400">Tipo</label>
          <select
            value={filters.type}
            onChange={handleFilterChange('type')}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          >
            {filterOptions.types.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium uppercase tracking-wide text-slate-400">Encargado</label>
          <select
            value={filters.manager}
            onChange={handleFilterChange('manager')}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          >
            {filterOptions.managers.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium uppercase tracking-wide text-slate-400">Estado</label>
          <select
            value={filters.status}
            onChange={handleFilterChange('status')}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          >
            {filterOptions.statuses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="mb-1 font-medium uppercase tracking-wide text-slate-400">Cliente</label>
          <select
            value={filters.client}
            onChange={handleFilterChange('client')}
            className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
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
          className="ml-auto inline-flex items-center rounded-2xl bg-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/20"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="glass-panel overflow-hidden rounded-3xl">
        <table className="w-full border-collapse text-sm text-slate-300">
          <thead>
            <tr className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              {['Proyecto', 'Tipo', 'Encargado', 'Estado', 'Inicio', 'Entrega', 'Cliente', 'Acciones'].map((header) => (
                <th key={header} className="px-6 py-4 text-left font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {searchFilteredProjects.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                  No hay proyectos para mostrar.
                </td>
              </tr>
            ) : (
              searchFilteredProjects.map((project, index) => {
                return (
                  <tr
                    key={project.id || index}
                    className="border-t border-white/5 transition-all duration-200 ease-[var(--ease-ios-out)] hover:-translate-y-0.5 hover:bg-white/10"
                    onClick={() => openModal(project)}
                  >
                    <td className="px-6 py-5 text-sm font-semibold text-slate-100">
                      {project.name || 'Sin título'}
                      <p className="text-xs font-normal text-slate-400">{project.description || 'Sin descripción'}</p>
                      <div className="mt-3">
                        {(() => {
                          const calendarioUrl = generarLinkGoogleCalendar({
                            contenido: project.name || 'Proyecto',
                            detalle: project.description || '',
                            fechaInicio: project.startDate || '',
                            fechaFin: project.deadline || '',
                            encargado: project.manager || '',
                            cliente: project.client || '',
                          });

                          const disabled = !calendarioUrl;

                          return (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                if (!calendarioUrl) return;
                                window.open(calendarioUrl, '_blank', 'noopener');
                              }}
                              disabled={disabled}
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition duration-200 ease-[var(--ease-ios-out)] ${
                                disabled
                                  ? 'cursor-not-allowed border border-white/5 bg-white/5 text-slate-500'
                                  : 'border border-cyan-400/40 bg-cyan-500/20 text-cyan-100 hover:border-cyan-300/60 hover:bg-cyan-500/30'
                              }`}
                            >
                              Agendar en Calendar
                            </button>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-5">{renderTypeBadge(project)}</td>
                    <td className="px-6 py-5 text-sm text-slate-300">{project.manager || 'Sin asignar'}</td>
                    <td className="px-6 py-5">{renderStatusBadge(project.status)}</td>
                    <td className="px-6 py-5 text-sm text-slate-300">{formatDate(project.startDate)}</td>
                    <td className="px-6 py-5 text-sm text-slate-300">{formatDate(project.deadline)}</td>
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
                          className="rounded-full bg-white/10 p-2 text-slate-100 transition hover:bg-white/20"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => handleDelete(project, event)}
                          className="rounded-full bg-red-500/20 p-2 text-red-200 transition hover:bg-red-500/30"
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
const renderTypeBadge = (project) => {
  const stage = (project.stage || project.properties?.stage || project.type || '')
    .toString()
    .trim()
    .toLowerCase();
  const label = stage === 'grabacion' ? 'Grabación' : stage === 'edicion' ? 'Edición' : project.type || 'Sin tipo';
  const className = typeStylesMap[stage] || typeStylesMap.default;
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${className}`}>
      {label}
    </span>
  );
};
