import { create } from 'zustand';
import { addDays, parseISO, isValid, format } from 'date-fns';
import { supabase } from '../config/supabase';
import { TEAM_MEMBERS } from '../constants/team';
import { generarTareasEdicionDesdeProyectos } from '../utils/editingTasks';
import { normalizeStatus, ALLOWED_STATUSES } from '../utils/statusHelpers';

const LOCAL_STORAGE_KEY = 'cerezo-projects';
const RETAINERS_KEY = 'cerezo-retainers';
const DEFAULT_ALLOWED_VIEWS = ['Dashboard', 'Table', 'Calendar', 'Timeline', 'Gallery', 'Finanzas'];
const FRANCISCO_EMAIL = 'francisco@carbonomkt.com';

const isFranciscoUser = (user) => user?.email?.toString().trim().toLowerCase() === FRANCISCO_EMAIL;

import { normalizeString } from '../utils/normalize';

const normalizeClientValue = (value) => normalizeString(value || '');

const filterProjectsForUser = (projects, user) => {
  if (!isFranciscoUser(user)) return projects;
  return projects.filter((project) => {
    const client = normalizeClientValue(
      project.client || project.cliente || project.properties?.client || project.properties?.cliente
    );
    return client === 'carbono';
  });
};

// status normalization handled by src/utils/statusHelpers

const normalizeManagers = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((manager) => (manager ? manager.toString().trim() : ''))
      .filter(Boolean);
  }
  if (!value) return [];
  return value
    .toString()
    .split(',')
    .map((manager) => manager.trim())
    .filter(Boolean);
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
  const managers = normalizeManagers(
    project.managers || project.manager || project.encargado || properties.managers
  );
  const rawStage = project.stage || properties.stage || '';
  const normalizedStage =
    rawStage && rawStage.toString().trim().length > 0
      ? rawStage.toString().trim().toLowerCase()
      : '';
  const registrationType =
    project.registrationType ||
    properties.registrationType ||
    project.type ||
    project.tipo ||
    '';
  const fechaGrabacion =
    project.fechaGrabacion ||
    project.fecha_grabacion ||
    project.fechaGrabación ||
    project.recordingDate ||
    project.recording_date ||
    project.properties?.fechaGrabacion ||
    project.properties?.fecha_grabacion ||
    null;
  const recordingTime = project.recordingTime || properties.recordingTime || '';
  const recordingLocation = project.recordingLocation || properties.recordingLocation || '';
  const recordingDescription =
    project.recordingDescription || properties.recordingDescription || project.detalle || project.description || '';

  return {
    ...project,
    startDate,
    deadline,
    status: normalizeStatus(project.status),
    manager: managers[0] || '',
    managers,
    type: registrationType || project.type || project.tipo || '',
    client: project.client || project.cliente || '',
    fechaGrabacion,
    resources,
    registrationType,
    stage: normalizedStage || (fechaGrabacion ? 'grabacion' : properties.stage || ''),
    recordingTime,
    recordingLocation,
    recordingDescription,
    properties: {
      ...properties,
      resources,
      managers,
      registrationType,
      stage: normalizedStage || properties.stage,
      recordingTime,
      recordingLocation,
      recordingDescription,
      fechaGrabacion,
    },
  };
};

