import { create } from 'zustand';
import { toast } from 'react-hot-toast';
import { API } from '../config/api';
import { TEAM_MEMBERS } from '../constants/team';

const normalizeStatus = (status) => {
  if (!status) return 'Pendiente';
  const value = status.toString().trim().toLowerCase();
  if (['finalizado', 'finalizada', 'terminado', 'completado'].includes(value)) return 'Completado';
  if (['en curso', 'en progreso', 'progreso'].includes(value)) return 'En progreso';
  if (['revision', 'en revisión', 'en revision'].includes(value)) return 'En revisión';
  if (['cancelado', 'cancelada'].includes(value)) return 'Cancelado';
  if (value === 'pendiente') return 'Pendiente';
  return status;
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const tryParseJson = (value, fallback) => {
  if (Array.isArray(value) || typeof value === 'object') return value || fallback;
  if (typeof value !== 'string') return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch (error) {
    return fallback;
  }
};

const normalizeProject = (project) => {
  if (!project) return null;

  const id = project.id || project.ID || project.Id || project.Tr || `${Date.now()}`;
  const name = project.name || project.nombre || project.Contenido || '';
  const client = project.client || project.cliente || project.Cliente || '';
  const manager = project.manager || project.encargado || project.Encargado || '';
  const type = project.type || project.tipo || project.Tipo || '';
  const startDate =
    project.startDate ||
    project.fechaInicio ||
    project.start_date ||
    project.fecha_inicio ||
    project.FechaInicio ||
    null;
  const deadline =
    project.deadline ||
    project.fechaEntrega ||
    project.endDate ||
    project.end_date ||
    project.FechaFinalización ||
    project.FechaFinalizacion ||
    null;
  const status =
    project.status ||
    project.estado ||
    project.Estado ||
    project.State ||
    'Pendiente';
  const budget = toNumber(project.budget || project.presupuesto || project.Presupuesto);
  const team = toArray(project.team || project.colaboradores || project.Colaboradores);
  const comments = tryParseJson(project.comments || project.comentarios, []);
  const files = tryParseJson(project.files || project.archivos, []);
  const description =
    project.description || project.descripcion || project.Detalles || project.detalles || '';

  return {
    ...project,
    id: id.toString(),
    name,
    client,
    manager,
    type,
    startDate,
    deadline,
    status: normalizeStatus(status),
    budget,
    team,
    comments,
    files,
    description,
  };
};

const sortProjects = (projects) =>
  [...projects].sort((a, b) => {
    const startA = a.startDate ? new Date(a.startDate).getTime() : 0;
    const startB = b.startDate ? new Date(b.startDate).getTime() : 0;
    return startB - startA;
  });

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
};

const mapToApiPayload = (project) => {
  const normalizedTeam = toArray(project.team || project.colaboradores);
  const payload = {
    id: project.id,
    nombre: project.name || project.nombre || '',
    cliente: project.client || project.cliente || '',
    tipo: project.type || project.tipo || '',
    estado: project.status || project.estado || 'Pendiente',
    fechaInicio: project.startDate || project.fechaInicio || '',
    fechaEntrega: project.deadline || project.fechaEntrega || '',
    presupuesto: project.budget ?? project.presupuesto ?? null,
    encargado: project.manager || project.encargado || '',
    colaboradores: normalizedTeam,
    descripcion: project.description || project.descripcion || '',
    comentarios: tryParseJson(project.comments || project.comentarios, []),
    archivos: tryParseJson(project.files || project.archivos, []),
  };

  return payload;
};

const upsertProject = (projects, nextProject) => {
  const exists = projects.some((p) => p.id === nextProject.id);
  if (exists) {
    return projects.map((p) => (p.id === nextProject.id ? { ...p, ...nextProject } : p));
  }
  return [...projects, nextProject];
};

const normalizeSearchTerm = (value) => (value ? value.toString().trim().toLowerCase() : '');

const filterProjectsBySearch = (projects, term) => {
  const needle = normalizeSearchTerm(term);
  if (!needle) return projects;

  return projects.filter((project) => {
    const haystack = [
      project.name,
      project.client,
      project.manager,
      project.type,
      project.status,
      project.description,
      project.startDate,
      project.deadline,
    ];

    if (Array.isArray(project.team)) {
      haystack.push(...project.team);
    }

    return haystack
      .filter(Boolean)
      .some((value) => value.toString().toLowerCase().includes(needle));
  });
};

