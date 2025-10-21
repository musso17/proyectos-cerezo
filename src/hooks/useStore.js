import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { TEAM_MEMBERS } from '../constants/team';

const LOCAL_STORAGE_KEY = 'cerezo-projects';

const normalizeStatus = (status) => {
  if (!status) return 'Pendiente';
  const value = status.toString().trim().toLowerCase();
  if (value === 'finalizado' || value === 'finalizada' || value === 'terminado') return 'Completado';
  if (value === 'en curso' || value === 'en progreso' || value === 'progreso') return 'En progreso';
  if (value === 'revision' || value === 'en revisión') return 'En revisión';
  if (value === 'cancelado' || value === 'cancelada') return 'Cancelado';
  if (value === 'pendiente') return 'Pendiente';
  return status;
};

const normalizeProject = (project) => {
  if (!project) return project;
  const startDate = project.startDate || project.start_date || project.fecha_inicio || null;
  const deadline = project.deadline || project.endDate || project.end_date || project.fecha_entrega || null;
  const properties = project.properties || {};
  const resources = Array.isArray(project.resources)
    ? project.resources.filter(Boolean)
    : Array.isArray(properties.resources)
      ? properties.resources.filter(Boolean)
      : [];

  return {
    ...project,
    startDate,
    deadline,
    status: normalizeStatus(project.status),
    manager: project.manager || project.encargado || '',
    type: project.type || project.tipo || '',
    client: project.client || project.cliente || '',
    resources,
    properties: { ...properties, resources },
  };
};

const prepareProjectForSupabase = (project) => {
  const normalizeDate = (value) => {
    if (!value) return null;
    const trimmed = value.toString().trim();
    return trimmed.length === 0 ? null : trimmed;
  };

  const normalizeTeam = (team) => {
    if (Array.isArray(team)) return team;
    if (!team) return [];
    if (typeof team === 'string') {
      return team
        .split(',')
        .map((member) => member.trim())
        .filter(Boolean);
    }
    return [];
  };

  const resources = Array.isArray(project.resources)
    ? project.resources.filter(Boolean)
    : Array.isArray(project.properties?.resources)
      ? project.properties.resources.filter(Boolean)
      : [];

  return {
    ...project,
    startDate: normalizeDate(project.startDate),
    deadline: normalizeDate(project.deadline),
    notes: project.notes?.trim?.() ? project.notes.trim() : null,
    team: normalizeTeam(project.team),
    properties: {
      ...(project.properties || {}),
      resources,
    },
    resources,
  };
};

const readLocalProjects = () => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading local projects:', error);
    return [];
  }
};

const persistLocalProjects = (projects) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('Error persisting local projects:', error);
  }
};

const generateLocalId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
};

const supabaseClient = supabase;

