import { create } from 'zustand';
import { addDays, parseISO, isValid, format, differenceInCalendarDays, startOfDay, startOfMonth } from 'date-fns';
import { supabase } from '../config/supabase';
import { persist } from 'zustand/middleware';
import { TEAM_MEMBERS } from '../constants/team';
import { generarTareasEdicionDesdeProyectos } from '../utils/editingTasks';
import { toast } from 'react-hot-toast';
import { normalizeStatus } from '../utils/statusHelpers';
import { notifyNewManagers } from '../utils/notifications';
import {
  sanitizeRecordingDates,
  getProjectLastRecordingDate,
  computeTurnaroundByFormat,
  estimateDeliveryDate,
} from '../utils/dashboardHelpers';
import { canonicalizeProjectClients } from '../utils/clients';
import { ABSENCE_STAGE, getAbsenceMembersFromName, isAbsenceProject } from '../utils/absences';
import { deriveAvailability } from '../utils/availability';
import { getMemberNameForUser } from '../constants/team';

const LOCAL_STORAGE_KEY = 'cerezo-projects';
const RETAINERS_KEY = 'cerezo-retainers';
const DEFAULT_ALLOWED_VIEWS = ['Table', 'Calendar', 'Timeline', 'Gallery', 'Edition'];
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
  if (normalized === 'postproduccion' || normalized === 'grabacion' || normalized === 'fotografia' || normalized === 'fotografía') return 'En progreso';
  return 'Programado';
};

