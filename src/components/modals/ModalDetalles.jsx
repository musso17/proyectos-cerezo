"use client";

import React, { Fragment, useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Plus, Trash2, Calendar, ChevronDown } from 'lucide-react';
import useStore from '../../hooks/useStore';
import { generarLinkGoogleCalendar } from '../../utils/calendar';

const REGISTRATION_TYPES = [
  { value: 'spot', label: 'Spot' },
  { value: 'evento', label: 'Evento' },
  { value: 'contenido', label: 'Contenido' },
  { value: 'lanzamiento', label: 'Lanzamiento' },
];

const STAGES = {
  GRABACION: 'grabacion',
  EDICION: 'edicion',
};

const ModalDetalles = () => {
  const isModalOpen = useStore((state) => state.isModalOpen);
  const closeModal = useStore((state) => state.closeModal);
  const selectedProject = useStore((state) => state.selectedProject);
  const updateProject = useStore((state) => state.updateProject);
  const addProject = useStore((state) => state.addProject);
  const deleteProject = useStore((state) => state.deleteProject);
  const teamMembers = useStore((state) => state.teamMembers);
  const projects = useStore((state) => state.projects);
  const currentUser = useStore((state) => state.currentUser);
  const [editedProject, setEditedProject] = useState(null);
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);
  const managerDropdownRef = useRef(null);
  const [clientSelection, setClientSelection] = useState('');
  const [isCustomClient, setIsCustomClient] = useState(false);

  const isFranciscoUser = (user) =>
    user?.email?.toString().trim().toLowerCase() === 'francisco@carbonomkt.com';

  const normalizedClientOptions = useMemo(() => {
    const seen = new Map();
    (projects || []).forEach((project) => {
      const candidates = [
        project.client,
        project.cliente,
        project.properties?.client,
        project.properties?.cliente,
      ];
      candidates.forEach((value) => {
        const trimmed = value?.toString().trim();
        if (!trimmed) return;
        const normalized = trimmed.toLowerCase();
        if (!seen.has(normalized)) {
          seen.set(normalized, trimmed);
        }
      });
    });
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, 'es'));
  }, [projects]);

  const enforceFranciscoClient = isFranciscoUser(currentUser);
  const availableClientOptions = enforceFranciscoClient ? ['Carbono'] : normalizedClientOptions;
  const canAddCustomClient = !enforceFranciscoClient;

  const findMatchingClientOption = (value) => {
    if (!value) return null;
    const normalized = value.toString().trim().toLowerCase();
    return (
      availableClientOptions.find(
        (option) => option.toString().trim().toLowerCase() === normalized
      ) || null
    );
  };

  useEffect(() => {
    if (selectedProject) {
      const properties = selectedProject.properties || {};
      const existingResources = Array.isArray(properties.resources)
        ? properties.resources.filter(Boolean)
        : Array.isArray(selectedProject.resources)
          ? selectedProject.resources.filter(Boolean)
          : [];
      const normalizedTeam = Array.isArray(selectedProject.team)
        ? selectedProject.team
        : typeof selectedProject.team === 'string' && selectedProject.team.length > 0
          ? selectedProject.team
              .split(',')
              .map((member) => member.trim())
              .filter(Boolean)
          : [];

      const normalizedManagers = Array.isArray(selectedProject.managers)
        ? selectedProject.managers
        : typeof selectedProject.manager === 'string' && selectedProject.manager.length > 0
          ? selectedProject.manager
              .split(',')
              .map((manager) => manager.trim())
              .filter(Boolean)
          : [];

      const defaultManager = teamMembers?.[0] || '';
      const rawStage = selectedProject.stage || properties.stage || '';
      const stage = rawStage ? rawStage.toString().trim().toLowerCase() : STAGES.GRABACION;
      const registrationType =
        selectedProject.registrationType || properties.registrationType || selectedProject.type || 'spot';
      const projectClient =
        (selectedProject.client ||
          selectedProject.cliente ||
          properties.client ||
          properties.cliente ||
          '').toString().trim();
      const recordingDate =
        selectedProject.recordingDate ||
        selectedProject.fechaGrabacion ||
        properties.fechaGrabacion ||
        '';
      const recordingTime = selectedProject.recordingTime || properties.recordingTime || '';
      const recordingLocation =
        selectedProject.recordingLocation || properties.recordingLocation || '';
      const recordingDescription =
        selectedProject.recordingDescription || properties.recordingDescription || '';

      const managers = normalizedManagers.length > 0 ? normalizedManagers : defaultManager ? [defaultManager] : [];

      const deliverableLink =
        (selectedProject.deliverableLink ||
          properties.deliverableLink ||
          properties.deliverable_link ||
          '')
          .toString()
          .trim();

      setEditedProject({
        ...selectedProject,
        manager: managers[0] || '',
        managers,
        startDate: selectedProject.startDate || '',
        deadline: selectedProject.deadline || '',
        team: normalizedTeam,
        registrationType,
        stage,
        recordingDate: recordingDate || '',
        recordingTime,
        recordingLocation,
        recordingDescription,
        deliverableLink,
        type: registrationType || selectedProject.type || '',
        status: selectedProject.status || 'Programado',
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
          deliverableLink,
          client: projectClient,
        },
        resources: existingResources,
      });
      setIsManagerDropdownOpen(false);
    } else {
      setEditedProject(null);
      setIsManagerDropdownOpen(false);
      setClientSelection('');
      setIsCustomClient(false);
    }
  }, [selectedProject, teamMembers]);

  useEffect(() => {
    if (editedProject && enforceFranciscoClient) {
      setEditedProject(prev => {
        if (prev.client === 'Carbono') return prev;
        return {
          ...prev,
          client: 'Carbono',
          properties: {
            ...prev.properties,
            client: 'Carbono',
          }
        }
      });
    }
  }, [enforceFranciscoClient, editedProject?.id]);

  useEffect(() => {
    if (editedProject) {
      const matchingOption = findMatchingClientOption(editedProject.client);
      if (enforceFranciscoClient) {
        setClientSelection('Carbono');
        setIsCustomClient(false);
      } else if (matchingOption) {
        setClientSelection(matchingOption);
        setIsCustomClient(false);
      } else if (editedProject.client) {
        setClientSelection('__new__');
        setIsCustomClient(true);
      } else {
        setClientSelection('');
        setIsCustomClient(false);
      }
    }
  }, [editedProject?.client, enforceFranciscoClient, availableClientOptions]);

  useEffect(() => {
    if (!isModalOpen) {
      setIsManagerDropdownOpen(false);
    }
  }, [isModalOpen]);

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

  if (!editedProject) return null;

  const selectedManagers = Array.isArray(editedProject.managers) ? editedProject.managers : [];
  const availableManagers = Array.isArray(teamMembers)
    ? teamMembers.filter((member) => !selectedManagers.includes(member))
    : [];

  const isRecordingStage = (editedProject.stage || '').toLowerCase() === STAGES.GRABACION;

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
    setClientSelection(value);
    if (value === '__new__') {
      setIsCustomClient(true);
      setEditedProject((prev) => ({
        ...prev,
        client: prev?.client || '',
        properties: { ...prev?.properties, client: prev?.client || '' },
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
    setEditedProject((prev) => {
      const nextStage = value;
      const next = {
        ...prev,
        stage: nextStage,
        properties: { ...prev.properties, stage: nextStage },
      };
      return next;
    });
  };

  const handleRecordingDateChange = (event) => {
    const value = event.target.value;
    setEditedProject((prev) => {
      const next = {
        ...prev,
        recordingDate: value,
        properties: { ...prev.properties, fechaGrabacion: value },
      };
      return next;
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
    const { name, client, recordingDate, recordingTime, recordingLocation, recordingDescription, team, managers } = editedProject;
    if (!recordingDate) return;
    const managerNames = Array.isArray(managers) && managers.length > 0 ? managers.join(', ') : editedProject.manager;
    const link = generarLinkGoogleCalendar({
      contenido: name,
      cliente: client,
      detalle: recordingDescription || editedProject.description || '',
      encargado: managerNames,
      fechaInicio: recordingDate,
      fechaFin: recordingDate,
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
    const url = window.prompt('Ingresa el enlace del recurso');
    if (!url) return;
    const trimmed = url.trim();
    if (!trimmed) return;
    setEditedProject((prev) => {
      const nextResources = [...(prev.resources || []), trimmed];
      return {
        ...prev,
        resources: nextResources,
        properties: { ...prev.properties, resources: nextResources },
      };
    });
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

  const handleSave = () => {
    const resources = editedProject.resources || [];
    const stage = (editedProject.stage || STAGES.GRABACION).toLowerCase();
    const registrationType = editedProject.registrationType || editedProject.type || '';
    const recordingDate = editedProject.recordingDate || '';
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

    if (stage === STAGES.GRABACION && !recordingDate) {
      window.alert('Ingresa la fecha de grabación para continuar.');
      return;
    }

    const trimmedDeliverableLink = (editedProject.deliverableLink || '').toString().trim();

    const updatedProperties = {
      ...editedProject.properties,
      resources,
      managers,
      registrationType,
      stage,
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

    if (!registrationType) delete updatedProperties.registrationType;
    if (!recordingTime) delete updatedProperties.recordingTime;
    if (!recordingLocation) delete updatedProperties.recordingLocation;
    if (!recordingDescription) delete updatedProperties.recordingDescription;

    const payload = {
      ...editedProject,
      manager: managers[0] || managerString || '',
      managers,
      startDate:
        stage === STAGES.GRABACION
          ? recordingDate || editedProject.startDate || '' : editedProject.startDate || '',
      deadline: stage === STAGES.GRABACION ? null : editedProject.deadline || '',
      type: registrationType || editedProject.type || '',
      registrationType,
      stage,
      fechaGrabacion: recordingDate || null,
      recordingDate,
      recordingTime,
      recordingLocation,
      recordingDescription,
      properties: updatedProperties,
    };

    // Eliminar deliverableLink del objeto principal para evitar conflictos con el esquema de la base de datos.
    delete payload.deliverableLink;

    delete payload.resources;

    if (payload.id) {
      updateProject(payload);
    } else {
      addProject(payload);
    }
    closeModal();
  };

  const handleDelete = () => {
    if (editedProject.id && window.confirm('¿Estás seguro de que deseas eliminar este proyecto?')) {
      deleteProject(editedProject.id);
      closeModal();
    }
  };

  return (
    <Transition.Root show={isModalOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeModal}>
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
              <Dialog.Panel className="flex h-full w-full max-w-full transform flex-col overflow-hidden rounded-none border border-gray-200 bg-white text-left align-middle shadow-xl transition-all sm:h-auto sm:max-w-4xl sm:rounded-xl dark:border-[#1f2030] dark:bg-[#10111c]/95 dark:shadow-[0_42px_88px_rgba(2,6,23,0.75)]">
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5">
                  <Dialog.Title className="flex-1">
                    <input
                      type="text"
                      name="name"
                      value={editedProject.name}
                      onChange={handleInputChange}
                      className="w-full bg-transparent text-2xl font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none"
                      placeholder="Nombre del proyecto"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Gestiona la información clave y comparte recursos con tu equipo.
                    </p>
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid max-h-[68vh] flex-1 gap-8 overflow-y-auto px-4 py-6 soft-scroll sm:px-6 md:grid-cols-2">
                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Cliente</label>
                      <select
                        value={clientSelection}
                        onChange={handleClientSelectionChange}
                        disabled={enforceFranciscoClient}
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:cursor-not-allowed disabled:bg-gray-100"
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
                          value={editedProject.client || ''}
                          onChange={handleCustomClientChange}
                          className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          placeholder="Ingresa un nuevo cliente"
                        />
                      )}
                    </div>

                    {isRecordingStage && (
                      <div>
                        <label className="text-sm font-medium text-gray-600">Tipo de registro</label>
                        <select
                          value={editedProject.registrationType || ''}
                          onChange={handleRegistrationTypeChange}
                          className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
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

                    <div>
                      <label className="text-sm font-medium text-gray-600">Fase</label>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleStageChange(STAGES.GRABACION)}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                            isRecordingStage
                              ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-sm'
                              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Grabación
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStageChange(STAGES.EDICION)}
                          className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                            !isRecordingStage
                              ? 'border-violet-500 bg-violet-50 text-violet-700 shadow-sm'
                              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Edición
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Estado</label>
                      <select
                        name="status"
                        value={editedProject.status || 'Programado'}
                        onChange={handleInputChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        <option value="Programado">Programado</option>
                        <option value="En progreso">En progreso</option>
                        <option value="En revisión">En revisión</option>
                        <option value="Completado">Completado</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Responsables</label>
                      <div ref={managerDropdownRef} className="relative mt-2">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setIsManagerDropdownOpen((prev) => !prev)}
                          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsManagerDropdownOpen((prev) => !prev)}
                          className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        >
                          <div className="flex w-full flex-wrap items-center gap-2 text-left pointer-events-none">
                            {selectedManagers.length > 0 ? (
                              selectedManagers.map((manager) => (
                                <span
                                  key={manager}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-violet-100 px-2 py-1 text-xs font-medium text-violet-700"
                                >
                                  {manager}
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleManagerRemove(manager);
                                    }}
                                    className="pointer-events-auto text-violet-500 transition hover:text-violet-700"
                                  >
                                    <X size={12} />
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className="text-secondary">Selecciona responsables</span>
                            )}
                          </div>
                          <ChevronDown
                            size={16}
                            className={`ml-auto shrink-0 text-gray-500 transition ${
                              isManagerDropdownOpen ? 'rotate-180 text-violet-600' : ''
                            }`}
                          />
                        </div>
                        {isManagerDropdownOpen && (
                          <div className="absolute left-0 right-0 z-30 mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-lg">
                            {availableManagers.length > 0 ? (
                              availableManagers.map((manager) => (
                                <button
                                  key={manager}
                                  type="button"
                                  onClick={() => handleManagerSelect(manager)}
                                  className="flex w-full items-center rounded-md px-3 py-2 text-left text-gray-800 transition hover:bg-gray-100"
                                >
                                  {manager}
                                </button>
                              ))
                            ) : (
                              <p className="px-3 py-2 text-xs text-gray-500">
                                {teamMembers && teamMembers.length > 0
                                  ? 'No quedan responsables por asignar.'
                                  : 'Sin integrantes disponibles.'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500">
                        Selecciona responsables desde la lista y elimínalos tocando la etiqueta.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Descripción general</label>
                      <textarea
                        name="description"
                        value={editedProject.description || ''}
                        onChange={handleInputChange}
                        rows={4}
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        placeholder="Describe objetivos, entregables y contexto del proyecto"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Equipo</label>
                      <input
                        type="text"
                        value={editedProject.team?.join(', ') || ''}
                        onChange={handleTeamChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        placeholder="Nombre1, Nombre2, Nombre3"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-6">
                    {isRecordingStage && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-white/10">
                          <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-white/80">
                              Detalles de la grabación
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-white/60">
                              Define fecha, hora, ubicación y contexto para coordinar el rodaje.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleOpenRecordingCalendar}
                            disabled={!editedProject.recordingDate}
                            className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
                              editedProject.recordingDate 
                                ? 'border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100'
                                : 'cursor-not-allowed border-gray-300 text-gray-400 bg-gray-100 dark:border-white/10 dark:text-white/30 dark:bg-white/5'
                            }`}
                          >
                            <Calendar size={14} />
                            Agendar grabación
                          </button>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-white/80">Día de grabación</label>
                            <input
                              type="date"
                              value={editedProject.recordingDate || ''}
                              onChange={handleRecordingDateChange}
                              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-white/10 dark:bg-[#0d0f1a] dark:text-white/80"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-white/80">Hora</label>
                            <input
                              type="time"
                              value={editedProject.recordingTime || ''}
                              onChange={handleRecordingFieldChange('recordingTime')}
                              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-white/10 dark:bg-[#0d0f1a] dark:text-white/80"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-white/80">Lugar</label>
                            <input
                              type="text"
                              value={editedProject.recordingLocation || ''}
                              onChange={handleRecordingFieldChange('recordingLocation')}
                              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-white/10 dark:bg-[#0d0f1a] dark:text-white/80 dark:placeholder:text-white/40"
                              placeholder="Estudio, locación, referencia"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600 dark:text-white/80">Descripción de la grabación</label>
                            <textarea
                              value={editedProject.recordingDescription || ''}
                              onChange={handleRecordingFieldChange('recordingDescription')}
                              rows={3}
                              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-white/10 dark:bg-[#0d0f1a] dark:text-white/80 dark:placeholder:text-white/40"
                              placeholder="Ángulos, requerimientos técnicos o mensajes clave"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={`${isRecordingStage ? 'hidden' : 'block'}`}>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                        Planificación
                      </h3>
                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Fecha de inicio</label>
                          <input
                            type="date"
                            name="startDate"
                            value={editedProject.startDate || ''}
                            onChange={handleInputChange}
                            className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          />
                        </div>
                        <div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">Fecha de entrega</label>
                            <input
                              type="date"
                              name="deadline"
                              value={editedProject.deadline || ''}
                              onChange={handleInputChange}
                              className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Entregable</label>
                      <input
                        type="text"
                        name="deliverableLink"
                        value={editedProject.deliverableLink || ''}
                        onChange={handleInputChange}
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        placeholder="Enlace al video, carpeta o archivo final"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-600">Recursos compartidos</label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(editedProject.resources || []).length === 0 ? (
                          <span className="text-xs text-gray-500">Sin enlaces añadidos.</span>
                        ) : (
                          editedProject.resources.map((resource, index) => (
                            <div
                              key={`${resource}-${index}`}
                              className="group flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-800 shadow-sm transition hover:border-violet-300"
                            >
                              <a
                                href={resource}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="max-w-[200px] truncate text-violet-600 transition group-hover:text-violet-700"
                              >
                                {resource}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveResource(index)}
                                className="rounded-full bg-gray-200 p-1 text-gray-500 transition hover:bg-red-500 hover:text-white"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleAddResource}
                        className="mt-3 inline-flex items-center gap-2 rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition hover:bg-violet-100"
                      >
                        <Plus size={14} />
                        Añadir recurso
                      </button>
                    </div>
                  </div>

                  {editedProject.id && (
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
                        Propiedades personalizadas
                      </h3>
                      <div className="mt-3 space-y-4">
                        {Object.entries(editedProject.properties)
                          .filter(
                            ([key]) =>
                              ![
                                'resources',
                                'registrationType',
                                'stage',
                                'recordingTime',
                                'recordingLocation',
                                'recordingDescription',
                                'fechaGrabacion',
                                'linkedRecordingId',
                              ].includes(key)
                          )
                          .map(([key, value]) => (
                            <div
                              key={key}
                              className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50/70 p-4 md:flex-row md:items-center md:gap-4"
                            >
                              <input
                                type="text"
                                value={key}
                                disabled
                                className="w-full rounded-md bg-gray-200 px-3 py-2 text-xs uppercase tracking-wide text-gray-500 md:max-w-[200px]"
                              />
                              <input
                                type="text"
                                value={value}
                                onChange={(event) => handlePropertyChange(key, event.target.value)}
                                className="w-full rounded-md bg-white border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-violet-500"
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-white/10 dark:bg-white/[0.03]">
                  {editedProject.id ? (
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-transparent px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                      onClick={handleDelete}
                    >
                      <Trash2 size={16} />
                      Eliminar proyecto
                    </button>
                  ) : (
                    <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-white/60">
                      Nuevo proyecto
                    </span>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:bg-[#151623] dark:text-white/80 dark:hover:bg-white/5"
                      onClick={closeModal}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="min-h-[44px] rounded-lg border border-transparent bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700 dark:bg-[#7C3AED] dark:hover:bg-[#8B5CF6]"
                      onClick={handleSave}
                    >
                      {editedProject.id ? 'Guardar cambios' : 'Crear proyecto'}
                    </button>
                  </div>
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
