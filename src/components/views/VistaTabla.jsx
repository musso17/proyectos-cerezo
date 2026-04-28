"use client";

import React, { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Calendar as CalendarIcon, Edit2, Trash2, ChevronDown } from 'lucide-react';
import useStore from '../../hooks/useStore';
import { filterProjects } from '../../utils/filterProjects';
import { getClientBadgeClass } from '../../utils/clientStyles';
import { generarLinkGoogleCalendar } from '../../utils/calendar';
import { getUIPreference, setUIPreference } from '../../utils/uiPreferences';

const getLabel = (value, fallback) => {
  if (!value) return fallback;
  const trimmed = value.toString().trim();
  return trimmed.length === 0 ? fallback : trimmed;
};

const formatDate = (value) => {
  if (!value) return '—';
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  try {
    const str = value.toString().trim();
    let date;
    const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      date = new Date(str.length <= 10 ? `${str}T12:00:00` : str);
    } else {
      date = new Date(str);
    }
    
    if (Number.isNaN(date.getTime())) return str;
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    return `${day} ${month}`;
  } catch {
    return value;
  }
};


const TYPE_COLORS = {
  grabacion: '#FF4B2A',
  edicion: '#5F6468',
  fotografia: '#000000',
};

const TYPE_BADGES = {
  grabacion: { label: 'Grabación', color: '#FF4B2A' },
  edicion: { label: 'Edición', color: '#5F6468' },
  fotografia: { label: 'Fotografía', color: '#000000' },
};

const Avatar = ({ name }) => {
  if (!name) return null;
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-secondary dark:bg-white/5 dark:text-white/60">
        {initials}
      </div>
      <span className="text-xs font-medium text-secondary/80 dark:text-white/70">{formattedName}</span>
    </div>
  );
};

const getProjectTypeBadge = (project) => {
  if (!project) return { label: 'Sin tipo', color: '#94A3B8' };

  const rawStage = project.stage || project.properties?.stage || '';
  const rawType = project.type || project.properties?.registrationType || '';

  const normalizedStage = rawStage?.toString().trim().toLowerCase();
  const normalizedType = rawType?.toString().trim().toLowerCase();

  if (normalizedStage && TYPE_BADGES[normalizedStage]) {
    return TYPE_BADGES[normalizedStage];
  }
  if (normalizedStage === 'fotografía') return TYPE_BADGES.fotografia;

  if (normalizedType && TYPE_BADGES[normalizedType]) {
    return TYPE_BADGES[normalizedType];
  }
  if (normalizedType === 'fotografía') return TYPE_BADGES.fotografia;

  return {
    label: rawType || rawStage || 'Sin tipo',
    color: '#94A3B8',
  };
};


