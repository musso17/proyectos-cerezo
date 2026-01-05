import { create } from 'zustand';
import { addDays, parseISO, isValid, format, differenceInCalendarDays, startOfDay } from 'date-fns';
import { supabase } from '../config/supabase';
import { persist } from 'zustand/middleware';
import { TEAM_MEMBERS } from '../constants/team';
import { generarTareasEdicionDesdeProyectos } from '../utils/editingTasks';
import { normalizeStatus, ALLOWED_STATUSES } from '../utils/statusHelpers';

const LOCAL_STORAGE_KEY = 'cerezo-projects';
const RETAINERS_KEY = 'cerezo-retainers';
const DEFAULT_ALLOWED_VIEWS = ['Table', 'Calendar', 'Timeline', 'Gallery'];
const AGENT_STORAGE_KEY = 'cerezo-agent-state';
const FRANCISCO_EMAIL = 'francisco@carbonomkt.com';
const CEO_EMAIL = 'hola@cerezoperu.com';
const THEME_STORAGE_KEY = 'cerezo-theme';

const isFranciscoUser = (user) => user?.email?.toString().trim().toLowerCase() === FRANCISCO_EMAIL;
const isCeoUser = (user) => user?.email?.toString().trim().toLowerCase() === CEO_EMAIL;

import { normalizeString } from '../utils/normalize';

const normalizeClientValue = (value) => normalizeString(value || '');

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

const REVISION_STEPS = ['editando', 'enviado', 'esperando_feedback', 'corrigiendo', 'aprobado'];

const getSafeRevisionStep = (value, { sentAt, clientReturnedAt, approved } = {}) => {
  const normalized = (value || '').toString().trim().toLowerCase();
  if (REVISION_STEPS.includes(normalized)) {
    return normalized;
  }
  if (approved) return 'aprobado';
  if (clientReturnedAt) return 'corrigiendo';
  if (sentAt) return 'esperando_feedback';
  return 'editando';
};

const REVISION_STEP_LABELS = {
  editando: 'Editando',
  enviado: 'Enviado',
  esperando_feedback: 'Esperando feedback',
  corrigiendo: 'Corrigiendo',
  aprobado: 'Aprobado',
};

const applyThemeToDocument = (theme) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }
  const prefersDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

const deriveStatusFromState = (state) => {
  const normalized = (state || '').toString().trim().toLowerCase();
  if (normalized === 'entregado') return 'Completado';
  if (normalized === 'revision') return 'En revisión';
  if (normalized === 'postproduccion' || normalized === 'grabacion') return 'En progreso';
  return 'Programado';
};

const recordRevisionEventLocally = (set, projectId, event) => {
  set((state) => {
    const current = state.revisionHistory?.[projectId] || [];
    const next = sortRevisionEvents([...current, normalizeRevisionEvent(event)]);
    return {
      revisionHistory: {
        ...state.revisionHistory,
        [projectId]: next,
      },
    };
  });
};

const normalizeRevisionEvent = (event) => {
  if (!event) return event;
  const occurredAt = event.occurred_at || event.occurredAt || event.created_at || event.createdAt || new Date().toISOString();
  return {
    ...event,
    occurred_at: occurredAt,
    occurredAt,
    from_status: event.from_status || event.fromStatus || null,
    to_status: event.to_status || event.toStatus || null,
  };
};

const sortRevisionEvents = (events = []) =>
  [...events].sort((a, b) => new Date(a.occurred_at || 0) - new Date(b.occurred_at || 0));

const summarizeRevisionCycles = (cycles = []) => {
  if (!cycles || cycles.length === 0) {
    return {
      totalCycles: 0,
      currentNumber: 1,
      currentStep: null,
      pendingReview: false,
      lastSentAt: null,
      lastFeedbackAt: null,
      approvedCycles: 0,
      averageReviewDays: null,
      lastCycleChange: null,
    };
  }

  const sorted = [...cycles].sort((a, b) => {
    const numberA = Number(a.number) || 0;
    const numberB = Number(b.number) || 0;
    if (numberA !== numberB) return numberA - numberB;
    const createdA = new Date(a.started_at || a.created_at || 0).getTime();
    const createdB = new Date(b.started_at || b.created_at || 0).getTime();
    return createdA - createdB;
  });
  const current = sorted[sorted.length - 1] || null;
  const totalCycles = sorted.length;

  let reviewSamples = 0;
  let reviewDaysAccumulator = 0;

  sorted.forEach((cycle) => {
    if (cycle.sent_at && cycle.client_returned_at) {
      const start = new Date(cycle.sent_at);
      const end = new Date(cycle.client_returned_at);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
        reviewDaysAccumulator += differenceInCalendarDays(end, start) || 0;
        reviewSamples += 1;
      }
    }
  });

  const averageReviewDays =
    reviewSamples > 0 ? Number((reviewDaysAccumulator / reviewSamples).toFixed(1)) : null;

  const lastSentAt = current?.sent_at || null;
  const lastFeedbackAt = current?.client_returned_at || null;

  const lastCycleChangeCandidate = [current?.client_returned_at, current?.sent_at, current?.started_at]
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return {
    totalCycles,
    currentNumber: Number(current?.number) || 1,
    currentStep: current?.status || null,
    pendingReview: current ? ['enviado', 'esperando_feedback'].includes(current.status) : false,
    lastSentAt,
    lastFeedbackAt,
    approvedCycles: sorted.filter((cycle) => cycle.approved).length,
    averageReviewDays,
    lastCycleChange: lastCycleChangeCandidate ? lastCycleChangeCandidate.toISOString() : null,
    label: current ? REVISION_STEP_LABELS[current.status] || current.status : null,
  };
};