const prepareProjectForSupabase = (project) => {
  const id = project.id || generateLocalId();

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
  const managers = normalizeManagers(
    project.managers || project.manager || project.encargado || project.properties?.managers
  );

  const recordingDate = normalizeDate(
    project.fechaGrabacion ||
      project.fecha_grabacion ||
      project.fechaGrabación ||
      project.recordingDate ||
      project.recording_date
  );
  const registrationType =
    (project.registrationType ||
      project.type ||
      project.properties?.registrationType ||
      '').toString().trim() || null;
  const stage =
    (project.stage || project.properties?.stage || '').toString().trim().toLowerCase() || null;
  const recordingTime =
    project.recordingTime || project.properties?.recordingTime || '';
  const recordingLocation =
    project.recordingLocation || project.properties?.recordingLocation || '';
  const recordingDescription =
    project.recordingDescription ||
    project.properties?.recordingDescription ||
    project.description ||
    '';
  const linkedRecordingId =
    project.linkedRecordingId || project.properties?.linkedRecordingId || null;

  const nextProperties = {
    ...(project.properties || {}),
    resources,
  };

  if (managers.length > 0) {
    nextProperties.managers = managers;
  } else if (Object.prototype.hasOwnProperty.call(nextProperties, 'managers')) {
    delete nextProperties.managers;
  }

  if (recordingDate) {
    nextProperties.fechaGrabacion = recordingDate;
  } else if (Object.prototype.hasOwnProperty.call(nextProperties, 'fechaGrabacion')) {
    delete nextProperties.fechaGrabacion;
  }

  if (registrationType) {
    nextProperties.registrationType = registrationType;
  } else if (Object.prototype.hasOwnProperty.call(nextProperties, 'registrationType')) {
    delete nextProperties.registrationType;
  }

  if (stage) {
    nextProperties.stage = stage;
  } else if (Object.prototype.hasOwnProperty.call(nextProperties, 'stage')) {
    delete nextProperties.stage;
  }

  if (recordingTime) {
    nextProperties.recordingTime = recordingTime;
  } else if (Object.prototype.hasOwnProperty.call(nextProperties, 'recordingTime')) {
    delete nextProperties.recordingTime;
  }

  if (recordingLocation) {
    nextProperties.recordingLocation = recordingLocation;
  } else if (Object.prototype.hasOwnProperty.call(nextProperties, 'recordingLocation')) {
    delete nextProperties.recordingLocation;
  }

  if (recordingDescription) {
    nextProperties.recordingDescription = recordingDescription;
  } else if (Object.prototype.hasOwnProperty.call(nextProperties, 'recordingDescription')) {
    delete nextProperties.recordingDescription;
  }

  if (linkedRecordingId) {
    nextProperties.linkedRecordingId = linkedRecordingId;
  } else if (Object.prototype.hasOwnProperty.call(nextProperties, 'linkedRecordingId')) {
    delete nextProperties.linkedRecordingId;
  }

  const baseProject = {
    ...project,
    id,
    manager: managers.join(', '),
    startDate: normalizeDate(project.startDate),
    deadline: normalizeDate(project.deadline),
    type: registrationType || project.type || null,
    notes: project.notes?.trim?.() ? project.notes.trim() : null,
    team: normalizeTeam(project.team),
    properties: nextProperties,
    resources,
  };

  if (Object.prototype.hasOwnProperty.call(baseProject, 'managers')) {
    delete baseProject.managers;
  }

  delete baseProject.fecha_grabacion;
  delete baseProject.fechaGrabacion;
  delete baseProject.fechaGrabación;
  delete baseProject.recordingDate;
  delete baseProject.recording_date;
  delete baseProject.stage;
  delete baseProject.registrationType;
  delete baseProject.recordingTime;
  delete baseProject.recordingLocation;
  delete baseProject.recordingDescription;
  delete baseProject.linkedRecordingId;

  return baseProject;
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

const readLocalRetainers = () => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(RETAINERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading local retainers:', error);
    return [];
  }
};

const persistLocalRetainers = (retainers) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RETAINERS_KEY, JSON.stringify(retainers));
  } catch (error) {
    console.error('Error persisting local retainers:', error);
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

const buildEditingTasks = (projects) => generarTareasEdicionDesdeProyectos(projects || []);

const parseDateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const stringValue = value.toString().trim();
  if (!stringValue) return null;
  let parsed = null;
  try {
    parsed = parseISO(stringValue.length <= 10 ? `${stringValue}T00:00:00` : stringValue);
    if (isValid(parsed)) return parsed;
  } catch (error) {
    // ignore and fallback
  }
  const fallback = new Date(stringValue);
  if (isValid(fallback)) return fallback;
  return null;
};

const formatDateOnly = (date) => {
  if (!date) return null;
  return format(date, 'yyyy-MM-dd');
};

const shouldGenerateEditingProject = (project) => {
  const stage = project?.stage || project?.properties?.stage || '';
  return stage.toString().trim().toLowerCase() === 'grabacion';
};

const getRegistrationType = (project) =>
  (project?.registrationType || project?.properties?.registrationType || project?.type || '')
    .toString()
    .trim()
    .toLowerCase();

