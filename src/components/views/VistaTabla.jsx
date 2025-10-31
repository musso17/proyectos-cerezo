"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, Edit2, Trash2 } from 'lucide-react';
import useStore from '../../hooks/useStore';
import { filterProjects } from '../../utils/filterProjects';
import { getClientBadgeClass } from '../../utils/clientStyles';
import { generarLinkGoogleCalendar } from '../../utils/calendar';
import { getUIPreference, setUIPreference } from '../../utils/uiPreferences';

const statusStyles = {
  Programado: {
    badge: 'border-[#D1D5DB] bg-[#F4F5F7] text-secondary',
    dot: 'bg-[#9CA3AF]',
  },
  'En progreso': {
    badge: 'border-[#D9D6FF] bg-[#EEF1FF] text-[#6C63FF]',
    dot: 'bg-[#6C63FF]',
  },
  'En revisión': {
    badge: 'border-[#FFE0B0] bg-[#FFF4E6] text-[#C07A00]',
    dot: 'bg-[#FFB020]',
  },
  Completado: {
    badge: 'border-[#C8E6C9] bg-[#F1FAF3] text-[#2F9E44]',
    dot: 'bg-[#4CAF50]',
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
    className: 'border border-[#C7DAFF] bg-[#E7F1FF] text-[#4C8EF7]',
  },
  edicion: {
    label: 'Edición',
    className: 'border border-[#D9D6FF] bg-[#EEF1FF] text-[#6C63FF]',
  },
};

const getProjectTypeBadge = (project) => {
  if (!project) return { label: 'Sin tipo', className: 'bg-slate-700/50 text-secondary border border-[#E5E7EB]' };

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

  return {
    label: rawType || rawStage || 'Sin tipo',
    className: 'border border-[#D1D5DB] bg-[#F4F5F7] text-secondary',
  };
};

const isCompletedProject = (project) => {
  const status = project?.status || '';
  return status.toString().trim().toLowerCase() === 'completado';
};

const renderStatusBadge = (status) => {
  const key = status && statusStyles[status] ? status : 'Programado';
  const { badge, dot } = statusStyles[key] || statusStyles.Programado;
  const label = status || 'Programado';
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badge}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
};

const revisionDisplayConfig = {
  grabacion: {
    className: 'border-[#C7DAFF] bg-[#E7F1FF] text-[#4C8EF7]',
    label: 'Grabación',
  },
  edicion: {
    className: 'border-[#D9D6FF] bg-[#EEF1FF] text-[#6C63FF]',
    label: 'En edición',
  },
  revision: {
    className: 'border-[#FFE0B0] bg-[#FFF4E6] text-[#C07A00]',
    label: 'En revisión',
  },
  aprobado: {
    className: 'border-[#C8E6C9] bg-[#F1FAF3] text-[#2F9E44]',
    label: 'Aprobado',
  },
};

const getDisplayStatus = (project) => {
  const step = project?.revision?.currentStep || '';
  if (step === 'enviado' || step === 'esperando_feedback') return 'En revisión';
  if (step === 'editando' || step === 'corrigiendo') return 'En progreso';
  return project?.status || 'Programado';
};

const getRecordingDateValue = (project) => {
  const candidates = [
    project.recordingDate,
    project.fechaGrabacion,
    project.fecha_grabacion,
    project.fechaGrabación,
    project.properties?.fechaGrabacion,
    project.properties?.fecha_grabacion,
  ];
  const value = candidates.find((item) => item && item.toString().trim().length > 0);
  return value || '';
};