const applyRevisionMetaToProjects = (projects = [], revisionMap = {}) =>
  (projects || []).map((project) => {
    const cycles = revisionMap?.[project.id] || [];
    const revision = summarizeRevisionCycles(cycles);
    const nextProject = {
      ...project,
      revision,
    };

    const normalizedStatus = (project.status || '').toString().trim().toLowerCase();
    const stage = (project.stage || project.properties?.stage || '').toString().trim().toLowerCase();
    const step = revision.currentStep || '';
    const startDate = parseDateOnly(project.startDate);
    const recordingDate = parseDateOnly(
      project.recordingDate ||
      project.fechaGrabacion ||
      project.properties?.fechaGrabacion
    );
    const effectiveStart = startDate || recordingDate;
    const today = startOfDay(new Date());

    let derivedStatus = project.status;
    if (step === 'enviado' || step === 'esperando_feedback') {
      derivedStatus = 'En revisión';
    } else if (step === 'corrigiendo' || step === 'editando') {
      derivedStatus = 'En progreso';
    } else if (
      (stage === 'edicion' || stage === 'grabacion') &&
      effectiveStart &&
      effectiveStart <= today &&
      normalizedStatus === 'programado'
    ) {
      derivedStatus = 'En progreso';
    }

    if (derivedStatus && derivedStatus !== project.status) {
      nextProject.status = derivedStatus;
    }

    return nextProject;
  });