const computeEditingDurationDays = (registrationType) => {
  const normalized = registrationType.toLowerCase();
  if (normalized === 'spot') return 2;
  if (['evento', 'contenido', 'lanzamiento'].includes(normalized)) return 1;
  return 1;
};

const createEditingProjectFromRecording = (project) => {
  if (!shouldGenerateEditingProject(project)) return null;
  const recordingDate = parseDateOnly(project.fechaGrabacion || project.startDate);
  if (!recordingDate) return null;

  const registrationType = getRegistrationType(project) || project.type || '';
  const managers = normalizeManagers(project.managers || project.manager);
  const startDate = addDays(recordingDate, 1);
  const durationDays = computeEditingDurationDays(registrationType || '');
  const endDate = addDays(startDate, Math.max(0, durationDays - 1));

  const resources = Array.isArray(project.properties?.resources)
    ? project.properties.resources.filter(Boolean)
    : Array.isArray(project.resources)
      ? project.resources.filter(Boolean)
      : [];

  return {
    name: project.name,
    client: project.client,
    manager: managers[0] || '',
    managers,
  status: 'Programado',
    type: 'edicion',
    registrationType,
    startDate: formatDateOnly(startDate),
    deadline: formatDateOnly(endDate),
    stage: 'edicion',
    linkedRecordingId: project.id,
    description: project.recordingDescription || project.description || '',
    properties: {
      stage: 'edicion',
      registrationType,
      linkedRecordingId: project.id,
      managers,
      resources,
    },
    resources,
  };
};

const hasGeneratedEditingProject = (projects, recordingId) => {
  if (!recordingId) return false;
  return projects.some((item) => {
    const stage = (item.stage || item.properties?.stage || '').toString().trim().toLowerCase();
    const linkedId = item.linkedRecordingId || item.properties?.linkedRecordingId || null;
    return stage === 'edicion' && linkedId === recordingId;
  });
};