const useStore = create((set, get) => ({
  projects: [],
  allProjects: [],
  loading: true,
  error: null,
  currentView: 'Kanban',
  isModalOpen: false,
  selectedProject: null,
  teamMembers: TEAM_MEMBERS,
  searchTerm: '',

  setCurrentView: (view) => set({ currentView: view }),
  openModal: (project) => set({ isModalOpen: true, selectedProject: project }),
  closeModal: () => set({ isModalOpen: false, selectedProject: null }),

  setProjects: (projects) => {
    const normalized = projects
      .map(normalizeProject)
      .filter(Boolean);
    const sorted = sortProjects(normalized);
    const searchTerm = get().searchTerm;
    set({
      allProjects: sorted,
      projects: filterProjectsBySearch(sorted, searchTerm),
      error: null,
    });
  },

  setSearchTerm: (term) =>
    set((state) => ({
      searchTerm: term,
      projects: filterProjectsBySearch(state.allProjects, term),
    })),

  fetchProjects: async () => {
    set({ loading: true, error: null });

    try {
      const response = await API.obtenerProyectos();
      const rawProjects = Array.isArray(response) ? response : response?.data || [];
      const normalized = rawProjects.map(normalizeProject).filter(Boolean);
      const sorted = sortProjects(normalized);
      const searchTerm = get().searchTerm;
      set({
        allProjects: sorted,
        projects: filterProjectsBySearch(sorted, searchTerm),
        error: null,
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      const message = error.message || 'Error al cargar los proyectos';
      set({ error: message });
      toast.error(message);
    } finally {
      set({ loading: false });
    }
  },

  addProject: async (project) => {
    const trimmedName = project?.name?.trim();
    const trimmedClient = project?.client?.trim();

    if (!trimmedName || !trimmedClient) {
      const message = 'Nombre y cliente son obligatorios';
      toast.error(message);
      set({ error: message });
      return { success: false, error: message };
    }

    set({ loading: true, error: null });

    const id = project.id || generateId();
    const payload = mapToApiPayload({ ...project, id });

    try {
      const response = await API.crearProyecto(payload);
      const created = normalizeProject(response?.data || response || payload);
      set((state) => {
        const updatedAll = sortProjects(upsertProject(state.allProjects, created));
        return {
          allProjects: updatedAll,
          projects: filterProjectsBySearch(updatedAll, state.searchTerm),
          error: null,
        };
      });
      toast.success('Proyecto creado con éxito');
      return { success: true, data: created };
    } catch (error) {
      console.error('Error adding project:', error);
      const message = error.message || 'Error al crear el proyecto';
      set({ error: message });
      toast.error(message);
      return { success: false, error: message };
    } finally {
      set({ loading: false });
    }
  },

  updateProject: async (project) => {
    if (!project?.id) {
      const message = 'El proyecto no tiene un ID válido';
      toast.error(message);
      set({ error: message });
      return { success: false, error: message };
    }

    const trimmedName = project?.name?.trim();
    const trimmedClient = project?.client?.trim();

    if (!trimmedName || !trimmedClient) {
      const message = 'Nombre y cliente son obligatorios';
      toast.error(message);
      set({ error: message });
      return { success: false, error: message };
    }

    set({ loading: true, error: null });

    const payload = mapToApiPayload(project);

    try {
      const response = await API.actualizarProyecto(project.id, payload);
      const updated = normalizeProject(response?.data || response || payload);
      set((state) => {
        const updatedAll = sortProjects(upsertProject(state.allProjects, updated));
        return {
          allProjects: updatedAll,
          projects: filterProjectsBySearch(updatedAll, state.searchTerm),
          error: null,
        };
      });
      toast.success('Proyecto actualizado');
      return { success: true, data: updated };
    } catch (error) {
      console.error('Error updating project:', error);
      const message = error.message || 'Error al actualizar el proyecto';
      set({ error: message });
      toast.error(message);
      return { success: false, error: message };
    } finally {
      set({ loading: false });
    }
  },

  deleteProject: async (id) => {
    if (!id) {
      const message = 'ID de proyecto no proporcionado';
      toast.error(message);
      set({ error: message });
      return { success: false, error: message };
    }

    set({ loading: true, error: null });

    try {
      await API.eliminarProyecto(id);
      set((state) => {
        const remaining = state.allProjects.filter((project) => project.id !== id);
        const sorted = sortProjects(remaining);
        return {
          allProjects: sorted,
          projects: filterProjectsBySearch(sorted, state.searchTerm),
          error: null,
        };
      });
      toast.success('Proyecto eliminado');
      return { success: true };
    } catch (error) {
      console.error('Error deleting project:', error);
      const message = error.message || 'Error al eliminar el proyecto';
      set({ error: message });
      toast.error(message);
      return { success: false, error: message };
    } finally {
      set({ loading: false });
    }
  },
}));

export default useStore;