const normalizeProject = (project) => {
  if (!project) return project;
  const startDate = project.startDate || project.start_date || project.fecha_inicio || null;
  const deadline =
    project.deadline ||
    project.endDate ||
    project.end_date ||
    project.fecha_entrega ||
    project.properties?.deadline ||
    project.properties?.fecha_entrega ||
    null;
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
  const rawState = project.state || properties.state || '';
  const normalizedState =
    rawState && rawState.toString().trim().length > 0
      ? rawState.toString().trim().toLowerCase()
      : '';
  const currentCycleRaw =
    project.current_cycle ??
    project.currentCycle ??
    properties.current_cycle ??
    properties.currentCycle ??
    1;
  const currentCycle =
    Number.isFinite(Number(currentCycleRaw)) && Number(currentCycleRaw) > 0
      ? Number(currentCycleRaw)
      : 1;
  const deliverableLink =
    project.deliverableLink ||
    properties.deliverableLink ||
    properties.deliverable_link ||
    null;

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
    deliverableLink,
    state: normalizedState || 'postproduccion',
    current_cycle: currentCycle,
    currentCycle,
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
      state: normalizedState || properties.state || 'postproduccion',
      current_cycle: currentCycle,
      currentCycle,
      deadline,
      fecha_entrega: deadline,
      deliverableLink,
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
  const resolvedState =
    project.state ??
    project.properties?.state ??
    (project.stage || project.properties?.stage) ??
    null;
  const stateValue =
    resolvedState && resolvedState.toString().trim().length > 0
      ? resolvedState.toString().trim().toLowerCase()
      : 'postproduccion';
  const currentCycleSource =
    project.current_cycle ??
    project.currentCycle ??
    project.properties?.current_cycle ??
    project.properties?.currentCycle ??
    1;
  const currentCycle =
    Number.isFinite(Number(currentCycleSource)) && Number(currentCycleSource) > 0
      ? Number(currentCycleSource)
      : 1;

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

  const normalizedDeadline = normalizeDate(project.deadline || project.endDate || project.end_date || project.fecha_entrega);
  if (normalizedDeadline) {
    nextProperties.deadline = normalizedDeadline;
    nextProperties.fecha_entrega = normalizedDeadline;
  } else {
    if (Object.prototype.hasOwnProperty.call(nextProperties, 'deadline')) {
      delete nextProperties.deadline;
    }
    if (Object.prototype.hasOwnProperty.call(nextProperties, 'fecha_entrega')) {
      delete nextProperties.fecha_entrega;
    }
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

  if (stateValue) {
    nextProperties.state = stateValue;
  } else if (Object.prototype.hasOwnProperty.call(nextProperties, 'state')) {
    delete nextProperties.state;
  }

  if (currentCycle) {
    nextProperties.current_cycle = currentCycle;
    nextProperties.currentCycle = currentCycle;
  } else {
    if (Object.prototype.hasOwnProperty.call(nextProperties, 'current_cycle')) {
      delete nextProperties.current_cycle;
    }
    if (Object.prototype.hasOwnProperty.call(nextProperties, 'currentCycle')) {
      delete nextProperties.currentCycle;
    }
  }

  const deliverableLink =
    project.deliverableLink ||
    project.properties?.deliverableLink ||
    project.properties?.deliverable_link ||
    null;
  if (deliverableLink) {
    nextProperties.deliverableLink = deliverableLink;
  } else {
    if (Object.prototype.hasOwnProperty.call(nextProperties, 'deliverableLink')) {
      delete nextProperties.deliverableLink;
    }
  }

  const baseProject = {
    ...project,
    id,
    manager: managers.join(', '),
    startDate: normalizeDate(project.startDate),
    deadline: normalizedDeadline,
    type: registrationType || project.type || null,
    notes: project.notes?.trim?.() ? project.notes.trim() : null,
    team: normalizeTeam(project.team),
    properties: nextProperties,
    resources,
    income: project.income,
    state: stateValue || 'postproduccion',
    current_cycle: currentCycle,
  };

  if (Object.prototype.hasOwnProperty.call(baseProject, 'managers')) {
    delete baseProject.managers;
  }

  if (Object.prototype.hasOwnProperty.call(baseProject, 'deliverableLink')) {
    delete baseProject.deliverableLink;
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
  delete baseProject.currentCycle;
  delete baseProject.revision; // Eliminar el campo virtual de revisión

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

const filterProjectsForUser = (projects, user) => {
  if (typeof window === 'undefined') {
    return projects || [];
  }
  const existingFilter = window.__cerezoFilterProjectsForUser;
  if (typeof existingFilter === 'function') {
    try {
      return existingFilter(projects, user);
    } catch (error) {
      console.error('Error applying global project filter:', error);
    }
  }
  return projects || [];
};

const buildProjectsStateSnapshot = (state, projects, revisionCycles = state.revisionCycles) => {
  const filteredProjects = filterProjectsForUser(projects || [], state.currentUser);
  const enrichedProjects = applyRevisionMetaToProjects(filteredProjects, revisionCycles || {});
  return {
    projects: enrichedProjects,
    editingTasks: buildEditingTasks(enrichedProjects),
    currentView: state.currentView,
  };
};

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

const normalizeRevisionCycle = (cycle) => {
  if (!cycle) return cycle;
  const sentAt = cycle.sent_at || cycle.sentAt || null;
  const clientReturnedAt = cycle.client_returned_at || cycle.clientReturnedAt || null;
  const approved = Boolean(cycle.approved);
  const status = getSafeRevisionStep(cycle.status, {
    sentAt,
    clientReturnedAt,
    approved,
  });
  return {
    ...cycle,
    status,
    step: status,
    sent_at: sentAt,
    client_returned_at: clientReturnedAt,
    approved,
  };
};

const sortRevisionCycles = (cycles = []) =>
  [...cycles].sort((a, b) => {
    const numberA = Number(a.number) || 0;
    const numberB = Number(b.number) || 0;
    if (numberA !== numberB) return numberA - numberB;
    const createdA = new Date(a.started_at || a.created_at || 0).getTime();
    const createdB = new Date(b.started_at || b.created_at || 0).getTime();
    return createdA - createdB;
  });

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
      state: 'postproduccion',
      registrationType,
      linkedRecordingId: project.id,
      managers,
      resources,
    },
    state: 'postproduccion',
    current_cycle: 1,
    currentCycle: 1,
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

const readLocalAgentState = () => {
  if (typeof window === 'undefined') return { lastRunAt: null, summary: '', suggestions: [] };
  try {
    const stored = window.localStorage.getItem(AGENT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : { lastRunAt: null, summary: '', suggestions: [] };
  } catch (error) {
    return { lastRunAt: null, summary: '', suggestions: [] };
  }
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
  isSidebarOpen: false, // Estado para el sidebar móvil
  revisionCycles: {},
  revisionCyclesLoading: {},
  revisionCyclesError: null,
  revisionHistory: {},
  revisionHistoryLoading: {},
  revisionHistoryError: null,
  theme: getInitialTheme(),

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
  closeSidebar: () => set({ sidebarOpen: false, isSidebarOpen: false }), // Cierra ambos
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleMobileSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  initializeTheme: () => {
    const theme = getInitialTheme();
    applyThemeToDocument(theme);
    set({ theme });
  },
  setTheme: (theme) => {
    applyThemeToDocument(theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      applyThemeToDocument(nextTheme);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      }
      return { theme: nextTheme };
    }),

  // Retainers (clientes fijos) helpers
  // ACCIÓN ORQUESTADORA PARA VISTA FINANZAS
  fetchFinancialData: async () => {
    // Esta función es la ÚNICA responsable de su ciclo de carga.
    const { _fetchProjects, _fetchRetainers } = get();
    set({ loading: true, error: null });
    try {
      // Ejecutar ambas cargas en paralelo para mayor eficiencia
      await Promise.all([_fetchProjects(), _fetchRetainers()]);
    } catch (error) {
      console.error("Error al cargar datos financieros:", error);
      set({ error: "No se pudieron cargar los datos financieros.", loading: false });
    } finally {
      // Se asegura de que loading sea false solo cuando AMBAS promesas terminan.
      set({ loading: false });
    }
  },

  // FUNCIÓN INTERNA: Solo obtiene datos, no gestiona 'loading'.
  _fetchRetainers: async () => {
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

  // DEPRECATED: Se mantiene por si alguna parte del código aún la usa, pero ahora llama a la interna.
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

  saveRetainer: async (retainer) => { // saveRetainer no necesita gestionar loading
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
      // La suscripción en tiempo real se encargará de actualizar el estado.
      // Para una respuesta más inmediata, podemos llamar a _fetchRetainers.
      const { _fetchRetainers } = get();
      await _fetchRetainers();
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
      const entry = { client: clientName, monthly: 4000, proyectosMensuales: 6, startDate: '2024-01-01', endDate: '', tag: 'carbono' };
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

  // Revision cycles helpers
  fetchRevisionCycles: async (projectId) => {
    if (!projectId) return [];

    set((state) => ({
      revisionCyclesLoading: {
        ...state.revisionCyclesLoading,
        [projectId]: true,
      },
      revisionCyclesError: null,
    }));

    const finalize = () =>
      set((state) => ({
        revisionCyclesLoading: {
          ...state.revisionCyclesLoading,
          [projectId]: false,
        },
      }));

    if (!supabaseClient) {
      const localCycles = sortRevisionCycles(
        (get().revisionCycles?.[projectId] || []).map(normalizeRevisionCycle)
      );
      set((state) => {
        const nextRevisionCycles = {
          ...state.revisionCycles,
          [projectId]: localCycles,
        };
        return {
          revisionCycles: nextRevisionCycles,
          ...buildProjectsStateSnapshot(state, state.projects, nextRevisionCycles),
        };
      });
      finalize();
      return localCycles;
    }

    try {
      const { data, error } = await supabaseClient
        .from('revision_cycles')
        .select('*')
        .eq('project_id', projectId)
        .order('number', { ascending: true });

      if (error) throw error;

      const normalized = sortRevisionCycles((data || []).map(normalizeRevisionCycle));

      set((state) => {
        const nextRevisionCycles = {
          ...state.revisionCycles,
          [projectId]: normalized,
        };
        return {
          revisionCycles: nextRevisionCycles,
          ...buildProjectsStateSnapshot(state, state.projects, nextRevisionCycles),
        };
      });

      await get().fetchRevisionHistory(projectId);
      return normalized;
    } catch (error) {
      console.error('Error fetching revision cycles:', error);
      set({ revisionCyclesError: error.message || 'Error fetching revision cycles' });
      throw error;
    } finally {
      finalize();
    }
  },

  fetchRevisionHistory: async (projectId) => {
    if (!projectId) return [];

    set((state) => ({
      revisionHistoryLoading: {
        ...state.revisionHistoryLoading,
        [projectId]: true,
      },
      revisionHistoryError: null,
    }));

    const stop = () =>
      set((state) => ({
        revisionHistoryLoading: {
          ...state.revisionHistoryLoading,
          [projectId]: false,
        },
      }));

    if (!supabaseClient) {
      const localEvents = sortRevisionEvents(
        (get().revisionHistory?.[projectId] || []).map(normalizeRevisionEvent)
      );
      set((state) => ({
        revisionHistory: {
          ...state.revisionHistory,
          [projectId]: localEvents,
        },
      }));
      stop();
      return localEvents;
    }

    try {
      const { data, error } = await supabaseClient
        .from('revision_cycle_events')
        .select('*')
        .eq('project_id', projectId)
        .order('occurred_at', { ascending: true });

      if (error) throw error;

      const normalized = sortRevisionEvents((data || []).map(normalizeRevisionEvent));
      set((state) => ({
        revisionHistory: {
          ...state.revisionHistory,
          [projectId]: normalized,
        },
      }));
      return normalized;
    } catch (error) {
      console.error('Error fetching revision history:', error);
      set({ revisionHistoryError: error.message || 'Error fetching revision history' });
      throw error;
    } finally {
      stop();
    }
  },

  createRevisionCycle: async (projectId, options = {}) => {
    if (!projectId) return null;
    const { number, status = 'editando', notes = null } = options;
    const project = get().projects.find((p) => p.id === projectId);
    const baseCycleNumber =
      number ??
      (project?.current_cycle || project?.currentCycle || 1);

    const payload = {
      project_id: projectId,
      number: baseCycleNumber,
      status: getSafeRevisionStep(status),
      notes,
    };

    if (!supabaseClient) {
      const now = new Date().toISOString();
      const localCycle = normalizeRevisionCycle({
        id: generateLocalId(),
        ...payload,
        started_at: now,
      });
      set((state) => {
        const nextRevisionCycles = {
          ...state.revisionCycles,
          [projectId]: sortRevisionCycles([
            ...(state.revisionCycles?.[projectId] || []),
            localCycle,
          ]),
        };
        return {
          revisionCycles: nextRevisionCycles,
          ...buildProjectsStateSnapshot(state, state.projects, nextRevisionCycles),
        };
      });
      recordRevisionEventLocally(set, projectId, {
        project_id: projectId,
        cycle_id: localCycle.id,
        from_status: null,
        to_status: localCycle.status,
        occurred_at: new Date().toISOString(),
      });
      return localCycle;
    }

    try {
      const { data, error } = await supabaseClient
        .from('revision_cycles')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      const inserted = normalizeRevisionCycle(data);
      await supabaseClient
        .from('revision_cycle_events')
        .insert({
          project_id: projectId,
          cycle_id: inserted.id,
          from_status: null,
          to_status: inserted.status,
          occurred_at: new Date().toISOString(),
        });
      await get().fetchRevisionCycles(projectId);

      return inserted;
    } catch (error) {
      console.error('Error creating revision cycle:', error);
      throw error;
    }
  },

  moveRevisionCycleToStep: async (projectId, cycleId, step) => {
    if (!projectId || !cycleId) return null;
    const targetStep = getSafeRevisionStep(step);
    if (targetStep === 'aprobado') {
      await get().markCycleApproved(projectId, cycleId);
      return 'aprobado';
    }

    const now = new Date().toISOString();
    const cycles = get().revisionCycles?.[projectId] || [];
    const existingCycle =
      cycles.find((cycle) => cycle.id === cycleId) ||
      (await (async () => {
        if (!supabaseClient) return null;
        try {
          const { data } = await supabaseClient
            .from('revision_cycles')
            .select('*')
            .eq('id', cycleId)
            .limit(1)
            .maybeSingle();
          return data ? normalizeRevisionCycle(data) : null;
        } catch (error) {
          console.error('Error loading revision cycle', error);
          return null;
        }
      })());

    const cycleNumber = existingCycle?.number || 1;

    const updates = { status: targetStep };
    let deadlineOffset = null;
    let projectState = null;


    switch (targetStep) {
      case 'editando':
        updates.sent_at = null;
        updates.client_returned_at = null;
        updates.approved = false;
        deadlineOffset = null;
        projectState = 'postproduccion';
        break;
      case 'enviado':
        updates.sent_at = now;
        updates.client_returned_at = null;
        updates.approved = false;
        deadlineOffset = 1;
        projectState = 'revision';
        break;
      case 'esperando_feedback':
        updates.client_returned_at = null;
        updates.approved = false;
        deadlineOffset = null;
        projectState = 'revision';
        break;
      case 'corrigiendo':
        updates.client_returned_at = now;
        updates.approved = false;
        deadlineOffset = 2;
        projectState = 'postproduccion';
        break;
      default:
        break;
    }

    const eventPayload = {
      project_id: projectId,
      cycle_id: cycleId,
      from_status: existingCycle?.status || null,
      to_status: targetStep,
      occurred_at: now,
    };

    if (!supabaseClient) {
      set((state) => {
        const list = state.revisionCycles?.[projectId] || [];
        const updated = list.map((cycle) => {
          if (cycle.id !== cycleId) return cycle;
          const nextCycle = {
            ...cycle,
            status: targetStep,
            step: targetStep,
            sent_at:
              targetStep === 'editando'
                ? null
                : targetStep === 'enviado'
                  ? now
                  : cycle.sent_at,
            client_returned_at:
              targetStep === 'corrigiendo'
                ? now
                : ['editando', 'enviado', 'esperando_feedback'].includes(targetStep)
                  ? null
                  : cycle.client_returned_at,
            approved: false,
          };
          return normalizeRevisionCycle(nextCycle);
        });
        return {
          revisionCycles: {
            ...state.revisionCycles,
            [projectId]: sortRevisionCycles(updated),
          },
        };
      });
      recordRevisionEventLocally(set, projectId, eventPayload);
    } else {
      try {
        const payload = { ...updates };
        const { error } = await supabaseClient
          .from('revision_cycles')
          .update(payload)
          .eq('id', cycleId);
        if (error) throw error;
        await supabaseClient
          .from('revision_cycle_events')
          .insert(eventPayload);
      } catch (error) {
        console.error('Error moving revision cycle to step:', error);
        throw error;
      }
    }

    await get().fetchRevisionCycles(projectId);

    const project = get().projects.find((p) => p.id === projectId);
    if (project) {
      const cyclePatch = {
        current_cycle: cycleNumber,
        currentCycle: cycleNumber,
      };
      if (projectState) {
        cyclePatch.state = projectState;
      }

      if (deadlineOffset !== null) {
        await get().autoAdjustDeadline(projectId, deadlineOffset, cyclePatch);
      } else if (projectState) {
        await get().updateProject(
          {
            ...project,
            ...cyclePatch,
          },
          { skipLoading: true }
        );
      }
    } else if (deadlineOffset !== null) {
      await get().autoAdjustDeadline(projectId, deadlineOffset);
    }

    return targetStep;
  },

  advanceRevisionStep: async (projectId, cycleId, step) =>
    get().moveRevisionCycleToStep(projectId, cycleId, step),

  markCycleSent: async (projectId, cycleId) =>
    get().moveRevisionCycleToStep(projectId, cycleId, 'enviado'),

  markCycleClientReturn: async (projectId, cycleId) =>
    get().moveRevisionCycleToStep(projectId, cycleId, 'corrigiendo'),

  resetRevisionCycle: async (projectId) => {
    if (!projectId) return null;
    const cycles = get().revisionCycles?.[projectId] || [];
    if (cycles.length === 0) {
      await get().fetchRevisionCycles(projectId);
      return null;
    }

    const ordered = sortRevisionCycles(cycles);
    const current = ordered[ordered.length - 1];
    if (!current) return null;

    const futureCycles = ordered.filter(
      (cycle) => Number(cycle.number) > Number(current.number)
    );

    if (!supabaseClient) {
      const resetCycle = normalizeRevisionCycle({
        ...current,
        status: 'editando',
        sent_at: null,
        client_returned_at: null,
        approved: false,
      });
      const updatedList = sortRevisionCycles(
        [
          ...ordered.filter((cycle) => Number(cycle.number) < Number(resetCycle.number)),
          resetCycle,
        ]
      );
      set((state) => {
        const nextRevisionCycles = {
          ...state.revisionCycles,
          [projectId]: updatedList,
        };
        return {
          revisionCycles: nextRevisionCycles,
          revisionHistory: {
            ...state.revisionHistory,
            [projectId]: [],
          },
          ...buildProjectsStateSnapshot(state, state.projects, nextRevisionCycles),
        };
      });
      return resetCycle;
    }

    try {
      await supabaseClient
        .from('revision_cycles')
        .update({
          status: 'editando',
          sent_at: null,
          client_returned_at: null,
          approved: false,
        })
        .eq('id', current.id);

      if (futureCycles.length > 0) {
        await supabaseClient
          .from('revision_cycles')
          .delete()
          .in('id', futureCycles.map((cycle) => cycle.id));
      }

      await supabaseClient
        .from('revision_cycle_events')
        .delete()
        .eq('project_id', projectId);

      await get().fetchRevisionCycles(projectId);
      await get().fetchRevisionHistory(projectId);

      const project = get().projects.find((p) => p.id === projectId);
      if (project) {
        await get().updateProject(
          {
            ...project,
            state: 'postproduccion',
          },
          { skipLoading: true }
        );
      }
    } catch (error) {
      console.error('Error resetting revision cycle:', error);
      throw error;
    }

    return null;
  },

  markCycleApproved: async (projectId, cycleId, options = {}) => {
    if (!projectId || !cycleId) return null;
    const { finalize = false } = options;

    const eventPayload = {
      project_id: projectId,
      cycle_id: cycleId,
      from_status: get().revisionCycles?.[projectId]?.find((c) => c.id === cycleId)?.status || 'corrigiendo',
      to_status: 'aprobado',
      occurred_at: new Date().toISOString(),
    };

    if (!supabaseClient) {
      set((state) => {
        const cycles = state.revisionCycles?.[projectId] || [];
        const updated = cycles.map((cycle) =>
          cycle.id === cycleId
            ? normalizeRevisionCycle({
              ...cycle,
              approved: true,
              status: 'aprobado',
            })
            : cycle
        );
        recordRevisionEventLocally(set, projectId, eventPayload);
        return {
          revisionCycles: {
            ...state.revisionCycles,
            [projectId]: sortRevisionCycles(updated),
          },
        };
      });
    } else {
      try {
        const { error } = await supabaseClient
          .from('revision_cycles')
          .update({ approved: true, status: 'aprobado' })
          .eq('id', cycleId);
        if (error) throw error;
        await supabaseClient
          .from('revision_cycle_events')
          .insert(eventPayload);
      } catch (error) {
        console.error('Error approving revision cycle:', error);
        throw error;
      }
    }

    const project = get().projects.find((p) => p.id === projectId);
    if (project) {
      const currentNumber = project.current_cycle || project.currentCycle || 1;
      const nextNumber = currentNumber + 1;

      const nextProjectState = finalize ? 'entregado' : 'postproduccion';
      const nextStatus = finalize ? 'Completado' : 'En progreso';

      await get().updateProject(
        {
          ...project,
          state: nextProjectState,
          current_cycle: nextNumber,
          currentCycle: nextNumber,
          status: nextStatus,
        },
        { skipLoading: true }
      );

      if (!finalize) {
        await get().createRevisionCycle(projectId, {
          number: nextNumber,
          status: 'editando',
        });
      }
    }

    await get().fetchRevisionCycles(projectId);
  },

  autoAdjustDeadline: async (projectId, offsetDays = 1, projectPatch = {}) => {
    if (!projectId) return null;
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) return null;
    const base = new Date();
    const nextDeadline = formatDateOnly(addDays(base, offsetDays));
    const nextProject = {
      ...project,
      deadline: nextDeadline,
      ...projectPatch,
    };
    await get().updateProject(nextProject, { skipLoading: true });
    return nextDeadline;
  },

  // ACCIÓN ORQUESTADORA PARA VISTAS NORMALES
  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      await get()._fetchProjects();
    } catch (error) {
      // El error ya se maneja dentro de _fetchProjects
    } finally {
      set({ loading: false });
    }
  },

  // FUNCIÓN INTERNA: Solo obtiene datos, no gestiona 'loading'.
  _fetchProjects: async () => {
    // set({ loading: true, error: null }); // Se elimina el control de loading

    if (!supabaseClient) {
      const localProjects = readLocalProjects();
      set((state) => ({
        ...buildProjectsStateSnapshot(state, localProjects),
      }));
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

      let revisionMap = get().revisionCycles || {};
      try {
        const { data: revisionData, error: revisionError } = await supabaseClient
          .from('revision_cycles')
          .select('*');
        if (revisionError) {
          console.error('Error fetching revision cycles:', revisionError);
        } else if (Array.isArray(revisionData)) {
          revisionMap = revisionData.reduce((acc, item) => {
            const normalized = normalizeRevisionCycle(item);
            const key = normalized.project_id;
            if (!key) return acc;
            const list = acc[key] ? [...acc[key], normalized] : [normalized];
            acc[key] = sortRevisionCycles(list);
            return acc;
          }, {});
        }
      } catch (revisionFetchError) {
        console.error('Error loading revision cycles:', revisionFetchError);
      }

      set((state) => ({
        revisionCycles: revisionMap,
        ...buildProjectsStateSnapshot(state, projects, revisionMap),
      }));
    } catch (error) {
      console.error('Error fetching projects:', error);
      const fallbackProjects = readLocalProjects();
      set((state) => ({
        error: 'Error fetching projects',
        ...buildProjectsStateSnapshot(state, fallbackProjects),
      }));
    } // Se elimina el 'finally'
  },

  checkAndAdvanceProjectStates: async () => {
    const { projects, updateProject } = get();
    const today = startOfDay(new Date());
    const projectsToAdvance = projects.filter(p => {
      const stage = (p.stage || p.properties?.stage || '').toString().trim().toLowerCase();
      const state = (p.state || p.properties?.state || '').toString().trim().toLowerCase();
      if (stage !== 'grabacion' && state !== 'grabacion') return false;

      const recordingDate = parseDateOnly(p.fechaGrabacion || p.startDate);
      return recordingDate && recordingDate < today;
    });

    if (projectsToAdvance.length === 0) return;

    console.log(`[Agent] Found ${projectsToAdvance.length} projects to advance from 'grabacion' to 'edicion'.`);

    for (const project of projectsToAdvance) {
      const recordingDate = parseDateOnly(project.fechaGrabacion || project.startDate);
      const registrationType = getRegistrationType(project);
      const durationDays = computeEditingDurationDays(registrationType);

      const newStartDate = addDays(recordingDate, 1);
      const newDeadline = addDays(newStartDate, Math.max(0, durationDays - 1));

      const patch = {
        state: 'edicion',
        stage: 'edicion',
        startDate: formatDateOnly(newStartDate),
        deadline: formatDateOnly(newDeadline),
        // Opcional: limpiar campos específicos de la grabación si es necesario
        // fechaGrabacion: null, 
      };

      console.log(`[Agent] Advancing project ${project.id}:`, patch);
      // Usamos el ID del proyecto existente para actualizarlo
      await updateProject({ ...project, ...patch }, { skipLoading: true });
    }
  },

  addProject: async (project, options = {}) => {
    set({ loading: true, error: null });

    // DEPRECATED: La lógica de auto-generación de proyectos de edición ha sido reemplazada 
    // por checkAndAdvanceProjectStates para evitar duplicados.
    const { skipAutoEditingGeneration = true } = options; // Default to true to disable old logic
    const isNewProject = !project?.id;
    const wantsAutoEditing = false; // Disabled globally
    // isNewProject && !skipAutoEditingGeneration && shouldGenerateEditingProject(project);

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
        // OLD LOGIC - DISABLED
        /*
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
        */

        const projects = nextProjects.sort((a, b) => {
          const startA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const startB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return startB - startA;
        });
        persistLocalProjects(projects);
        return buildProjectsStateSnapshot(state, projects);
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
          return buildProjectsStateSnapshot(state, projects);
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

  updateProject: async (project, options = {}) => {
    const { skipLoading = false } = options;
    if (skipLoading) {
      set({ error: null });
    } else {
      set({ loading: true, error: null });
    }

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
        return buildProjectsStateSnapshot(state, projects);
      });
      if (!skipLoading) {
        set({ loading: false });
      }
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
        return buildProjectsStateSnapshot(state, projects);
      });
    } catch (error) {
      set({ error: 'Error updating project' });
      console.error('Error updating project:', error);
    } finally {
      if (!skipLoading) {
        set({ loading: false });
      }
    }
  },

  deleteProject: async (id) => {
    set({ loading: true, error: null });

    if (!supabaseClient) {
      set((state) => {
        const projects = state.projects.filter((p) => p.id !== id);
        persistLocalProjects(projects);
        return buildProjectsStateSnapshot(state, projects);
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
        return buildProjectsStateSnapshot(state, projects);
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
    set((state) => buildProjectsStateSnapshot(state, normalized));
  },
  setCurrentUser: (user) =>
    set((state) => {
      let allowedViews;
      if (isFranciscoUser(user)) {
        allowedViews = ['Dashboard', 'Table', 'Calendar', 'Timeline', 'Gallery'];
      } else if (isCeoUser(user)) {
        allowedViews = ['Dashboard', ...DEFAULT_ALLOWED_VIEWS, 'Finanzas'];
      } else {
        allowedViews = ['Dashboard', ...DEFAULT_ALLOWED_VIEWS.filter(v => v !== 'Dashboard')];
      }

      const nextView = allowedViews.includes(state.currentView) ? state.currentView : allowedViews[0];
      return {
        currentUser: user,
        allowedViews,
        currentView: nextView,
      };
    }),

  // Slice para el Agente Planificador
  agent: readLocalAgentState(),
  runAgent: async (mode = 'diagnose') => {
    const snapshot = get();
    if (snapshot.agent?.running) {
      return;
    }
    set((state) => ({
      agent: {
        ...state.agent,
        running: true,
        error: null,
        suggestions: [],
        summary: 'Analizando...',
      },
    }));
    try {
      const res = await fetch('/api/agent/planificador', {
        method: 'POST',
        body: JSON.stringify({
          mode,
          projects: snapshot.projects || [],
          retainers: snapshot.retainers || [],
          teamMembers: snapshot.teamMembers || [],
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Error al ejecutar el agente');

      const agentState = {
        lastRunAt: Date.now(),
        summary: data.summary || '',
        suggestions: data.actions || [],
        running: false,
        error: null,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(AGENT_STORAGE_KEY, JSON.stringify(agentState));
      }
      set({ agent: agentState });
    } catch (error) {
      set((state) => ({
        agent: {
          ...state.agent,
          running: false,
          error: error.message || 'Error al ejecutar el agente',
        },
      }));
    }
  },
  applyAgentAction: async (action) => {
    if (action.type === 'UPDATE_PROJECT' && action.projectId && action.patch) {
      await get().updateProject({ id: action.projectId, ...action.patch });
    }
  },
}));

if (typeof window !== 'undefined') {
  applyThemeToDocument(useStore.getState().theme);
}

if (supabaseClient) {
  supabaseClient
    .channel('projects')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'projects' },
      (payload) => {
        console.log('Realtime: Nuevo proyecto recibido', payload.new);
        const { _fetchProjects } = useStore.getState();
        _fetchProjects(); // Vuelve a cargar todos para mantener la consistencia sin bloquear UI
        set({ lastUpdate: Date.now() });
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'projects' },
      (payload) => {
        console.log('Realtime: Proyecto actualizado', payload.new);
        const { _fetchProjects } = useStore.getState();
        _fetchProjects();
        set({ lastUpdate: Date.now() });
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'projects' },
      (payload) => {
        console.log('Realtime: Proyecto eliminado', payload.old.id);
        const { _fetchProjects } = useStore.getState();
        _fetchProjects();
        set({ lastUpdate: Date.now() });
      }
    )
    .subscribe();
}

export default useStore;