const useStore = create((set, get) => ({
  projects: [],
  loading: true,
  error: null,
  retainers: [],
  currentUser: null,
  allowedViews: DEFAULT_ALLOWED_VIEWS,
  currentView: 'Dashboard',
  isModalOpen: false,
  selectedProject: null,
  teamMembers: TEAM_MEMBERS,
  searchTerm: '',
  sidebarOpen: false,
  editingTasks: [],

  lastUpdate: null, // Añadir para notificar actualizaciones en tiempo real
  setCurrentView: (view) =>
    set((state) => {
      const allowed = state.allowedViews || DEFAULT_ALLOWED_VIEWS;
      const nextView = allowed.includes(view) ? view : allowed[0] || state.currentView;
      return { currentView: nextView };
    }),
  openModal: (project) => set({ isModalOpen: true, selectedProject: project }),
  closeModal: () => set({ isModalOpen: false, selectedProject: null }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  openSidebar: () => set({ sidebarOpen: true }),
  closeSidebar: () => set({ sidebarOpen: false }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // Retainers (clientes fijos) helpers
  fetchFinancialData: async () => {
    const { fetchProjects, fetchRetainers } = get();
    // No establecer loading aquí para evitar parpadeos si los datos ya están cacheados.
    // Lo haremos dentro de las funciones si es necesario.
    set({ loading: true, error: null });
    try {
      // Ejecutar ambas cargas en paralelo para mayor eficiencia
      await Promise.all([fetchProjects(), fetchRetainers()]);
    } catch (error) {
      console.error("Error al cargar datos financieros:", error);
      set({ error: "No se pudieron cargar los datos financieros." });
    } finally {
      set({ loading: false });
    }
  },
  fetchRetainers: async () => {
    if (!supabaseClient) {
      const local = readLocalRetainers();
      set({ retainers: local });
      return local;
    }
    try {
      const { data, error } = await supabaseClient.from('retainers').select('*');
      if (error) throw error;
      const retainers = Array.isArray(data) ? data : [];
      persistLocalRetainers(retainers);
      set({ retainers });
      return retainers;
    } catch (err) {
      console.error('Error fetching retainers:', err);
      const local = readLocalRetainers(); // Fallback a local
      set({ retainers: local });
      return local;
    }
  },

  saveRetainer: async (retainer) => {
    // retainer must have at least client and monthly
    const next = { ...retainer };
    if (!supabaseClient) {
      set((state) => {
        const list = state.retainers || readLocalRetainers();
        const idx = list.findIndex((r) => (r.client || '').toString().trim().toLowerCase() === (next.client || '').toString().trim().toLowerCase());
        if (idx >= 0) list[idx] = { ...list[idx], ...next };
        else list.push(next);
        persistLocalRetainers(list);
        return { retainers: list };
      });
      return;
    }
    try {
      const payload = { ...next };
      // upsert by client
      const { data, error } = await supabaseClient.from('retainers').upsert(payload, { onConflict: 'client' }).select();
      if (error) throw error;
      const list = Array.isArray(data) ? data : [];
      persistLocalRetainers(list);
      set({ retainers: list });
    } catch (err) {
      console.error('Error saving retainer:', err);
    }
  },

  importRetainersFromProjects: async () => {
    // find projects that look like Carbono retainers and merge
    const projects = get().projects || [];
    const projectCandidates = projects.filter((p) => {
      const client = (p.client || p.properties?.client || '').toString().trim().toLowerCase();
      return client === 'carbono' || (p.properties && (p.properties.tag || '').toString().trim().toLowerCase() === 'carbono');
    });
    if (projectCandidates.length === 0) return [];
    const existing = get().retainers || readLocalRetainers();
    const merged = [...existing];
    projectCandidates.forEach((p) => {
      const clientName = p.client || p.properties?.client || 'Carbono';
      const idx = merged.findIndex((r) => (r.client || '').toString().trim().toLowerCase() === (clientName || '').toString().trim().toLowerCase());
      const entry = { client: clientName, monthly: 4000, startDate: '2024-01-01', endDate: '', tag: 'carbono' };
      if (idx >= 0) merged[idx] = { ...merged[idx], ...entry };
      else merged.push(entry);
    });
    persistLocalRetainers(merged);
    set({ retainers: merged });
    // try to push to supabase if available
    if (supabaseClient) {
      try {
        for (const r of merged) {
          await supabaseClient.from('retainers').upsert(r, { onConflict: 'client' });
        }
      } catch (err) {
        console.error('Error syncing retainers to supabase:', err);
      }
    }
    return merged;
  },

  fetchProjects: async () => {
    // Ya no gestiona el estado loading globalmente, lo hará la función contenedora.
    // set({ loading: true, error: null });

    if (!supabaseClient) {
      const localProjects = readLocalProjects();
      const filteredProjects = filterProjectsForUser(localProjects, get().currentUser);
      set({
        projects: filteredProjects,
        editingTasks: buildEditingTasks(filteredProjects),
        // loading: false,
      });
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
      persistLocalProjects(projects);
      const filteredProjects = filterProjectsForUser(projects, get().currentUser);
      set({ projects: filteredProjects, editingTasks: buildEditingTasks(filteredProjects) });
    } catch (error) {
      console.error('Error fetching projects:', error);
      const localProjects = readLocalProjects();
      const filteredProjects = filterProjectsForUser(localProjects, get().currentUser);
      set({
        error: 'Error fetching projects',
        projects: filteredProjects,
        editingTasks: buildEditingTasks(filteredProjects),
      });
    } // Se elimina el finally para que la función contenedora controle el loading.
    // finally {
    //   set({ loading: false });
    // }
  },

  addProject: async (project, options = {}) => {
    set({ loading: true, error: null });

    const { skipAutoEditingGeneration = false } = options;
    const isNewProject = !project?.id;
    const wantsAutoEditing =
      isNewProject && !skipAutoEditingGeneration && shouldGenerateEditingProject(project);

    if (!supabaseClient) {
      const baseId = project.id || generateLocalId();
      const newProject = normalizeProject({
        ...project,
        id: baseId,
        properties: project.properties || {},
        created_at: project.created_at || new Date().toISOString(),
      });

      set((state) => {
        const nextProjects = [...state.projects, newProject];
        if (wantsAutoEditing && !hasGeneratedEditingProject(nextProjects, newProject.id)) {
          const editingCandidate = createEditingProjectFromRecording(newProject);
          if (editingCandidate) {
            const editingProject = normalizeProject({
              ...editingCandidate,
              id: editingCandidate.id || generateLocalId(),
              properties: editingCandidate.properties || {},
              created_at: new Date().toISOString(),
            });
            nextProjects.push(editingProject);
          }
        }

        const projects = nextProjects.sort((a, b) => {
          const startA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const startB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return startB - startA;
        });
        persistLocalProjects(projects);
        const filteredProjects = filterProjectsForUser(projects, state.currentUser);
        return { projects: filteredProjects, editingTasks: buildEditingTasks(filteredProjects) };
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
          const nextProjects = [...state.projects, normalized];
          const projects = nextProjects.sort((a, b) => {
            const startA = a.startDate ? new Date(a.startDate).getTime() : 0;
            const startB = b.startDate ? new Date(b.startDate).getTime() : 0;
            return startB - startA;
          });
          persistLocalProjects(projects);
          const filteredProjects = filterProjectsForUser(projects, state.currentUser);
          return { projects: filteredProjects, editingTasks: buildEditingTasks(filteredProjects) };
        });

        if (wantsAutoEditing && !hasGeneratedEditingProject(get().projects, normalized.id)) {
          const editingPayload = createEditingProjectFromRecording(normalized);
          if (editingPayload) {
            await get().addProject(editingPayload, { skipAutoEditingGeneration: true });
          }
        }
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
        const filteredProjects = filterProjectsForUser(projects, state.currentUser);
        return { projects: filteredProjects, editingTasks: buildEditingTasks(filteredProjects) };
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
        const filteredProjects = filterProjectsForUser(projects, state.currentUser);
        return { projects: filteredProjects, editingTasks: buildEditingTasks(filteredProjects) };
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
        const filteredProjects = filterProjectsForUser(projects, state.currentUser);
        return { projects: filteredProjects, editingTasks: buildEditingTasks(filteredProjects) };
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
        const filteredProjects = filterProjectsForUser(projects, state.currentUser);
        return { projects: filteredProjects, editingTasks: buildEditingTasks(filteredProjects) };
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
    const filteredProjects = filterProjectsForUser(normalized, get().currentUser);
    set({ projects: filteredProjects, editingTasks: buildEditingTasks(filteredProjects) });
  },
  setCurrentUser: (user) =>
    set((state) => {
      const allowedViews = isFranciscoUser(user)
        ? ['Dashboard', 'Table', 'Calendar', 'Gallery']
        : DEFAULT_ALLOWED_VIEWS;
      const nextView = allowedViews.includes(state.currentView) ? state.currentView : allowedViews[0];
      const currentProjects = state.projects && state.projects.length > 0 ? state.projects : readLocalProjects();
      const filteredProjects = filterProjectsForUser(currentProjects, user);
      return {
        currentUser: user,
        allowedViews,
        currentView: nextView,
        projects: filteredProjects,
        editingTasks: buildEditingTasks(filteredProjects),
      };
    }),
}));

if (supabaseClient) {
  supabaseClient
    .channel('projects')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'projects' },
      (payload) => {
        console.log('Realtime: Nuevo proyecto recibido', payload.new);
        const { fetchProjects } = useStore.getState();
        fetchProjects(); // Vuelve a cargar todos para mantener la consistencia
        set({ lastUpdate: Date.now() });
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'projects' },
      (payload) => {
        console.log('Realtime: Proyecto actualizado', payload.new);
        const { fetchProjects } = useStore.getState();
        fetchProjects();
        set({ lastUpdate: Date.now() });
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'projects' },
      (payload) => {
        console.log('Realtime: Proyecto eliminado', payload.old.id);
        const { fetchProjects } = useStore.getState();
        fetchProjects();
        set({ lastUpdate: Date.now() });
      }
    )
    .on('postgres_changes', { event: '*', schema: 'public', table: 'retainers' }, () => {
        console.log('Realtime: Cambio en retainers detectado');
        useStore.getState().fetchRetainers();
        set({ lastUpdate: Date.now() });
      }
    )
    .subscribe();
}

export default useStore;