const useStore = create((set) => ({
  projects: [],
  loading: true,
  error: null,
  currentView: 'Table',
  isModalOpen: false,
  selectedProject: null,
  teamMembers: TEAM_MEMBERS,
  searchTerm: '',
  sidebarOpen: false,

  setCurrentView: (view) => set({ currentView: view }),
  openModal: (project) => set({ isModalOpen: true, selectedProject: project }),
  closeModal: () => set({ isModalOpen: false, selectedProject: null }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  fetchProjects: async () => {
    set({ loading: true, error: null });

    if (!supabaseClient) {
      const localProjects = readLocalProjects();
      set({ projects: localProjects, loading: false });
      return;
    }

    try {
      const { data, error } = await supabaseClient.from('projects').select('*');

      if (error) throw error;

      const projects = (data || []).map(normalizeProject).sort((a, b) => {
        const startA = a.startDate || null;
        const startB = b.startDate || null;
        const tsA = startA ? new Date(startA).getTime() : 0;
        const tsB = startB ? new Date(startB).getTime() : 0;
        return tsB - tsA;
      });
      set({ projects });
      persistLocalProjects(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      const localProjects = readLocalProjects();
      set({
        error: 'Error fetching projects',
        projects: localProjects,
      });
    } finally {
      set({ loading: false });
    }
  },

  addProject: async (project) => {
    set({ loading: true, error: null });

    if (!supabaseClient) {
      const newProject = normalizeProject({
        ...project,
        id: project.id || generateLocalId(),
        properties: project.properties || {},
        created_at: project.created_at || new Date().toISOString(),
      });

      set((state) => {
        const projects = [...state.projects, newProject].sort((a, b) => {
          const startA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const startB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return startB - startA;
        });
        persistLocalProjects(projects);
        return { projects };
      });
      set({ loading: false });
      return;
    }

    try {
      const payload = prepareProjectForSupabase(project);
      const { data, error } = await supabaseClient.from('projects').insert([payload]).select();

      if (error) throw error;

      const inserted = Array.isArray(data) ? data[0] : data;

      if (inserted) {
        const normalized = normalizeProject(inserted);
        set((state) => {
          const projects = [...state.projects, normalized].sort((a, b) => {
            const startA = a.startDate ? new Date(a.startDate).getTime() : 0;
            const startB = b.startDate ? new Date(b.startDate).getTime() : 0;
            return startB - startA;
          });
          persistLocalProjects(projects);
          return { projects };
        });
      }
    } catch (error) {
      set({ error: 'Error adding project' });
      console.error('Error adding project:', error);
    } finally {
      set({ loading: false });
    }
  },

  updateProject: async (project) => {
    set({ loading: true, error: null });

    if (!supabaseClient) {
      set((state) => {
        const normalized = normalizeProject(project);
        const projects = state.projects
          .map((p) => (p.id === project.id ? { ...p, ...normalized } : p))
          .sort((a, b) => {
            const startA = a.startDate ? new Date(a.startDate).getTime() : 0;
            const startB = b.startDate ? new Date(b.startDate).getTime() : 0;
            return startB - startA;
          });
        persistLocalProjects(projects);
        return { projects };
      });
      set({ loading: false });
      return;
    }

    try {
      const payload = prepareProjectForSupabase(project);
      const { data, error } = await supabaseClient
        .from('projects')
        .update(payload)
        .eq('id', project.id)
        .select();

      if (error) throw error;

      const updated = Array.isArray(data) ? data[0] : data;

      const normalized = normalizeProject(updated || project);

      set((state) => {
        const projects = state.projects
          .map((p) => (p.id === normalized.id ? { ...p, ...normalized } : p))
          .sort((a, b) => {
            const startA = a.startDate ? new Date(a.startDate).getTime() : 0;
            const startB = b.startDate ? new Date(b.startDate).getTime() : 0;
            return startB - startA;
          });
        persistLocalProjects(projects);
        return { projects };
      });
    } catch (error) {
      set({ error: 'Error updating project' });
      console.error('Error updating project:', error);
    } finally {
      set({ loading: false });
    }
  },

  deleteProject: async (id) => {
    set({ loading: true, error: null });

    if (!supabaseClient) {
      set((state) => {
        const projects = state.projects.filter((p) => p.id !== id);
        persistLocalProjects(projects);
        return { projects };
      });
      set({ loading: false });
      return;
    }

    try {
      const { error } = await supabaseClient.from('projects').delete().eq('id', id);
      if (error) throw error;

      set((state) => {
        const projects = state.projects.filter((p) => p.id !== id);
        persistLocalProjects(projects);
        return { projects };
      });
    } catch (error) {
      set({ error: 'Error deleting project' });
      console.error('Error deleting project:', error);
    } finally {
      set({ loading: false });
    }
  },

  setProjects: (projects) => {
    const normalized = projects.map(normalizeProject).sort((a, b) => {
      const startA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const startB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return startB - startA;
    });
    persistLocalProjects(normalized);
    set({ projects: normalized });
  },
}));

if (supabaseClient) {
  supabaseClient
    .channel('projects')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'projects' },
      (payload) => {
        const { projects, setProjects } = useStore.getState();

        if (payload.eventType === 'INSERT') {
          const exists = projects.some((p) => p.id === payload.new.id);
          const updatedProjects = exists
            ? projects.map((p) => (p.id === payload.new.id ? payload.new : p))
            : [...projects, payload.new];
          setProjects(updatedProjects);
        } else if (payload.eventType === 'UPDATE') {
          const updatedProjects = projects.map((p) =>
            p.id === payload.new.id ? payload.new : p
          );
          setProjects(updatedProjects);
        } else if (payload.eventType === 'DELETE') {
          const updatedProjects = projects.filter((p) => p.id !== payload.old.id);
          setProjects(updatedProjects);
        }
      }
    )
    .subscribe();
}

export default useStore;
