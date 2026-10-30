"use client";

import React, { Fragment, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Plus, Trash2, Calendar, ChevronDown, AlertTriangle, Sparkles } from 'lucide-react';
import { format, parseISO, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import useStore from '../../hooks/useStore';
import {
  sanitizeRecordingDates,
  computeTurnaroundByFormat,
  estimateDeliveryDate,
  parseProjectDate,
  MIN_PLAUSIBLE_YEAR,
  MAX_PLAUSIBLE_YEAR,
} from '../../utils/dashboardHelpers';
import { buildScheduleIndex, findProjectConflicts, getMemberCommitments } from '../../utils/scheduleConflicts';
import { ABSENCE_STAGE } from '../../utils/absences';
import { STATUS_OPTIONS } from '../../utils/statusHelpers';
import { buildClientLabelMap, getClientKey } from '../../utils/clients';
import { generarLinkGoogleCalendar } from '../../utils/calendar';
import VideoReviewPlayer from '../ui/VideoReviewPlayer';
import MemberAvatar from '../ui/MemberAvatar';
import { deleteProjectWithUndo } from '../ui/projectActions';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';

// "Formato" del registro (antes "Tipo"): Spot, Evento, Contenido, Lanzamiento.
const REGISTRATION_TYPES = [
  { value: 'spot', label: 'Spot' },
  { value: 'evento', label: 'Evento' },
  { value: 'contenido', label: 'Contenido' },
  { value: 'lanzamiento', label: 'Lanzamiento' },
];

const STAGES = {
  GRABACION: 'grabacion',
  EDICION: 'edicion',
  FOTOGRAFIA: 'fotografia',
  AUSENCIA: ABSENCE_STAGE,
};

const STAGE_BUTTONS = [
  { value: STAGES.GRABACION, label: 'Grabación' },
  { value: STAGES.FOTOGRAFIA, label: 'Fotografía' },
  { value: STAGES.EDICION, label: 'Edición' },
  { value: STAGES.AUSENCIA, label: 'Ausencia' },
];

// Metadata interna del sistema: NO debe exponerse como "propiedad personalizada".
const INTERNAL_PROPERTY_KEYS = new Set([
  'resources', 'registrationType', 'stage', 'recordingTime', 'recordingLocation',
  'recordingDescription', 'fechaGrabacion', 'fecha_grabacion', 'recordingDates',
  'linkedRecordingId', 'state', 'status', 'managers', 'manager', 'tasks',
  'client', 'cliente', 'currentCycle', 'current_cycle', 'deadline', 'fecha_entrega',
  'deliverableLink', 'deliverable_link', 'tag', 'income', 'notes', 'progress',
  'completedAt', 'editionPriority', 'isaOverrides',
]);

// Mismo mapeo que STATUS_PROGRESS en components/dashboard/MyPriorities.jsx —
// usado solo para mostrar dónde caería el slider en modo "automático".
const AUTO_PROGRESS_BY_STATUS = {
  Programado: 15,
  'En progreso': 55,
  'En revisión': 85,
  Completado: 100,
  Stuck: 40,
};

const inputClass =
  'mt-2 w-full rounded-lg border bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 dark:bg-[#0d0f1a] dark:text-white/85 dark:placeholder:text-white/40';
const inputOk = 'border-gray-300 focus:border-accent focus:ring-accent/20 dark:border-white/10';
const inputError = 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/60';
const labelClass = 'text-sm font-medium text-gray-700 dark:text-white/80';

// Etiqueta de un día, siempre con año: "vie 10 oct 2026".
const formatDayChip = (isoDate) => {
  try {
    return format(parseISO(`${isoDate}T00:00:00`), 'EEE d MMM yyyy', { locale: es });
  } catch {
    return isoDate;
  }
};

const formatShortDay = (isoDate) => {
  try {
    return format(parseISO(`${isoDate}T00:00:00`), 'EEE d MMM', { locale: es });
  } catch {
    return isoDate;
  }
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const isPlausibleIsoDay = (value) => ISO_DAY.test(value || '') && Boolean(parseProjectDate(value));

const FieldError = ({ id, message }) =>
  message ? (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
      {message}
    </p>
  ) : null;

const isFranciscoUser = (user) =>
  user?.email?.toString().trim().toLowerCase() === 'francisco@carbonomkt.com';

const buildInitialDraft = (selectedProject, intent, enforceFranciscoClient) => {
  const properties = selectedProject.properties || {};
  const existingResources = Array.isArray(properties.resources)
    ? properties.resources.filter(Boolean)
    : Array.isArray(selectedProject.resources)
      ? selectedProject.resources.filter(Boolean)
      : [];
  const normalizedTeam = Array.isArray(selectedProject.team)
    ? selectedProject.team
    : typeof selectedProject.team === 'string' && selectedProject.team.length > 0
      ? selectedProject.team.split(',').map((member) => member.trim()).filter(Boolean)
      : [];

  // No pre-rellenar el responsable en proyectos nuevos (evita asignar al
  // usuario activo por defecto). Solo se conservan los responsables existentes.
  const managers = Array.isArray(selectedProject.managers)
    ? selectedProject.managers
    : typeof selectedProject.manager === 'string' && selectedProject.manager.length > 0
      ? selectedProject.manager.split(',').map((manager) => manager.trim()).filter(Boolean)
      : [];

  const rawStage = selectedProject.stage || properties.stage || '';
  const stage = rawStage ? rawStage.toString().trim().toLowerCase() : STAGES.GRABACION;
  const registrationType =
    selectedProject.registrationType || properties.registrationType || selectedProject.type || 'spot';
  const projectClient = enforceFranciscoClient
    ? 'Carbono'
    : (selectedProject.client || selectedProject.cliente || properties.client || properties.cliente || '')
      .toString()
      .trim();
  const recordingDates = sanitizeRecordingDates(
    selectedProject.recordingDates ||
    properties.recordingDates ||
    selectedProject.recordingDate ||
    selectedProject.fechaGrabacion ||
    properties.fechaGrabacion ||
    ''
  );
  const recordingDate = recordingDates[0] || '';
  const recordingTime = selectedProject.recordingTime || properties.recordingTime || '';
  const recordingLocation = selectedProject.recordingLocation || properties.recordingLocation || '';
  const recordingDescription = selectedProject.recordingDescription || properties.recordingDescription || '';
  const deliverableLink = (selectedProject.deliverableLink || properties.deliverableLink || properties.deliverable_link || '')
    .toString()
    .trim();

  return {
    ...selectedProject,
    manager: managers[0] || '',
    managers,
    startDate: selectedProject.startDate || '',
    deadline: selectedProject.deadline || '',
    team: normalizedTeam,
    registrationType,
    stage,
    recordingDate,
    recordingDates,
    recordingTime,
    recordingLocation,
    recordingDescription,
    deliverableLink,
    type: registrationType || selectedProject.type || '',
    status: intent?.status || selectedProject.status || 'Programado',
    client: projectClient,
    properties: {
      ...properties,
      resources: existingResources,
      managers,
      registrationType,
      stage,
      recordingTime,
      recordingLocation,
      recordingDescription,
      fechaGrabacion: recordingDate || properties.fechaGrabacion || '',
      recordingDates,
      deliverableLink,
      client: projectClient,
    },
    resources: existingResources,
  };
};

const ModalDetalles = () => {
  const isModalOpen = useStore((state) => state.isModalOpen);
  const closeModal = useStore((state) => state.closeModal);
  const selectedProject = useStore((state) => state.selectedProject);
  const modalIntent = useStore((state) => state.modalIntent);
  const updateProject = useStore((state) => state.updateProject);
  const addProject = useStore((state) => state.addProject);
  const teamMembers = useStore((state) => state.teamMembers);
  const projects = useStore((state) => state.projects);
  const currentUser = useStore((state) => state.currentUser);
  const [editedProject, setEditedProject] = useState(null);
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);
  const managerDropdownRef = useRef(null);
  const managerTriggerRef = useRef(null);
  const [clientSelection, setClientSelection] = useState('');
  const [isCustomClient, setIsCustomClient] = useState(false);
  const [sosComment, setSosComment] = useState('');
  const [pendingDay, setPendingDay] = useState('');
  const [errors, setErrors] = useState({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newResource, setNewResource] = useState('');
  const [showResourceInput, setShowResourceInput] = useState(false);

  const nameRef = useRef(null);
  const clientRef = useRef(null);
  const dayInputRef = useRef(null);
  const deliverableRef = useRef(null);
  const deadlineRef = useRef(null);

  const enforceFranciscoClient = isFranciscoUser(currentUser);

  // Clientes existentes, con un solo nombre por cliente ("FUSO" y "Fuso" → "Fuso").
  const clientLabelMap = useMemo(() => buildClientLabelMap(projects || []), [projects]);
  const normalizedClientOptions = useMemo(
    () => Array.from(clientLabelMap.values()).sort((a, b) => a.localeCompare(b, 'es')),
    [clientLabelMap]
  );

  const availableClientOptions = useMemo(
    () => (enforceFranciscoClient ? ['Carbono'] : normalizedClientOptions),
    [enforceFranciscoClient, normalizedClientOptions]
  );
  const canAddCustomClient = !enforceFranciscoClient;

  const findMatchingClientOption = useCallback(
    (value) => {
      if (!value) return null;
      return clientLabelMap.get(getClientKey(value)) || null;
    },
    [clientLabelMap]
  );

  // Se lee desde una ref para que una recarga de proyectos (tiempo real) no
  // reinicie el formulario mientras se edita.
  const findMatchingClientOptionRef = useRef(findMatchingClientOption);
  findMatchingClientOptionRef.current = findMatchingClientOption;

  useEffect(() => {
    if (selectedProject) {
      const draft = buildInitialDraft(selectedProject, null, enforceFranciscoClient);
      const matchingClient = findMatchingClientOptionRef.current(draft.client);
      if (enforceFranciscoClient) {
        setClientSelection('Carbono');
        setIsCustomClient(false);
      } else if (matchingClient) {
        setClientSelection(matchingClient);
        setIsCustomClient(false);
      } else if (draft.client) {
        setClientSelection('__new__');
        setIsCustomClient(true);
      } else {
        setClientSelection('');
        setIsCustomClient(false);
      }
      const withIntent = modalIntent ? buildInitialDraft(selectedProject, modalIntent, enforceFranciscoClient) : draft;
      setEditedProject(withIntent);
      // El estado propuesto por `intent` cuenta como cambio sin guardar.
      setInitialSnapshot(JSON.stringify(draft));
      setErrors(
        modalIntent?.status === 'Completado' && !withIntent.deliverableLink
          ? { deliverableLink: 'Agrega el link del entregable para marcar el proyecto como Completado.' }
          : {}
      );
    } else {
      setEditedProject(null);
      setInitialSnapshot('');
      setClientSelection('');
      setIsCustomClient(false);
      setErrors({});
    }
    setIsManagerDropdownOpen(false);
    setPendingDay('');
    setShowDiscardConfirm(false);
    setConfirmDelete(false);
    setSaving(false);
    setNewResource('');
    setShowResourceInput(false);
    setSosComment('');
  }, [selectedProject, modalIntent, enforceFranciscoClient]);

  // Enfoca el campo del entregable cuando se abre para completar un proyecto.
  useEffect(() => {
    if (isModalOpen && modalIntent?.status === 'Completado') {
      const timer = setTimeout(() => deliverableRef.current?.focus(), 350);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isModalOpen, modalIntent]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (managerDropdownRef.current && !managerDropdownRef.current.contains(event.target)) {
        setIsManagerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currentStage = (editedProject?.stage || '').toLowerCase();
  const isAbsenceStage = currentStage === STAGES.AUSENCIA;
  const isRecordingStage = currentStage === STAGES.GRABACION || currentStage === STAGES.FOTOGRAFIA;
  const usesDayPicker = isRecordingStage || isAbsenceStage;
  const todayKey = format(startOfDay(new Date()), 'yyyy-MM-dd');

  // Días del borrador a partir de hoy: los que importan para cruces y disponibilidad.
  const upcomingDraftDays = useMemo(
    () => (usesDayPicker ? (editedProject?.recordingDates || []).filter((day) => day >= todayKey) : []),
    [usesDayPicker, editedProject?.recordingDates, todayKey]
  );

  const scheduleIndex = useMemo(() => buildScheduleIndex(projects || []), [projects]);

  const conflicts = useMemo(() => {
    if (!editedProject || upcomingDraftDays.length === 0) return [];
    return findProjectConflicts(
      { ...editedProject, recordingDates: upcomingDraftDays },
      projects || []
    );
  }, [editedProject, upcomingDraftDays, projects]);

  const turnaround = useMemo(() => computeTurnaroundByFormat(projects || []), [projects]);
  const deliveryEstimate = useMemo(() => {
    if (!editedProject || !isRecordingStage || editedProject.deadline) return null;
    return estimateDeliveryDate({ ...editedProject, deadline: null, properties: { ...editedProject.properties, deadline: null, fecha_entrega: null } }, turnaround);
  }, [editedProject, isRecordingStage, turnaround]);

  const isDirty = Boolean(editedProject) && JSON.stringify(editedProject) !== initialSnapshot;

  const requestClose = useCallback(() => {
    if (saving) return;
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    closeModal();
  }, [saving, isDirty, closeModal]);

  if (!editedProject) return null;

  const originalStatus = editedProject.id
    ? (projects || []).find((p) => p.id === editedProject.id)?.status || selectedProject?.status
    : null;

  // Solo propiedades realmente "personalizadas": ni metadata interna ni valores
  // no primitivos (arrays/objetos como tasks/managers, que mostraban [object Object]).
  const customPropertyEntries = Object.entries(editedProject.properties || {}).filter(
    ([key, value]) =>
      !INTERNAL_PROPERTY_KEYS.has(key) &&
      (typeof value === 'string' || typeof value === 'number') &&
      String(value).trim().length > 0
  );

  const selectedManagers = Array.isArray(editedProject.managers) ? editedProject.managers : [];
  const availableManagers = Array.isArray(teamMembers)
    ? teamMembers.filter((member) => !selectedManagers.includes(member))
    : [];

  // Mismo mapeo que STATUS_PROGRESS en MyPriorities — solo para mostrar dónde
  // quedaría el slider en "automático" cuando no hay progreso manual.
  const rawProgress = editedProject?.properties?.progress;
  const hasManualProgress = rawProgress !== '' && rawProgress !== null && rawProgress !== undefined;
  const autoProgress = AUTO_PROGRESS_BY_STATUS[editedProject?.status] ?? 20;

  const clearError = (key) =>
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const calculateEndTime = (time) => {
    if (!time) return '';
    const segments = time.toString().split(':');
    const hours = Number.parseInt(segments[0], 10);
    const minutes = Number.parseInt(segments[1] || '0', 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return '';
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    date.setHours(date.getHours() + 2);
    const endHours = String(date.getHours()).padStart(2, '0');
    const endMinutes = String(date.getMinutes()).padStart(2, '0');
    return `${endHours}:${endMinutes}`;
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    clearError(name);
    if (name === 'status' && value !== 'Completado') clearError('deliverableLink');
    setEditedProject((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'startDate' && isRecordingStage) {
        next.recordingDate = value;
        next.properties = { ...next.properties, fechaGrabacion: value };
      }
      return next;
    });
  };

  const handleClientSelectionChange = (event) => {
    const { value } = event.target;
    clearError('client');
    setClientSelection(value);
    if (value === '__new__') {
      setIsCustomClient(true);
      setEditedProject((prev) => ({
        ...prev,
        client: '',
        properties: { ...prev?.properties, client: '' },
      }));
      return;
    }
    setIsCustomClient(false);
    setEditedProject((prev) => ({
      ...prev,
      client: value,
      properties: { ...prev.properties, client: value },
    }));
  };

  const handleCustomClientChange = (event) => {
    const { value } = event.target;
    clearError('client');
    setEditedProject((prev) => ({
      ...prev,
      client: value,
      properties: { ...prev.properties, client: value },
    }));
  };

  const handleRegistrationTypeChange = (event) => {
    const value = event.target.value;
    setEditedProject((prev) => ({
      ...prev,
      registrationType: value,
      type: value,
      properties: { ...prev.properties, registrationType: value },
    }));
  };

  const handleStageChange = (value) => {
    clearError('recordingDates');
    setEditedProject((prev) => ({
      ...prev,
      stage: value,
      properties: { ...prev.properties, stage: value },
    }));
  };

  // Rodajes / ausencias de varios días: agregar / quitar días sueltos.
  const addDay = (value) => {
    if (!isPlausibleIsoDay(value)) return false;
    clearError('recordingDates');
    setEditedProject((prev) => {
      const list = sanitizeRecordingDates([...(prev.recordingDates || []), value]);
      return {
        ...prev,
        recordingDates: list,
        recordingDate: list[0] || '',
        properties: { ...prev.properties, recordingDates: list, fechaGrabacion: list[0] || '' },
      };
    });
    setPendingDay('');
    return true;
  };

  // El <input type="date"> avisa en cada tecla: mientras se tipea el año
  // aparecen valores como 0002-10-10. Se agrega solo cuando la fecha está
  // completa y el año es razonable; si no, se avisa al salir del campo.
  const handlePendingDayChange = (event) => {
    const { value } = event.target;
    setPendingDay(value);
    if (isPlausibleIsoDay(value)) {
      addDay(value);
    }
  };

  const validatePendingDay = () => {
    if (!pendingDay) return;
    if (addDay(pendingDay)) return;
    const year = pendingDay.slice(0, 4);
    setErrors((prev) => ({
      ...prev,
      recordingDates: `Revisa el año (${year}): debe estar entre ${MIN_PLAUSIBLE_YEAR} y ${MAX_PLAUSIBLE_YEAR}.`,
    }));
  };

  const handleRemoveRecordingDate = (date) => {
    setEditedProject((prev) => {
      const list = (prev.recordingDates || []).filter((d) => d !== date);
      return {
        ...prev,
        recordingDates: list,
        recordingDate: list[0] || '',
        properties: { ...prev.properties, recordingDates: list, fechaGrabacion: list[0] || '' },
      };
    });
  };

  const handleRecordingFieldChange = (key) => (event) => {
    const { value } = event.target;
    setEditedProject((prev) => ({
      ...prev,
      [key]: value,
      properties: { ...prev.properties, [key]: value },
    }));
  };

  const handleManagerSelect = (manager) => {
    clearError('managers');
    setEditedProject((prev) => {
      if (!prev) return prev;
      const currentManagers = Array.isArray(prev.managers) ? prev.managers : [];
      if (currentManagers.includes(manager)) return prev;
      const nextManagers = [...currentManagers, manager];
      return {
        ...prev,
        managers: nextManagers,
        manager: nextManagers[0] || '',
        properties: { ...(prev.properties || {}), managers: nextManagers },
      };
    });
  };

  const handleManagerRemove = (manager) => {
    setEditedProject((prev) => {
      if (!prev) return prev;
      const currentManagers = Array.isArray(prev.managers) ? prev.managers : [];
      const nextManagers = currentManagers.filter((item) => item !== manager);
      return {
        ...prev,
        managers: nextManagers,
        manager: nextManagers[0] || '',
        properties: { ...(prev.properties || {}), managers: nextManagers },
      };
    });
  };

  // Esc dentro del desplegable lo cierra a él, no al formulario.
  const handleManagerKeyDown = (event) => {
    if (event.key === 'Escape' && isManagerDropdownOpen) {
      event.preventDefault();
      event.stopPropagation();
      setIsManagerDropdownOpen(false);
      managerTriggerRef.current?.focus();
    }
  };

  const handleTeamChange = (event) => {
    const { value } = event.target;
    const members = value
      .split(',')
      .map((member) => member.trim())
      .filter((member) => member.length > 0);
    setEditedProject((prev) => ({
      ...prev,
      team: members,
    }));
  };

  const handleOpenRecordingCalendar = () => {
    const { name, client, recordingTime, recordingLocation, recordingDescription, team, managers } = editedProject;
    const dates = sanitizeRecordingDates(editedProject.recordingDates || editedProject.recordingDate);
    if (dates.length === 0) return;
    const managerNames = Array.isArray(managers) && managers.length > 0 ? managers.join(', ') : editedProject.manager;
    const link = generarLinkGoogleCalendar({
      contenido: name,
      cliente: client,
      detalle: recordingDescription || editedProject.description || '',
      encargado: managerNames,
      fechaInicio: dates[0],
      fechaFin: dates[dates.length - 1],
      horaInicio: recordingTime,
      horaFin: calculateEndTime(recordingTime),
      lugar: recordingLocation,
      team,
    });
    if (link) {
      window.open(link, '_blank', 'noopener');
    }
  };

  const handlePropertyChange = (key, value) => {
    setEditedProject((prev) => ({
      ...prev,
      properties: { ...prev.properties, [key]: value },
    }));
  };

  const handleAddResource = () => {
    const trimmed = newResource.trim();
    if (!trimmed) return;
    setEditedProject((prev) => {
      const nextResources = [...(prev.resources || []), trimmed];
      return {
        ...prev,
        resources: nextResources,
        properties: { ...prev.properties, resources: nextResources },
      };
    });
    setNewResource('');
    setShowResourceInput(false);
  };

  const handleRemoveResource = (index) => {
    setEditedProject((prev) => {
      const currentResources = prev.resources || [];
      const nextResources = currentResources.filter((_, i) => i !== index);
      return {
        ...prev,
        resources: nextResources,
        properties: { ...prev.properties, resources: nextResources },
      };
    });
  };

  // Validación en orden de lectura del formulario. Devuelve los errores y la
  // referencia del primer campo a enfocar.
  const validate = () => {
    const nextErrors = {};
    const order = [];
    const recordingDates = sanitizeRecordingDates(editedProject.recordingDates || editedProject.recordingDate);
    const managers = Array.isArray(editedProject.managers) ? editedProject.managers.filter(Boolean) : [];

    if (!isAbsenceStage && !(editedProject.name || '').trim()) {
      nextErrors.name = 'Escribe el nombre del proyecto.';
      order.push(nameRef);
    }
    if (!isAbsenceStage && !(editedProject.client || '').trim()) {
      nextErrors.client = 'Elige un cliente o agrega uno nuevo.';
      order.push(clientRef);
    }
    if (isAbsenceStage && managers.length === 0) {
      nextErrors.managers = 'Elige quién no va a estar.';
      order.push(managerTriggerRef);
    }
    if (usesDayPicker && recordingDates.length === 0) {
      nextErrors.recordingDates = isAbsenceStage
        ? 'Agrega al menos un día de ausencia.'
        : 'Agrega al menos un día de grabación.';
      order.push(dayInputRef);
    }
    if (!usesDayPicker) {
      if (editedProject.startDate && !parseProjectDate(editedProject.startDate)) {
        nextErrors.startDate = `Revisa el año de la fecha de inicio (entre ${MIN_PLAUSIBLE_YEAR} y ${MAX_PLAUSIBLE_YEAR}).`;
      }
    }
    if (editedProject.deadline) {
      const deadline = parseProjectDate(editedProject.deadline);
      const start = usesDayPicker
        ? parseProjectDate(recordingDates[recordingDates.length - 1])
        : parseProjectDate(editedProject.startDate);
      if (!deadline) {
        nextErrors.deadline = `Revisa el año de la fecha de entrega (entre ${MIN_PLAUSIBLE_YEAR} y ${MAX_PLAUSIBLE_YEAR}).`;
        order.push(deadlineRef);
      } else if (start && deadline < start) {
        nextErrors.deadline = usesDayPicker
          ? 'La entrega no puede ser antes del último día de grabación.'
          : 'La entrega no puede ser antes del inicio.';
        order.push(deadlineRef);
      }
    }
    // Completado exige el link del entregable (así la Galería es confiable).
    const becomesCompleted = editedProject.status === 'Completado' && originalStatus !== 'Completado';
    if (!isAbsenceStage && becomesCompleted && !(editedProject.deliverableLink || '').trim()) {
      nextErrors.deliverableLink = 'Agrega el link del entregable para marcar el proyecto como Completado.';
      order.push(deliverableRef);
    }
    return { nextErrors, firstRef: order[0] || null };
  };

  const handleSave = async () => {
    if (saving) return;
    const { nextErrors, firstRef } = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      firstRef?.current?.focus();
      return;
    }

    const resources = editedProject.resources || [];
    const stage = (editedProject.stage || STAGES.GRABACION).toLowerCase();
    const registrationType = editedProject.registrationType || editedProject.type || '';
    const recordingDates = sanitizeRecordingDates(
      editedProject.recordingDates || editedProject.recordingDate
    );
    const recordingDate = recordingDates[0] || '';
    const recordingTime = editedProject.recordingTime || '';
    const recordingLocation = editedProject.recordingLocation || '';
    const recordingDescription = editedProject.recordingDescription || '';
    const managers = Array.isArray(editedProject.managers)
      ? editedProject.managers.filter((manager) => manager && manager.trim().length > 0)
      : editedProject.manager
        ? editedProject.manager
          .split(',')
          .map((manager) => manager.trim())
          .filter(Boolean)
        : [];
    const managerString = managers.join(', ');

    // Cliente con el nombre ya existente si coincide ("fuso" → "Fuso").
    const client = isAbsenceStage
      ? 'Interno'
      : findMatchingClientOption(editedProject.client) || (editedProject.client || '').trim();
    const name = isAbsenceStage
      ? (editedProject.name || '').trim() || `Ausencia — ${managers.join(', ')}`
      : (editedProject.name || '').trim();

    const trimmedDeliverableLink = (editedProject.deliverableLink || '').toString().trim();

    const updatedProperties = {
      ...editedProject.properties,
      resources,
      managers,
      registrationType,
      stage,
      client,
      recordingTime,
      recordingLocation,
      recordingDescription,
    };

    if (trimmedDeliverableLink) {
      updatedProperties.deliverableLink = trimmedDeliverableLink;
    } else {
      delete updatedProperties.deliverableLink;
    }

    if (recordingDate) {
      updatedProperties.fechaGrabacion = recordingDate;
    } else {
      delete updatedProperties.fechaGrabacion;
    }

    // Progreso manual (%): vacío = automático según estado (ver STATUS_PROGRESS
    // en MyPriorities). Si hay valor, se clampea a 0–100.
    const rawProgressValue = editedProject.properties?.progress;
    if (rawProgressValue === '' || rawProgressValue === null || rawProgressValue === undefined) {
      delete updatedProperties.progress;
    } else {
      const parsedProgress = Number.parseInt(rawProgressValue, 10);
      if (Number.isNaN(parsedProgress)) {
        delete updatedProperties.progress;
      } else {
        updatedProperties.progress = Math.min(100, Math.max(0, parsedProgress));
      }
    }

    if (recordingDates.length > 0) {
      updatedProperties.recordingDates = recordingDates;
    } else {
      delete updatedProperties.recordingDates;
    }

    if (!registrationType) delete updatedProperties.registrationType;
    if (!recordingTime) delete updatedProperties.recordingTime;
    if (!recordingLocation) delete updatedProperties.recordingLocation;
    if (!recordingDescription) delete updatedProperties.recordingDescription;

    let startDate = editedProject.startDate || '';
    let deadline = editedProject.deadline || '';
    if (usesDayPicker) {
      startDate = recordingDate || startDate;
    }
    if (isAbsenceStage) {
      deadline = recordingDates[recordingDates.length - 1] || deadline;
    }

    const payload = {
      ...editedProject,
      name,
      client,
      status: isAbsenceStage ? 'Programado' : editedProject.status,
      manager: managers[0] || managerString || '',
      managers,
      startDate,
      deadline: deadline || null,
      type: registrationType || editedProject.type || '',
      registrationType,
      stage,
      fechaGrabacion: recordingDate || null,
      recordingDate,
      recordingDates,
      recordingTime,
      recordingLocation,
      recordingDescription,
      properties: updatedProperties,
    };

    // Eliminar deliverableLink del objeto principal para evitar conflictos con el esquema de la base de datos.
    delete payload.deliverableLink;

    delete payload.resources;

    setSaving(true);
    const isNew = !payload.id;
    const result = isNew ? await addProject(payload) : await updateProject(payload);
    setSaving(false);

    if (!result?.ok) {
      setErrors((prev) => ({
        ...prev,
        form: 'No se pudo guardar. Revisa tu conexión e intenta de nuevo; tus cambios siguen aquí.',
      }));
      return;
    }

    toast.success(
      isAbsenceStage
        ? isNew ? 'Ausencia registrada' : 'Ausencia actualizada'
        : isNew ? 'Proyecto creado' : 'Cambios guardados'
    );

    // Cerezo Hub Phase 5: Check-out
    if (payload.status === 'Completado' && originalStatus !== 'Completado') {
      const u = useStore.getState().currentUser;
      if (u) {
        const term = (u.user_metadata?.full_name || u.email || '').toLowerCase();
        // Buscar otras tareas activas del usuario
        const activeTasks = projects.filter(p => {
          if (p.id === payload.id) return false;
          if (p.status === 'Completado') return false;
          const m = (p.managers || []).join(' ').toLowerCase() + ' ' + (p.manager || '').toLowerCase();
          return m.includes(term.split('@')[0]) || m.includes(term.split(' ')[0]);
        });

        if (activeTasks.length === 0) {
          // Última tarea completada
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FF4B2A', '#10B981', '#3B82F6']
          });
          toast.success('¡Has completado todas tus tareas de hoy! Modo Fuera de la oficina activado.', { duration: 5000 });
          useStore.getState().setUserAvailability('Fuera de la oficina');
        }
      }
    }

    closeModal();
  };

  const handleDelete = async () => {
    if (!editedProject.id) return;
    const project = editedProject;
    closeModal();
    await deleteProjectWithUndo(project);
  };

  const stageButtonClass = (value) => {
    const active = currentStage === value;
    if (!active) {
      return 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white/60';
    }
    if (value === STAGES.AUSENCIA) return 'border-slate-500 bg-slate-100 text-slate-800 shadow-sm dark:bg-white/15 dark:text-white';
    return 'border-accent bg-accent/10 text-accent shadow-sm';
  };

  const dayCountLabel = (editedProject?.recordingDates || []).length;

  return (
    <Transition.Root show={isModalOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={requestClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0">
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-stretch justify-center p-0 text-center sm:items-center sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-6 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-4 scale-95">
              <Dialog.Panel className="flex h-full w-full max-w-full transform flex-col overflow-hidden rounded-none border border-border bg-white text-left align-middle shadow-2xl transition-all sm:h-auto sm:max-w-4xl sm:rounded-xl dark:border-white/5 dark:bg-[#16171D] dark:shadow-[0_48px_96px_rgba(0,0,0,0.8)]">
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/40 px-4 py-4 sm:px-8 sm:py-6">
                  <div className="flex-1">
                    <Dialog.Title className="sr-only">
                      {isAbsenceStage ? 'Ausencia' : editedProject.id ? 'Editar proyecto' : 'Nuevo proyecto'}
                    </Dialog.Title>
                    <label htmlFor="project-name" className="sr-only">
                      {isAbsenceStage ? 'Nombre de la ausencia (opcional)' : 'Nombre del proyecto'}
                    </label>
                    <input
                      ref={nameRef}
                      id="project-name"
                      type="text"
                      name="name"
                      value={editedProject?.name || ''}
                      onChange={handleInputChange}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? 'error-name' : undefined}
                      className="w-full bg-transparent text-3xl font-semibold text-primary tracking-tight placeholder:text-secondary/50 focus:outline-none dark:text-white dark:placeholder:text-white/30"
                      placeholder={isAbsenceStage ? 'Ausencia (opcional: vacaciones, permiso…)' : 'Nombre del proyecto'}
                    />
                    <FieldError id="error-name" message={errors.name} />
                  </div>
                  <button
                    type="button"
                    onClick={requestClose}
                    aria-label="Cerrar"
                    title="Cerrar"
                    className="group rounded-lg border border-border bg-white p-3 text-secondary transition-all hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    <X size={24} className="transition-transform group-hover:rotate-90" />
                  </button>
                </div>

                <div className="grid max-h-[68vh] flex-1 gap-8 overflow-y-auto px-4 py-6 soft-scroll sm:px-6 md:grid-cols-2">
                  <div className="space-y-5">
                    <div>
                      <span className={labelClass}>Fase</span>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Fase">
                        {STAGE_BUTTONS.map((button) => (
                          <button
                            key={button.value}
                            type="button"
                            aria-pressed={currentStage === button.value}
                            onClick={() => handleStageChange(button.value)}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${stageButtonClass(button.value)}`}
                          >
                            {button.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {!isAbsenceStage && (
                      <div>
                        <label htmlFor="project-client" className={labelClass}>Cliente</label>
                        <select
                          ref={clientRef}
                          id="project-client"
                          value={clientSelection}
                          onChange={handleClientSelectionChange}
                          disabled={enforceFranciscoClient}
                          aria-invalid={Boolean(errors.client) && !isCustomClient}
                          className={`${inputClass} ${errors.client && !isCustomClient ? inputError : inputOk} disabled:cursor-not-allowed disabled:bg-gray-100`}
                        >
                          {!enforceFranciscoClient && (
                            <option value="">Selecciona un cliente</option>
                          )}
                          {availableClientOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                          {canAddCustomClient && (
                            <option value="__new__">Agregar nuevo cliente…</option>
                          )}
                        </select>
                        {canAddCustomClient && isCustomClient && (
                          <input
                            type="text"
                            name="client"
                            aria-label="Nombre del nuevo cliente"
                            value={editedProject?.client || ''}
                            onChange={handleCustomClientChange}
                            aria-invalid={Boolean(errors.client)}
                            className={`${inputClass} ${errors.client ? inputError : inputOk} mt-3`}
                            placeholder="Nombre del nuevo cliente"
                          />
                        )}
                        <FieldError message={errors.client} />
                      </div>
                    )}

                    {isRecordingStage && (
                      <div>
                        <label htmlFor="project-format" className={labelClass}>Formato</label>
                        <select
                          id="project-format"
                          value={editedProject?.registrationType || ''}
                          onChange={handleRegistrationTypeChange}
                          className={`${inputClass} ${inputOk}`}
                        >
                          <option value="" disabled>
                            Selecciona una opción
                          </option>
                          {REGISTRATION_TYPES.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!isAbsenceStage && (
                      <div>
                        <label htmlFor="project-status" className={labelClass}>Estado</label>
                        <select
                          id="project-status"
                          name="status"
                          value={editedProject?.status || 'Programado'}
                          onChange={handleInputChange}
                          className={`${inputClass} ${inputOk}`}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!isAbsenceStage && (
                      <div>
                        <label htmlFor="project-progress" className={labelClass}>Progreso manual (%)</label>
                        <div className="mt-2 flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            aria-label="Progreso"
                            value={hasManualProgress ? Number(rawProgress) : autoProgress}
                            onChange={(e) => handlePropertyChange('progress', e.target.value)}
                            className="h-2 w-full cursor-pointer accent-[#FF4B2A]"
                          />
                          <input
                            id="project-progress"
                            type="number"
                            min="0"
                            max="100"
                            value={hasManualProgress ? rawProgress : ''}
                            onChange={(e) => handlePropertyChange('progress', e.target.value)}
                            placeholder={`${autoProgress}`}
                            className="w-20 shrink-0 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-center text-sm text-gray-800 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-white/10 dark:bg-[#0d0f1a] dark:text-white/85"
                          />
                          {hasManualProgress && (
                            <button
                              type="button"
                              onClick={() => handlePropertyChange('progress', '')}
                              className="shrink-0 text-xs font-medium text-secondary underline-offset-2 hover:text-primary hover:underline"
                            >
                              Auto
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-600 dark:text-white/50">
                          Vacío = automático según el estado ({autoProgress}%). Se ve en &quot;Tus prioridades&quot; de Inicio.
                        </p>
                      </div>
                    )}

                    <div>
                      <span id="managers-label" className={labelClass}>{isAbsenceStage ? 'Quién no va a estar' : 'Responsables'}</span>
                      <div ref={managerDropdownRef} className="relative mt-2" onKeyDown={handleManagerKeyDown}>
                        <div
                          ref={managerTriggerRef}
                          role="button"
                          tabIndex={0}
                          aria-haspopup="listbox"
                          aria-expanded={isManagerDropdownOpen}
                          aria-labelledby="managers-label"
                          aria-describedby={errors.managers ? 'error-managers' : undefined}
                          onClick={() => setIsManagerDropdownOpen((prev) => !prev)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setIsManagerDropdownOpen((prev) => !prev);
                            }
                          }}
                          className={`flex w-full items-center justify-between gap-3 rounded-lg border bg-white px-4 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 dark:bg-[#0d0f1a] dark:text-white/85 ${errors.managers ? inputError : inputOk}`}
                        >
                          <div className="flex w-full flex-wrap items-center gap-2 text-left">
                            {selectedManagers.length > 0 ? (
                              selectedManagers.map((manager) => (
                                <span
                                  key={manager}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 py-1 pl-1 pr-2 text-xs font-medium text-primary dark:text-white"
                                >
                                  <MemberAvatar name={manager} size="sm" />
                                  {manager}
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleManagerRemove(manager);
                                    }}
                                    aria-label={`Quitar a ${manager}`}
                                    className="text-secondary transition hover:text-red-500"
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className="text-secondary">{isAbsenceStage ? 'Selecciona a la persona' : 'Selecciona responsables'}</span>
                            )}
                          </div>
                          <ChevronDown
                            size={16}
                            className={`ml-auto shrink-0 text-gray-500 transition ${isManagerDropdownOpen ? 'rotate-180 text-accent' : ''}`}
                          />
                        </div>
                        {isManagerDropdownOpen && (
                          <div
                            role="listbox"
                            aria-labelledby="managers-label"
                            className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-lg dark:border-white/10 dark:bg-[#16171D]"
                          >
                            {availableManagers.length > 0 ? (
                              availableManagers.map((manager) => {
                                // Disponibilidad en los días elegidos (desde hoy).
                                const commitments = upcomingDraftDays.length
                                  ? getMemberCommitments(scheduleIndex, manager, upcomingDraftDays, editedProject.id)
                                  : [];
                                const absent = commitments.filter((c) => c.kind === 'absence');
                                const busy = commitments.filter((c) => c.kind !== 'absence');
                                return (
                                  <button
                                    key={manager}
                                    type="button"
                                    role="option"
                                    aria-selected={false}
                                    onClick={() => handleManagerSelect(manager)}
                                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-gray-800 transition hover:bg-gray-100 dark:text-white/85 dark:hover:bg-white/5"
                                  >
                                    <MemberAvatar name={manager} size="sm" />
                                    <span className="flex-1 font-medium">{manager}</span>
                                    {upcomingDraftDays.length > 0 && (
                                      absent.length > 0 ? (
                                        <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                          Ausente {formatShortDay(absent[0].day)}
                                        </span>
                                      ) : busy.length > 0 ? (
                                        <span className="max-w-[60%] truncate text-xs font-medium text-amber-700 dark:text-amber-400" title={busy.map((c) => `${formatShortDay(c.day)}: ${c.project.name}`).join(' · ')}>
                                          Ocupado {formatShortDay(busy[0].day)} · {busy[0].project.name}
                                        </span>
                                      ) : (
                                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Libre</span>
                                      )
                                    )}
                                  </button>
                                );
                              })
                            ) : (
                              <p className="px-3 py-2 text-xs text-gray-600 dark:text-white/50">
                                {teamMembers && teamMembers.length > 0
                                  ? 'No quedan responsables por asignar.'
                                  : 'Sin integrantes disponibles.'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <FieldError id="error-managers" message={errors.managers} />
                      {usesDayPicker && upcomingDraftDays.length === 0 && (
                        <p className="mt-1 text-xs text-gray-600 dark:text-white/50">
                          Agrega los días para ver quién está libre.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-5">
                    {usesDayPicker && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <label htmlFor="add-day" className={labelClass}>
                            {isAbsenceStage ? 'Días de ausencia' : 'Días de grabación'}
                          </label>
                          {isRecordingStage && (
                            <button
                              type="button"
                              onClick={handleOpenRecordingCalendar}
                              disabled={!editedProject.recordingDate}
                              className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${editedProject.recordingDate
                                ? 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20'
                                : 'cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-white/40'
                                }`}
                            >
                              <Calendar size={14} />
                              Agendar en Google Calendar
                            </button>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {(editedProject?.recordingDates || []).map((date) => (
                            <span
                              key={date}
                              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${isAbsenceStage ? 'bg-slate-200 text-slate-800 dark:bg-white/15 dark:text-white' : 'bg-accent/10 text-[#C2321A] dark:bg-accent/15 dark:text-[#FF8A73]'}`}
                            >
                              <Calendar size={12} />
                              {formatDayChip(date)}
                              <button
                                type="button"
                                onClick={() => handleRemoveRecordingDate(date)}
                                className="transition hover:opacity-70"
                                aria-label={`Quitar ${formatDayChip(date)}`}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                          <input
                            ref={dayInputRef}
                            id="add-day"
                            type="date"
                            min={`${MIN_PLAUSIBLE_YEAR}-01-01`}
                            max={`${MAX_PLAUSIBLE_YEAR}-12-31`}
                            value={pendingDay}
                            onChange={handlePendingDayChange}
                            onBlur={validatePendingDay}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                validatePendingDay();
                              }
                            }}
                            aria-invalid={Boolean(errors.recordingDates)}
                            aria-describedby="days-help"
                            className={`rounded-lg border border-dashed bg-white px-3 py-1.5 text-xs text-gray-800 focus:outline-none focus:ring-2 dark:bg-[#0d0f1a] dark:text-white/80 ${errors.recordingDates ? inputError : 'border-gray-400 focus:border-accent focus:ring-accent/20 dark:border-white/20'}`}
                          />
                        </div>
                        <FieldError message={errors.recordingDates} />
                        <p id="days-help" className="mt-2 text-xs text-gray-600 dark:text-white/50">
                          {dayCountLabel > 0
                            ? isAbsenceStage
                              ? `${dayCountLabel} día(s). Aparecen en el Timeline y en el aviso de cruces.`
                              : `${dayCountLabel} día(s). Cada día aparece en el calendario con sus responsables; edición arranca después del último.`
                            : 'Elige un día y se agrega solo. Puedes agregar varios y saltarte los fines de semana.'}
                        </p>

                        {conflicts.length > 0 && (
                          <div role="status" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                            <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                              <AlertTriangle size={15} />
                              Cruce de agenda
                            </p>
                            <ul className="mt-1.5 space-y-1 text-xs text-amber-900 dark:text-amber-200/90">
                              {conflicts.slice(0, 6).map((conflict) => (
                                <li key={`${conflict.member}-${conflict.day}-${conflict.project.id || conflict.project.name}`}>
                                  {conflict.kind === 'absence'
                                    ? `${conflict.member} no está el ${formatDayChip(conflict.day)}.`
                                    : `${conflict.member} ya tiene «${conflict.project.name || 'otro proyecto'}» el ${formatDayChip(conflict.day)}.`}
                                </li>
                              ))}
                              {conflicts.length > 6 && <li>Y {conflicts.length - 6} cruce(s) más.</li>}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {isRecordingStage && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label htmlFor="recording-time" className={labelClass}>Hora</label>
                          <input
                            id="recording-time"
                            type="time"
                            value={editedProject?.recordingTime || ''}
                            onChange={handleRecordingFieldChange('recordingTime')}
                            className={`${inputClass} ${inputOk}`}
                          />
                        </div>
                        <div>
                          <label htmlFor="recording-location" className={labelClass}>Lugar</label>
                          <input
                            id="recording-location"
                            type="text"
                            value={editedProject?.recordingLocation || ''}
                            onChange={handleRecordingFieldChange('recordingLocation')}
                            className={`${inputClass} ${inputOk}`}
                            placeholder="Estudio, locación, referencia"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label htmlFor="recording-deadline" className={labelClass}>Entrega al cliente</label>
                          <input
                            ref={deadlineRef}
                            id="recording-deadline"
                            type="date"
                            name="deadline"
                            min={`${MIN_PLAUSIBLE_YEAR}-01-01`}
                            max={`${MAX_PLAUSIBLE_YEAR}-12-31`}
                            value={editedProject?.deadline || ''}
                            onChange={handleInputChange}
                            aria-invalid={Boolean(errors.deadline)}
                            className={`${inputClass} ${errors.deadline ? inputError : inputOk}`}
                          />
                          <FieldError message={errors.deadline} />
                          {deliveryEstimate && (
                            <button
                              type="button"
                              onClick={() => {
                                clearError('deadline');
                                setEditedProject((prev) => ({ ...prev, deadline: format(deliveryEstimate.date, 'yyyy-MM-dd') }));
                              }}
                              className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/5 px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-accent/10 dark:text-white/85"
                            >
                              <Sparkles size={12} className="text-accent" />
                              Usar {format(deliveryEstimate.date, "EEE d MMM", { locale: es })}
                              <span className="text-secondary dark:text-white/50">
                                · {deliveryEstimate.formatLabel} suele tardar {deliveryEstimate.days} días
                              </span>
                            </button>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <label htmlFor="recording-description" className={labelClass}>Descripción de la grabación</label>
                          <textarea
                            id="recording-description"
                            value={editedProject?.recordingDescription || ''}
                            onChange={handleRecordingFieldChange('recordingDescription')}
                            rows={3}
                            className={`${inputClass} ${inputOk}`}
                            placeholder="Ángulos, requerimientos técnicos o mensajes clave"
                          />
                        </div>
                      </div>
                    )}

                    {!usesDayPicker && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label htmlFor="project-start" className={labelClass}>Fecha de inicio</label>
                          <input
                            id="project-start"
                            type="date"
                            name="startDate"
                            min={`${MIN_PLAUSIBLE_YEAR}-01-01`}
                            max={`${MAX_PLAUSIBLE_YEAR}-12-31`}
                            value={editedProject?.startDate || ''}
                            onChange={handleInputChange}
                            aria-invalid={Boolean(errors.startDate)}
                            className={`${inputClass} ${errors.startDate ? inputError : inputOk}`}
                          />
                          <FieldError message={errors.startDate} />
                        </div>
                        <div>
                          <label htmlFor="project-deadline" className={labelClass}>Fecha de entrega</label>
                          <input
                            ref={deadlineRef}
                            id="project-deadline"
                            type="date"
                            name="deadline"
                            min={`${MIN_PLAUSIBLE_YEAR}-01-01`}
                            max={`${MAX_PLAUSIBLE_YEAR}-12-31`}
                            value={editedProject?.deadline || ''}
                            onChange={handleInputChange}
                            aria-invalid={Boolean(errors.deadline)}
                            className={`${inputClass} ${errors.deadline ? inputError : inputOk}`}
                          />
                          <FieldError message={errors.deadline} />
                        </div>
                      </div>
                    )}

                    <div>
                      <label htmlFor="project-description" className={labelClass}>
                        {isAbsenceStage ? 'Motivo (opcional)' : 'Descripción general'}
                      </label>
                      <textarea
                        id="project-description"
                        name="description"
                        value={editedProject?.description || ''}
                        onChange={handleInputChange}
                        rows={isAbsenceStage ? 2 : 4}
                        className={`${inputClass} ${inputOk}`}
                        placeholder={isAbsenceStage ? 'Vacaciones, permiso, viaje…' : 'Describe objetivos, entregables y contexto del proyecto'}
                      />
                    </div>

                    {!isAbsenceStage && (
                      <div>
                        <label htmlFor="project-team" className={labelClass}>Equipo</label>
                        <input
                          id="project-team"
                          type="text"
                          value={editedProject?.team?.join(', ') || ''}
                          onChange={handleTeamChange}
                          className={`${inputClass} ${inputOk}`}
                          placeholder="Nombre1, Nombre2, Nombre3"
                        />
                      </div>
                    )}
                  </div>

                  {!isAbsenceStage && (
                  <div className="md:col-span-2 space-y-6">
                    {editedProject?.properties?.tasks && editedProject.properties.tasks.length > 0 && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800">
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                          📋 Anotaciones de la Sala de Voz
                        </h4>
                        <div className="space-y-2">
                          {editedProject.properties.tasks.map(task => (
                            <div key={task.id} className="flex items-start gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                              <span className="mt-0.5">{task.completed ? '✅' : '⏳'}</span>
                              <span className={`text-sm ${task.completed ? 'text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                {task.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {editedProject?.status === 'Stuck' && (
                      <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/30 dark:bg-red-900/10 animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <h3 className="text-sm font-bold text-red-600 dark:text-red-400">Alerta de bloqueo / SOS</h3>
                        </div>
                        <div className="flex gap-3">
                          <textarea
                            value={sosComment}
                            onChange={(e) => setSosComment(e.target.value)}
                            aria-label="Motivo del bloqueo"
                            placeholder="Escribe el motivo del bloqueo (ej. error de render en el minuto 01:10)…"
                            className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-red-900/50 dark:bg-slate-900 dark:text-white"
                            rows={2}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              toast.error(`Notificación enviada a Edson: [${editedProject.manager || 'Alguien'} está atascado en ${editedProject.name}]`);
                              setSosComment('');
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-4 font-semibold text-sm transition-all"
                          >
                            Enviar alerta
                          </button>
                        </div>
                      </div>
                    )}

                    {editedProject?.status === 'En revisión' && (
                      <div className="animate-in slide-in-from-top-2">
                        <VideoReviewPlayer
                          project={editedProject}
                          onApprove={() => {
                            setEditedProject(prev => ({ ...prev, status: 'Completado' }));
                            toast.success('¡Video aprobado! Agrega el link del entregable y guarda.');
                          }}
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor="project-deliverable" className={labelClass}>
                        Entregable{editedProject.status === 'Completado' && <span className="text-red-600 dark:text-red-400"> *</span>}
                      </label>
                      <input
                        ref={deliverableRef}
                        id="project-deliverable"
                        type="url"
                        name="deliverableLink"
                        value={editedProject?.deliverableLink || ''}
                        onChange={handleInputChange}
                        aria-invalid={Boolean(errors.deliverableLink)}
                        className={`${inputClass} ${errors.deliverableLink ? inputError : inputOk}`}
                        placeholder="Link al video, carpeta o archivo final (Vimeo, YouTube, Drive…)"
                      />
                      <FieldError message={errors.deliverableLink} />
                      {!errors.deliverableLink && editedProject.status === 'Completado' && !(editedProject.deliverableLink || '').trim() && (
                        <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
                          Este proyecto está completado pero no tiene entregable: no aparecerá en la Galería.
                        </p>
                      )}
                    </div>

                    <div>
                      <span className={labelClass}>Recursos compartidos</span>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(editedProject.resources || []).length === 0 ? (
                          <span className="text-xs text-gray-600 dark:text-white/50">Sin enlaces añadidos.</span>
                        ) : (
                          editedProject.resources.map((resource, index) => (
                            <div
                              key={`${resource}-${index}`}
                              className="group flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-800 shadow-sm transition hover:border-accent/40 dark:border-white/10 dark:bg-white/5 dark:text-white/80"
                            >
                              <a
                                href={resource}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="max-w-[200px] truncate text-[#C2321A] underline-offset-2 hover:underline dark:text-[#FF8A73]"
                              >
                                {resource}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveResource(index)}
                                aria-label={`Quitar recurso ${resource}`}
                                className="rounded-full bg-gray-200 p-1 text-gray-600 transition hover:bg-red-500 hover:text-white dark:bg-white/10 dark:text-white/60"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                      {showResourceInput ? (
                        <div className="mt-3 flex items-center gap-2">
                          <input
                            type="url"
                            autoFocus
                            aria-label="Link del recurso"
                            value={newResource}
                            onChange={(e) => setNewResource(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddResource();
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowResourceInput(false);
                                setNewResource('');
                              }
                            }}
                            placeholder="https://…"
                            className={`${inputClass} ${inputOk} mt-0 flex-1`}
                          />
                          <button
                            type="button"
                            onClick={handleAddResource}
                            className="rounded-md bg-dark-bg px-3 py-2 text-xs font-semibold text-white dark:bg-accent"
                          >
                            Añadir
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowResourceInput(false); setNewResource(''); }}
                            className="rounded-md px-3 py-2 text-xs font-medium text-secondary hover:bg-gray-100 dark:text-white/60 dark:hover:bg-white/5"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowResourceInput(true)}
                          className="mt-3 inline-flex items-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-[#C2321A] transition hover:bg-accent/20 dark:text-[#FF8A73]"
                        >
                          <Plus size={14} />
                          Añadir recurso
                        </button>
                      )}
                    </div>
                  </div>
                  )}

                  {editedProject.id && !isAbsenceStage && customPropertyEntries.length > 0 && (
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-white/80">
                        Propiedades personalizadas
                      </h3>
                      <div className="mt-3 space-y-4">
                        {customPropertyEntries
                          .map(([key, value]) => (
                            <div
                              key={key}
                              className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50/70 p-4 md:flex-row md:items-center md:gap-4 dark:border-white/10 dark:bg-white/[0.03]"
                            >
                              <input
                                type="text"
                                value={key}
                                disabled
                                aria-label="Nombre de la propiedad"
                                className="w-full rounded-md bg-gray-200 px-3 py-2 text-xs text-gray-700 md:max-w-[200px] dark:bg-white/10 dark:text-white/70"
                              />
                              <input
                                type="text"
                                value={value}
                                aria-label={`Valor de ${key}`}
                                onChange={(event) => handlePropertyChange(key, event.target.value)}
                                className="w-full rounded-md bg-white border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-accent/20 dark:border-white/10 dark:bg-[#0d0f1a] dark:text-white/85"
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 border-t border-border/40 bg-slate-50 px-4 py-5 sm:px-10 dark:border-white/5 dark:bg-[#0B0C10]/50">
                  {errors.form && (
                    <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                      {errors.form}
                    </p>
                  )}
                  {showDiscardConfirm ? (
                    <div role="alertdialog" aria-label="Cambios sin guardar" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-medium text-primary dark:text-white">
                        Tienes cambios sin guardar. ¿Quieres descartarlos?
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          autoFocus
                          onClick={() => setShowDiscardConfirm(false)}
                          className="min-h-[44px] rounded-lg border border-border bg-white px-5 py-2 text-sm font-semibold text-primary transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        >
                          Seguir editando
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowDiscardConfirm(false); closeModal(); }}
                          className="min-h-[44px] rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                          Descartar cambios
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      {editedProject.id ? (
                        confirmDelete ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">¿Eliminar {isAbsenceStage ? 'esta ausencia' : 'este proyecto'}?</span>
                            <button
                              type="button"
                              onClick={handleDelete}
                              className="min-h-[40px] rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                            >
                              Sí, eliminar
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(false)}
                              className="min-h-[40px] rounded-lg px-3 py-2 text-sm font-medium text-secondary hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/5"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-transparent px-4 py-2 text-sm font-semibold text-red-600 transition-all hover:bg-red-500/10 active:scale-95 dark:text-red-400"
                            onClick={() => setConfirmDelete(true)}
                          >
                            <Trash2 size={18} />
                            Eliminar
                          </button>
                        )
                      ) : (
                        <span className="text-sm font-medium text-secondary dark:text-white/50">
                          {isAbsenceStage ? 'Nueva ausencia' : 'Nuevo proyecto'}
                        </span>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="min-h-[48px] rounded-lg border border-border bg-white px-8 py-2 text-sm font-semibold text-secondary transition-all hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
                          onClick={requestClose}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          className="min-h-[48px] rounded-lg bg-dark-bg px-10 py-2 text-sm font-semibold text-white shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl active:scale-95 disabled:cursor-wait disabled:opacity-70 dark:bg-accent dark:text-dark-bg dark:shadow-accent/20"
                          onClick={handleSave}
                        >
                          {saving
                            ? 'Guardando…'
                            : editedProject.id
                              ? 'Guardar cambios'
                              : isAbsenceStage ? 'Registrar ausencia' : 'Crear proyecto'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ModalDetalles;