const isCompletedProject = (project) => {
  const status = project?.status || '';
  return status.toString().trim().toLowerCase() === 'completado';
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
  if (stage !== 'grabacion' && stage !== 'fotografia' && stage !== 'fotografía') return false;
  const rawDate = getRecordingDateValue(project);
  if (!rawDate) return false;
  const parsed = new Date(rawDate.length <= 10 ? `${rawDate}T00:00:00` : rawDate);
  if (Number.isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return parsed < today;
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

const StatusSelector = ({ project }) => {
  const updateProject = useStore((state) => state.updateProject);
  const [loading, setLoading] = useState(false);

  // Normalizar el estado actual a una de las opciones disponibles
  const currentStatus = useMemo(() => {
    const status = (project.status || '').toString().trim();
    if (status.toLowerCase() === 'completado') return 'Completado';

    // Si el proyecto tiene revisión, intentamos inferir el estado
    const step = project?.revision?.currentStep;
    if (step === 'enviado' || step === 'esperando_feedback') return 'En revisión';

    // Mapeo directo de estados
    if (status) return status;

    return 'Programado'; // Default
  }, [project]);

  const handleChange = async (e) => {
    const newValue = e.target.value;
    if (!newValue || newValue === currentStatus) return;

    if (loading) return;
    setLoading(true);

    try {
      const nextProperties = { ...(project.properties || {}) };

      const updatePayload = {
        ...project,
        id: project.id,
        status: newValue,
        properties: nextProperties,
      };

      if (newValue === 'Completado') {
        const now = new Date().toISOString();
        const completedState = 'entregado';

        // NOTE: We do NOT set completedAt on the root object because the column does not exist in Supabase.
        // It is sufficient to store it in the properties JSONB column.
        updatePayload.state = completedState;

        // Ensure consistency in properties
        nextProperties.completedAt = now;
        nextProperties.state = completedState;
        nextProperties.status = 'Completado';
      } else {
        // If moving OUT of completed, we should probably reset state?
        // For now, let's at least enforce the new status clearly
        nextProperties.status = newValue;
      }

      // Hack para dar feedback instantáneo antes de que el store se actualice
      await updateProject(updatePayload, { skipLoading: true });

    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDotColor = (status) => {
    switch (status) {
      case 'Programado': return 'bg-slate-300';
      case 'En progreso': return 'bg-[#FF4B2A]';
      case 'En edición': return 'bg-[#FF4B2A] shadow-[0_0_8px_rgba(255,75,42,0.4)]';
      case 'En revisión': return 'bg-[#5F6468]';
      case 'Completado': return 'bg-black dark:bg-white';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div
      className="group relative flex items-center gap-2.5 rounded-full border border-border/40 bg-white/50 px-4 py-2.5 transition-all hover:bg-white dark:border-white/5 dark:bg-white/[0.02]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`h-2 w-2 rounded-full ${getStatusDotColor(currentStatus)}`} />
      <span className="text-[11px] font-medium text-secondary/80 dark:text-white/60">{currentStatus}</span>
      
      <select
        value={currentStatus}
        onChange={handleChange}
        disabled={loading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
      >
        <option value="Programado">Programado</option>
        <option value="En progreso">En progreso</option>
        <option value="En edición">En edición</option>
        <option value="En revisión">En revisión</option>
        <option value="Completado">Completado</option>
      </select>

      <ChevronDown
        size={12}
        className="text-secondary/30 transition-transform group-hover:text-secondary/60"
      />
    </div>
  );
};

const VistaTabla = ({ projects: projectsProp }) => {
  const projectsFromStore = useStore((state) => state.projects);
  const projects = projectsProp !== undefined ? projectsProp : projectsFromStore;
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
    <div className="flex h-full flex-col gap-6 p-4 md:p-6 animate-fade-up">
      <div className="glass-panel grid items-end gap-6 p-8 rounded-[2rem] text-xs text-secondary sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <div className="flex flex-col gap-2">
          <label className="mb-1 font-semibold uppercase tracking-[0.2em] text-secondary/40">Tipo</label>
          <select
            value={filters.type}
            onChange={handleFilterChange('type')}
            className="w-full min-w-[160px] rounded-2xl border border-border bg-white px-5 py-3 text-sm font-medium text-primary focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 dark:border-white/5 dark:bg-[#0B0C10] dark:text-white"
          >
            {filterOptions.types.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="mb-1 font-semibold uppercase tracking-[0.2em] text-secondary/40">Encargado</label>
          <select
            value={filters.manager}
            onChange={handleFilterChange('manager')}
            className="w-full min-w-[160px] rounded-2xl border border-border bg-white px-5 py-3 text-sm font-medium text-primary focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 dark:border-white/5 dark:bg-[#0B0C10] dark:text-white"
          >
            {filterOptions.managers.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="mb-1 font-semibold uppercase tracking-[0.2em] text-secondary/40">Estado</label>
          <select
            value={filters.status}
            onChange={handleFilterChange('status')}
            className="w-full min-w-[160px] rounded-2xl border border-border bg-white px-5 py-3 text-sm font-medium text-primary focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 dark:border-white/5 dark:bg-[#0B0C10] dark:text-white"
          >
            {filterOptions.statuses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="mb-1 font-semibold uppercase tracking-[0.2em] text-secondary/40">Cliente</label>
          <select
            value={filters.client}
            onChange={handleFilterChange('client')}
            className="w-full min-w-[160px] rounded-2xl border border-border bg-white px-5 py-3 text-sm font-medium text-primary focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 dark:border-white/5 dark:bg-[#0B0C10] dark:text-white"
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
          className="w-full rounded-2xl bg-dark-bg px-8 py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-all hover:-translate-y-1 active:scale-95 sm:w-auto dark:bg-accent dark:text-dark-bg"
        >
          Limpiar
        </button>
      </div>

      <div className="glass-panel overflow-hidden rounded-[3rem] border border-border shadow-2xl">
        <div className="overflow-x-auto soft-scroll">
          <table className="w-full border-collapse text-sm text-secondary">
            <thead>
              <tr className="bg-slate-50/50 text-[11px] font-medium uppercase tracking-[0.25em] text-secondary/40 backdrop-blur-xl dark:bg-black/40">
                {['Proyecto', 'Encargado', 'Estado', 'Inicio', 'Entrega', 'Cliente', 'Acciones'].map((header) => (
                  <th key={header} className="px-8 py-6 text-left first:pl-12 last:pr-12">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 dark:divide-white/5">
              {searchFilteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <p className="text-xs font-medium text-secondary/50 uppercase tracking-wide">No se encontraron proyectos</p>
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
                      className="group transition-all duration-300 hover:bg-slate-50/80 dark:hover:bg-white/[0.02]"
                      onClick={() => openModal(project)}
                    >
                      <td className="px-8 py-10 first:pl-12">
                        <div className="flex gap-4">
                          <div 
                            className="w-1 rounded-full shrink-0" 
                            style={{ backgroundColor: TYPE_COLORS[(project.stage || project.properties?.stage || 'edicion').toLowerCase()] || '#5F6468' }} 
                          />
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[15px] font-semibold text-primary tracking-tight dark:text-white group-hover:text-accent transition-colors">
                              {project.name || 'Sin título'}
                            </span>
                            <span className="font-mono text-[9px] uppercase tracking-wider text-secondary/40">
                              {getProjectTypeBadge(project).label}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-10">
                        <div className="flex flex-col gap-2">
                          {getProjectManagers(project).map((m, i) => (
                            <Avatar key={i} name={m} />
                          ))}
                          {getProjectManagers(project).length === 0 && (
                            <span className="text-xs text-secondary/30 italic">Sin asignar</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-10">
                        <StatusSelector project={project} />
                      </td>
                      <td className="px-8 py-10 text-xs font-medium text-secondary/70 dark:text-white/50">
                        {formatDate(project.startDate)}
                      </td>
                      <td className="px-8 py-10 text-xs font-medium text-secondary/70 dark:text-white/50">
                        {formatDate(project.deadline)}
                      </td>
                      <td className="px-8 py-10">
                        {(() => {
                          const clientLabel = project.client || 'Sin cliente';
                          return <span className="text-xs font-semibold tracking-tight text-primary dark:text-white/80">{clientLabel}</span>;
                        })()}
                      </td>
                      <td className="px-8 py-10 last:pr-12">
                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(event) => handleEdit(project, event)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80 text-secondary transition-all hover:scale-110 hover:bg-dark-bg hover:text-white active:scale-95 dark:bg-white/5 dark:text-white/50 dark:hover:bg-accent dark:hover:text-dark-bg"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => handleDelete(project, event)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50/80 text-red-500 transition-all hover:scale-110 hover:bg-red-500 hover:text-white active:scale-95 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white"
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