const isExpiredRecordingProject = (project) => {
  const stage = (project.stage || project.properties?.stage || '').toString().trim().toLowerCase();
  if (stage !== 'grabacion') return false;
  const rawDate = getRecordingDateValue(project);
  if (!rawDate) return false;
  const parsed = new Date(rawDate.length <= 10 ? `${rawDate}T00:00:00` : rawDate);
  if (Number.isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return parsed < today;
};

const renderRevisionBadge = (project) => {
  const revision = project?.revision;
  const step = revision?.currentStep;
  let config = null;
  if (step) {
    if (step === 'enviado' || step === 'esperando_feedback') {
      config = revisionDisplayConfig.revision;
    } else if (step === 'corrigiendo' || step === 'editando') {
      config = revisionDisplayConfig.edicion;
    } else if (step === 'aprobado') {
      config = revisionDisplayConfig.aprobado;
    }
  } else {
    const stage = (project.stage || project.properties?.stage || '').toString().trim().toLowerCase();
    if (stage === 'grabacion') {
      config = revisionDisplayConfig.grabacion;
    } else if (stage === 'edicion' || stage === 'postproduccion') {
      config = revisionDisplayConfig.edicion;
    }
  }

  if (!config) return null;
  const label = config.label || revision?.label || step;
  const cycleNumber = revision?.currentNumber || 1;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${config.className}`}
    >
      {revision?.totalCycles ? (
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary/70">
          Ciclo {cycleNumber}
        </span>
      ) : null}
      <span>{label}</span>
    </span>
  );
};

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

const VistaTabla = () => {
  const projects = useStore((state) => state.projects);
  const openModal = useStore((state) => state.openModal);
  const deleteProject = useStore((state) => state.deleteProject);
  const searchTerm = useStore((state) => state.searchTerm);

  const [filters, setFilters] = useState(() => buildInitialFilters());

  useEffect(() => {
    setUIPreference('tableFilters', filters);
  }, [filters]);

  const activeProjects = useMemo(
    () => projects.filter((project) => !isCompletedProject(project) && !isExpiredRecordingProject(project)),
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
      typeSet.add(getProjectTypeBadge(project).label);
      const managers = getProjectManagers(project);
      if (managers.length === 0) {
        managerSet.add('Sin asignar');
      } else {
        managers.forEach((manager) => managerSet.add(getLabel(manager, 'Sin asignar')));
      }
  statusSet.add(getLabel(project.status, 'Programado'));
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
      const typeLabel = getProjectTypeBadge(project).label;
  const statusLabel = getLabel(project.status, 'Programado');
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
    setFilters(() => ({ ...DEFAULT_TABLE_FILTERS }));
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
      <div className="glass-panel flex flex-wrap items-end gap-4 p-5 text-xs text-secondary">
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:gap-0">
          <label className="mb-1 font-semibold uppercase tracking-[0.26em] text-secondary/80">Tipo</label>
          <select
            value={filters.type}
            onChange={handleFilterChange('type')}
            className="rounded-xl border border-[#D1D5DB] bg-white px-4 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            {filterOptions.types.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:gap-0">
          <label className="mb-1 font-semibold uppercase tracking-[0.26em] text-secondary/80">Encargado</label>
          <select
            value={filters.manager}
            onChange={handleFilterChange('manager')}
            className="rounded-xl border border-[#D1D5DB] bg-white px-4 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            {filterOptions.managers.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:gap-0">
          <label className="mb-1 font-semibold uppercase tracking-[0.26em] text-secondary/80">Estado</label>
          <select
            value={filters.status}
            onChange={handleFilterChange('status')}
            className="rounded-xl border border-[#D1D5DB] bg-white px-4 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            {filterOptions.statuses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:gap-0">
          <label className="mb-1 font-semibold uppercase tracking-[0.26em] text-secondary/80">Cliente</label>
          <select
            value={filters.client}
            onChange={handleFilterChange('client')}
            className="rounded-xl border border-[#D1D5DB] bg-white px-4 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
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
          className="w-full rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition hover:shadow-sm sm:ml-auto sm:w-auto"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:hidden">
        {searchFilteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#CBD5F5] bg-[#F9FAFF] p-6 text-center text-sm text-secondary">
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
                className="space-y-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition hover:shadow-md"
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
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-secondary/70">
                          Inicio:{' '}
                          <span className="text-primary">{formatDate(project.startDate)}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-secondary/70">
                          Entrega:{' '}
                          <span className="text-primary">{formatDate(project.deadline)}</span>
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
                              ? 'cursor-not-allowed border border-[#E5E7EB] text-secondary'
                              : 'border border-accent/40 text-accent hover:bg-accent/10'
                          }`}
                          aria-label="Agendar en Calendar"
                        >
                          <CalendarIcon size={14} />
                        </button>
                      </div>
                    </div>
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2">
                      {renderStatusBadge(getDisplayStatus(project))}
                      {renderRevisionBadge(project)}
                    </div>
                  </div>
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
                    className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md"
                  >
                    Ver detalles
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDelete(project, event);
                    }}
                    className="w-full rounded-xl border border-[#F4C7C7] bg-[#FDECEC] px-4 py-3 text-sm font-semibold text-[#B91C1C] transition hover:shadow-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="glass-panel overflow-hidden">
        <table className="hidden w-full border-collapse text-sm text-secondary sm:table">
          <thead>
            <tr className="bg-[#F9FAFB] text-xs uppercase tracking-[0.26em] text-secondary/80">
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
                    className="border-t border-[#E5E7EB] transition-colors duration-150 ease-out hover:bg-[#F7F8FA]"
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
                    <td className="px-6 py-5">
                      {renderStatusBadge(getDisplayStatus(project))}
                    </td>
                    <td className="px-6 py-5 text-sm text-secondary">{formatDate(project.startDate)}</td>
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
                          className={`flex h-8 w-8 items-center justify-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-accent/30 ${
                            calendarDisabled
                              ? 'cursor-not-allowed border border-[#E5E7EB] text-secondary'
                              : 'border border-accent/40 text-accent hover:bg-accent/10'
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
                          className="rounded-full border border-[#D1D5DB] bg-white p-2 text-secondary transition hover:bg-[#EEF1F6] hover:text-accent"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => handleDelete(project, event)}
                          className="rounded-full border border-[#F4C7C7] bg-[#FDECEC] p-2 text-[#B91C1C] transition hover:shadow-sm"
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