const deriveProjectStatuses = (projects = []) =>
  (projects || []).map((project) => {
    const nextProject = { ...project };

    const normalizedStatus = (project.status || '').toString().trim().toLowerCase();
    const stage = (project.stage || project.properties?.stage || '').toString().trim().toLowerCase();
    const state = (project.state || project.properties?.state || '').toString().trim().toLowerCase();
    const startDate = parseDateOnly(project.startDate);
    const recordingDate = parseDateOnly(
      project.recordingDate ||
      project.fechaGrabacion ||
      project.properties?.fechaGrabacion
    );
    const effectiveStart = startDate || recordingDate;
    const today = startOfDay(new Date());

    let derivedStatus = project.status;

    // Prioridad absoluta: Si está explícitamente completado o entregado
    const isEntregado =
      state === 'entregado' ||
      (project.properties?.state && project.properties.state.toString().trim().toLowerCase() === 'entregado');

    // El estado elegido manda: "entregado" solo completa si no hay otro estado
    // explícito (antes un completado que pasaba a "Atascado" volvía a Completado).
    if (normalizedStatus === 'completado' || (isEntregado && !normalizedStatus)) {
      derivedStatus = 'Completado';
    } else if (
      (stage === 'edicion' || stage === 'grabacion' || stage === 'fotografia' || stage === 'fotografía') &&
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
  let managers = normalizeManagers(
    project.managers || project.manager || project.encargado || properties.managers
  );
  if (managers.length === 0 && isAbsenceProject(project)) {
    managers = getAbsenceMembersFromName(project.name);
  }
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
  const fechaGrabacionSingle =
    project.fechaGrabacion ||
    project.fecha_grabacion ||
    project.fechaGrabación ||
    project.recordingDate ||
    project.recording_date ||
    project.properties?.fechaGrabacion ||
    project.properties?.fecha_grabacion ||
    null;
  // Soporte de rodajes de varios días: arreglo de fechas (yyyy-MM-dd) ordenado.
  // Si no hay arreglo, cae a la fecha única. `fechaGrabacion` queda como el
  // primer día para mantener compatibilidad con la lógica de un solo día.
  let recordingDates = sanitizeRecordingDates(
    project.recordingDates || project.properties?.recordingDates || null
  );
  if (recordingDates.length === 0 && fechaGrabacionSingle) {
    recordingDates = sanitizeRecordingDates(fechaGrabacionSingle);
  }
  const fechaGrabacion = recordingDates[0] || fechaGrabacionSingle || null;
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

  // Ausencias cargadas antes como "NO ESTÁ <nombre>" (cliente Interno) pasan a
  // la fase propia de ausencias; al guardarlas queda persistido.
  const resolvedStage = isAbsenceProject(project)
    ? ABSENCE_STAGE
    : normalizedStage || (fechaGrabacion ? 'grabacion' : properties.stage || '');

  return {
    ...project,
    startDate,
    deadline,
    status: normalizeStatus(project.status || properties.status),
    manager: managers[0] || '',
    managers,
    type: registrationType || project.type || project.tipo || '',
    client: project.client || project.cliente || '',
    fechaGrabacion,
    recordingDates,
    resources,
    registrationType,
    stage: resolvedStage,
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
      stage: resolvedStage || properties.stage,
      recordingTime,
      recordingLocation,
      recordingDescription,
      fechaGrabacion,
      recordingDates,
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

  const recordingDateSingle = normalizeDate(
    project.fechaGrabacion ||
    project.fecha_grabacion ||
    project.fechaGrabación ||
    project.recordingDate ||
    project.recording_date
  );
  // Rodajes de varios días: lista de fechas (yyyy-MM-dd) ordenada y única.
  const recordingDatesList = sanitizeRecordingDates(
    project.recordingDates || project.properties?.recordingDates || recordingDateSingle
  );
  // El "día principal" (más temprano) alimenta la lógica de un solo día.
  const recordingDate = recordingDatesList[0] || recordingDateSingle;
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

  if (recordingDatesList.length > 0) {
    nextProperties.recordingDates = recordingDatesList;
  } else if (Object.prototype.hasOwnProperty.call(nextProperties, 'recordingDates')) {
    delete nextProperties.recordingDates;
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

  if (project.status) {
    nextProperties.status = normalizeStatus(project.status);
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
  delete baseProject.recordingDates;
  delete baseProject.stage;
  delete baseProject.registrationType;
  delete baseProject.recordingTime;
  delete baseProject.recordingLocation;
  delete baseProject.recordingDescription;
  delete baseProject.linkedRecordingId;
  delete baseProject.currentCycle;
  delete baseProject.revision; // Eliminar el campo virtual de revisión
  delete baseProject.completedAt; // Eliminar campo que no existe en DB

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

const buildProjectsStateSnapshot = (state, projects) => {
  const filteredProjects = filterProjectsForUser(projects || [], state.currentUser);
  // "FUSO"/"Fuso", "Propio"/"Interno"… se muestran (y se guardan) con un solo nombre.
  const enrichedProjects = deriveProjectStatuses(canonicalizeProjectClients(filteredProjects));
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


const shouldGenerateEditingProject = (project) => {
  const stage = project?.stage || project?.properties?.stage || '';
  const val = stage.toString().trim().toLowerCase();
  return val === 'grabacion' || val === 'fotografia' || val === 'fotografía';
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
  // En rodajes de varios días, edición arranca después del ÚLTIMO día.
  const recordingDate =
    getProjectLastRecordingDate(project) || parseDateOnly(project.fechaGrabacion || project.startDate);
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

let inFlightProjectsFetch = null;

const sortByStartDateDesc = (projects) =>
  [...projects].sort((a, b) => {
    const startA = a.startDate ? new Date(a.startDate).getTime() : 0;
    const startB = b.startDate ? new Date(b.startDate).getTime() : 0;
    return startB - startA;
  });

const joinNames = (results) => results.map((result) => result.manager).join(', ');

// Envía el aviso por correo a los responsables recién asignados y muestra el
// resultado: antes los fallos solo quedaban en la consola.
const announceAssignments = async (project, previousManagers = []) => {
  if (!project || isAbsenceProject(project)) return;
  const results = await notifyNewManagers(project, previousManagers);
  if (results.length === 0) return;
  const sent = results.filter((result) => result.ok);
  const failed = results.filter((result) => !result.ok);
  if (sent.length > 0) {
    toast.success(`Aviso por correo enviado a ${joinNames(sent)}.`);
  }
  if (failed.length > 0) {
    const notConfigured = failed.some((result) => result.code === 'EMAIL_NOT_CONFIGURED');
    toast.error(
      notConfigured
        ? `No se envió el aviso por correo a ${joinNames(failed)}: el envío de correos no está configurado.`
        : `No se pudo avisar por correo a ${joinNames(failed)}.`,
      { duration: 8000 }
    );
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
  activeVoiceRoom: null,
  isVoiceRoomMinimized: false,
  setActiveVoiceRoom: (room) => set({ activeVoiceRoom: room, isVoiceRoomMinimized: false }),
  setIsVoiceRoomMinimized: (minimized) => set({ isVoiceRoomMinimized: minimized }),
  userAvailability: 'Activo - Editando',
  // 'auto' = se calcula con la agenda de hoy; 'manual' = la persona lo eligió.
  availabilitySource: 'auto',
  setUserAvailability: (status) => set({ userAvailability: status, availabilitySource: 'manual' }),
  syncAvailabilityFromSchedule: () => {
    const { availabilitySource, currentUser, projects } = get();
    if (availabilitySource === 'manual') return;
    const derived = deriveAvailability(projects, getMemberNameForUser(currentUser));
    if (derived) set({ userAvailability: derived });
  },
  theme: getInitialTheme(),
  selectedDashboardDate: startOfMonth(new Date()),
  reportingData: {
    lastSync: null,
    isOnline: true,
  },

  lastUpdate: null, // Añadir para notificar actualizaciones en tiempo real
  setCurrentView: (view) =>
    set((state) => {
      const allowed = state.allowedViews || DEFAULT_ALLOWED_VIEWS;
      const nextView = allowed.includes(view) ? view : allowed[0] || state.currentView;
      return { currentView: nextView };
    }),

  setSelectedDashboardDate: (date) => set({ selectedDashboardDate: startOfMonth(date) }),
  // `intent` permite abrir el formulario con un cambio ya propuesto, p. ej.
  // { status: 'Completado' } cuando falta el link del entregable.
  modalIntent: null,
  openModal: (project, intent = null) => set({ isModalOpen: true, selectedProject: project, modalIntent: intent }),
  closeModal: () => set({ isModalOpen: false, selectedProject: null, modalIntent: null }),
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

  // ACCIÓN ORQUESTADORA PARA VISTAS NORMALES
  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      await get()._fetchProjects();
    } finally {
      set({ loading: false });
    }
  },

  // FUNCIÓN INTERNA: Solo obtiene datos, no gestiona 'loading'. Si ya hay una
  // carga en curso devuelve la misma promesa, así la tabla no se pide dos veces.
  _fetchProjects: () => {
    if (inFlightProjectsFetch) return inFlightProjectsFetch;

    const run = async () => {
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

        const projects = sortByStartDateDesc((data || []).map(normalizeProject));
        persistLocalProjects(projects);

        set((state) => ({
          ...buildProjectsStateSnapshot(state, projects),
          reportingData: {
            lastSync: new Date().toISOString(),
            isOnline: true,
          },
        }));
      } catch (error) {
        console.error('Error fetching projects:', error);
        const fallbackProjects = readLocalProjects();
        set((state) => ({
          error: 'Error fetching projects',
          ...buildProjectsStateSnapshot(state, fallbackProjects),
          reportingData: {
            ...state.reportingData,
            isOnline: false,
          },
        }));
      }
    };

    inFlightProjectsFetch = run().finally(() => {
      inFlightProjectsFetch = null;
    });
    return inFlightProjectsFetch;
  },

  checkAndAdvanceProjectStates: async () => {
    const { projects, updateProject } = get();
    const today = startOfDay(new Date());
    const projectsToAdvance = projects.filter(p => {
      if (isAbsenceProject(p)) return false;
      const stage = (p.stage || p.properties?.stage || '').toString().trim().toLowerCase();
      const state = (p.state || p.properties?.state || '').toString().trim().toLowerCase();

      const isRecordOrPhoto = stage === 'grabacion' || stage === 'fotografia' || stage === 'fotografía';
      const isStateRecordOrPhoto = state === 'grabacion' || state === 'fotografia' || state === 'fotografía';

      if (!isRecordOrPhoto && !isStateRecordOrPhoto) return false;

      // Solo avanza a edición cuando pasó el ÚLTIMO día de grabación.
      const recordingDate =
        getProjectLastRecordingDate(p) || parseDateOnly(p.fechaGrabacion || p.startDate);
      return recordingDate && recordingDate < today;
    });

    if (projectsToAdvance.length === 0) return;

    console.log(`[Agent] Found ${projectsToAdvance.length} projects to advance from 'grabacion/fotografia' to 'edicion'.`);

    const turnaround = computeTurnaroundByFormat(projects);

    for (const project of projectsToAdvance) {
      const recordingDate =
        getProjectLastRecordingDate(project) || parseDateOnly(project.fechaGrabacion || project.startDate);
      const newStartDate = addDays(recordingDate, 1);

      // Entrega: la comprometida si ya hay una posterior al rodaje; si no, la
      // estimada con el promedio histórico del formato; sin historial, la
      // duración fija de siempre.
      const existingDeadline = parseDateOnly(project.deadline);
      let newDeadline = existingDeadline && existingDeadline >= newStartDate ? existingDeadline : null;
      if (!newDeadline) {
        const estimate = estimateDeliveryDate(
          {
            ...project,
            deadline: null,
            properties: { ...(project.properties || {}), deadline: null, fecha_entrega: null },
          },
          turnaround
        );
        newDeadline =
          estimate && estimate.date >= newStartDate
            ? estimate.date
            : addDays(newStartDate, Math.max(0, computeEditingDurationDays(getRegistrationType(project)) - 1));
      }

      const patch = {
        state: 'edicion',
        stage: 'edicion',
        startDate: formatDateOnly(newStartDate),
        deadline: formatDateOnly(newDeadline),
      };

      console.log(`[Agent] Advancing project ${project.id}:`, patch);
      // Usamos el ID del proyecto existente para actualizarlo
      await updateProject({ ...project, ...patch }, { skipNotifications: true });
    }
  },

  // Devuelve { ok, project } o { ok: false, error } para que la interfaz confirme o avise.
  addProject: async (project, options = {}) => {
    const { skipNotifications = false } = options;
    set({ error: null });

    if (!supabaseClient) {
      const baseId = project.id || generateLocalId();
      const newProject = normalizeProject({
        ...project,
        id: baseId,
        properties: project.properties || {},
        created_at: project.created_at || new Date().toISOString(),
      });

      set((state) => {
        const projects = sortByStartDateDesc([...state.projects, newProject]);
        persistLocalProjects(projects);
        return buildProjectsStateSnapshot(state, projects);
      });
      if (!skipNotifications) announceAssignments(newProject, []);
      return { ok: true, project: newProject };
    }

    try {
      const payload = prepareProjectForSupabase(project);
      const { data, error } = await supabaseClient.from('projects').insert([payload]).select();

      if (error) throw error;

      const inserted = Array.isArray(data) ? data[0] : data;
      const normalized = normalizeProject(inserted || payload);

      set((state) => {
        const projects = sortByStartDateDesc([
          ...state.projects.filter((p) => p.id !== normalized.id),
          normalized,
        ]);
        persistLocalProjects(projects);
        return buildProjectsStateSnapshot(state, projects);
      });

      if (!skipNotifications) announceAssignments(normalized, []);
      return { ok: true, project: normalized };
    } catch (error) {
      set({ error: 'Error adding project' });
      console.error('Error adding project:', error);
      return { ok: false, error };
    }
  },

  // Acepta el proyecto completo o solo los campos que cambian ({ id, properties }):
  // se combina con lo que ya hay para no borrar fechas, responsables, etc.
  updateProject: async (project, options = {}) => {
    const { skipNotifications = false } = options;
    set({ error: null });

    const previous = get().projects.find((p) => p.id === project.id) || null;
    const previousManagers = previous?.managers || [];
    const merged = previous ? { ...previous, ...project } : { ...project };

    // Si deja de estar completado, el proyecto ya no está "entregado".
    const mergedState = (merged.state || merged.properties?.state || '').toString().toLowerCase();
    if (merged.status && normalizeStatus(merged.status) !== 'Completado' && mergedState === 'entregado') {
      const stage = (merged.stage || merged.properties?.stage || '').toString().toLowerCase();
      const reopenedState = stage === 'grabacion' || stage === 'fotografia' ? stage : 'edicion';
      merged.state = reopenedState;
      merged.properties = { ...(merged.properties || {}), state: reopenedState };
    }

    // 1. Optimistic Update (Immediate Feedback)
    const optimisticNormalized = normalizeProject(merged);

    set((state) => {
      const projects = sortByStartDateDesc(
        state.projects.map((p) => (p.id === optimisticNormalized.id ? optimisticNormalized : p))
      );
      persistLocalProjects(projects);
      return buildProjectsStateSnapshot(state, projects);
    });

    if (!supabaseClient) {
      if (!skipNotifications) announceAssignments(optimisticNormalized, previousManagers);
      return { ok: true, project: optimisticNormalized };
    }

    try {
      const payload = prepareProjectForSupabase(merged);

      const { data, error } = await supabaseClient
        .from('projects')
        .update(payload)
        .eq('id', project.id)
        .select();

      if (error) throw error;

      // 2. Confirmed Update (Sync with DB Truth)
      const updated = Array.isArray(data) ? data[0] : data;
      const verified = normalizeProject(updated || merged);

      set((state) => {
        const projects = sortByStartDateDesc(
          state.projects.map((p) => (p.id === verified.id ? verified : p))
        );
        persistLocalProjects(projects);
        return buildProjectsStateSnapshot(state, projects);
      });

      if (!skipNotifications) announceAssignments(verified, previousManagers);
      return { ok: true, project: verified };
    } catch (error) {
      console.error('Error updating project:', error);
      // Revertir el cambio optimista: la interfaz avisa del error y conserva lo escrito.
      set((state) => {
        const projects = previous
          ? sortByStartDateDesc(state.projects.map((p) => (p.id === previous.id ? previous : p)))
          : state.projects;
        persistLocalProjects(projects);
        return { ...buildProjectsStateSnapshot(state, projects), error: 'Error updating project' };
      });
      return { ok: false, error };
    }
  },

  // Devuelve el proyecto eliminado para poder deshacer con restoreProject.
  deleteProject: async (id) => {
    set({ error: null });
    const removed = get().projects.find((p) => p.id === id) || null;

    if (!supabaseClient) {
      set((state) => {
        const projects = state.projects.filter((p) => p.id !== id);
        persistLocalProjects(projects);
        return buildProjectsStateSnapshot(state, projects);
      });
      return { ok: true, project: removed };
    }

    try {
      const { error } = await supabaseClient.from('projects').delete().eq('id', id);
      if (error) throw error;

      set((state) => {
        const projects = state.projects.filter((p) => p.id !== id);
        persistLocalProjects(projects);
        return buildProjectsStateSnapshot(state, projects);
      });
      return { ok: true, project: removed };
    } catch (error) {
      set({ error: 'Error deleting project' });
      console.error('Error deleting project:', error);
      return { ok: false, error };
    }
  },

  // Deshacer una eliminación: vuelve a insertar el mismo proyecto (mismo id), sin reenviar avisos.
  restoreProject: async (project) => {
    if (!project) return { ok: false };
    return get().addProject(project, { skipNotifications: true });
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
        allowedViews = ['Dashboard', ...DEFAULT_ALLOWED_VIEWS];
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

}));

if (typeof window !== 'undefined') {
  applyThemeToDocument(useStore.getState().theme);
}

if (supabaseClient) {
  // Varios cambios seguidos (p. ej. el propio guardado) disparan una sola recarga.
  let realtimeRefreshTimer = null;
  const scheduleRealtimeRefresh = () => {
    if (realtimeRefreshTimer) clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = setTimeout(() => {
      realtimeRefreshTimer = null;
      useStore.getState()._fetchProjects();
      useStore.setState({ lastUpdate: Date.now() });
    }, 400);
  };

  supabaseClient
    .channel('projects')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, scheduleRealtimeRefresh)
    .subscribe();
}

export default useStore;
