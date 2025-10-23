"use client";

import React, { Fragment, useState, useEffect, useRef } from 'react';
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
  const [editedProject, setEditedProject] = useState(null);
  const [isManagerDropdownOpen, setIsManagerDropdownOpen] = useState(false);
  const managerDropdownRef = useRef(null);

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
      const recordingDate =
        selectedProject.recordingDate ||
        selectedProject.fechaGrabacion ||
        properties.fechaGrabacion ||
        selectedProject.startDate ||
        '';
      const recordingTime = selectedProject.recordingTime || properties.recordingTime || '';
      const recordingLocation =
        selectedProject.recordingLocation || properties.recordingLocation || '';
      const recordingDescription =
        selectedProject.recordingDescription || properties.recordingDescription || '';

      const managers = normalizedManagers.length > 0 ? normalizedManagers : defaultManager ? [defaultManager] : [];

      setEditedProject({
        ...selectedProject,
        manager: managers[0] || '',
        managers,
        startDate:
          selectedProject.startDate || (stage === STAGES.GRABACION ? recordingDate || '' : ''),
        deadline: selectedProject.deadline || '',
        team: normalizedTeam,
        registrationType,
        stage,
        recordingDate: recordingDate || '',
        recordingTime,
        recordingLocation,
        recordingDescription,
        type: registrationType || selectedProject.type || '',
        status: selectedProject.status || 'Pendiente',
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
        },
        resources: existingResources,
      });
      setIsManagerDropdownOpen(false);
    } else {
      setEditedProject(null);
      setIsManagerDropdownOpen(false);
    }
  }, [selectedProject, teamMembers]);

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
      if (nextStage === STAGES.GRABACION) {
        const recordingDate = prev.recordingDate || prev.startDate || '';
        next.recordingDate = recordingDate;
        next.startDate = recordingDate;
        next.properties = { ...next.properties, fechaGrabacion: recordingDate };
      }
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
      if ((prev.stage || '').toLowerCase() === STAGES.GRABACION) {
        next.startDate = value;
        if (!prev.deadline || prev.deadline === prev.recordingDate) {
          next.deadline = value;
        }
      }
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

    const startDate =
      stage === STAGES.GRABACION
        ? recordingDate || editedProject.startDate || ''
        : editedProject.startDate || '';

    const deadline = editedProject.deadline || (stage === STAGES.GRABACION ? startDate : editedProject.deadline);

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
      startDate,
      deadline,
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
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-6 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-4 scale-95">
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-3xl border border-border/80 bg-slate-950/95 text-left align-middle shadow-[0_48px_120px_rgba(2,6,23,0.65)] transition-all animate-modal-pop">
                <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
                  <Dialog.Title className="flex-1">
                    <input
                      type="text"
                      name="name"
                      value={editedProject.name}
                      onChange={handleInputChange}
                      className="w-full bg-transparent text-2xl font-semibold text-slate-50 placeholder:text-secondary focus:outline-none"
                      placeholder="Nombre del proyecto"
                    />
                    <p className="mt-2 text-sm text-secondary">
                      Gestiona la información clave y comparte recursos con tu equipo.
                    </p>
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-full border border-border/60 bg-slate-900 p-2 text-secondary shadow-[inset_0_1px_0_rgba(148,163,184,0.12)] transition hover:-translate-y-0.5 hover:border-accent/70 hover:text-accent"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid max-h-[68vh] gap-6 overflow-y-auto px-6 py-6 soft-scroll md:grid-cols-2">
                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-medium text-secondary">Cliente</label>
                      <input
                        type="text"
                        name="client"
                        value={editedProject.client || ''}
                        onChange={handleInputChange}
                        className="mt-2 w-full rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-2 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                        placeholder="Nombre del cliente"
                      />
                    </div>

                    {isRecordingStage && (
                      <div>
                        <label className="text-sm font-medium text-secondary">Tipo de registro</label>
                        <select
                          value={editedProject.registrationType || ''}
                          onChange={handleRegistrationTypeChange}
                          className="mt-2 w-full rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
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
                      <label className="text-sm font-medium text-secondary">Fase</label>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleStageChange(STAGES.GRABACION)}
                          className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                            isRecordingStage
                              ? 'border-accent/60 bg-emerald-500/10 text-accent shadow-[inset_0_1px_0_rgba(34,197,94,0.35)]'
                              : 'border-border/60 bg-slate-900/40 text-secondary hover:border-accent/50 hover:text-accent'
                          }`}
                        >
                          Grabación
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStageChange(STAGES.EDICION)}
                          className={`flex-1 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                            !isRecordingStage
                              ? 'border-accent/60 bg-emerald-500/10 text-accent shadow-[inset_0_1px_0_rgba(34,197,94,0.35)]'
                              : 'border-border/60 bg-slate-900/40 text-secondary hover:border-accent/50 hover:text-accent'
                          }`}
                        >
                          Edición
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-secondary">Estado</label>
                      <select
                        name="status"
                        value={editedProject.status || 'Pendiente'}
                        onChange={handleInputChange}
                        className="mt-2 w-full rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="En progreso">En progreso</option>
                        <option value="En revisión">En revisión</option>
                        <option value="Completado">Completado</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-secondary">Responsables</label>
                      <div ref={managerDropdownRef} className="relative mt-2">
                        <button
                          type="button"
                          onClick={() => setIsManagerDropdownOpen((prev) => !prev)}
                          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                        >
                          <div className="flex w-full flex-wrap items-center gap-2 text-left">
                            {selectedManagers.length > 0 ? (
                              selectedManagers.map((manager) => (
                                <span
                                  key={manager}
                                  className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
                                >
                                  {manager}
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleManagerRemove(manager);
                                    }}
                                    className="text-accent/80 transition hover:text-accent"
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
                            className={`ml-auto shrink-0 text-secondary transition ${
                              isManagerDropdownOpen ? 'rotate-180 text-accent' : ''
                            }`}
                          />
                        </button>
                        {isManagerDropdownOpen && (
                          <div className="absolute left-0 right-0 z-30 mt-2 max-h-48 overflow-y-auto rounded-2xl border border-border/60 bg-slate-900/90 p-2 text-sm shadow-xl backdrop-blur-md">
                            {availableManagers.length > 0 ? (
                              availableManagers.map((manager) => (
                                <button
                                  key={manager}
                                  type="button"
                                  onClick={() => handleManagerSelect(manager)}
                                  className="flex w-full items-center rounded-xl px-3 py-2 text-left text-primary transition hover:bg-slate-800/80"
                                >
                                  {manager}
                                </button>
                              ))
                            ) : (
                              <p className="px-3 py-2 text-xs text-secondary/80">
                                {teamMembers && teamMembers.length > 0
                                  ? 'No quedan responsables por asignar.'
                                  : 'Sin integrantes disponibles.'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-secondary/70">
                        Selecciona responsables desde la lista y elimínalos tocando la etiqueta.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="text-sm font-medium text-secondary">Descripción general</label>
                      <textarea
                        name="description"
                        value={editedProject.description || ''}
                        onChange={handleInputChange}
                        rows={4}
                        className="mt-2 w-full rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-3 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                        placeholder="Describe objetivos, entregables y contexto del proyecto"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-secondary">Equipo</label>
                      <input
                        type="text"
                        value={editedProject.team?.join(', ') || ''}
                        onChange={handleTeamChange}
                        className="mt-2 w-full rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-2 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                        placeholder="Nombre1, Nombre2, Nombre3"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-secondary">Notas rápidas</label>
                      <textarea
                        name="notes"
                        value={editedProject.notes || ''}
                        onChange={handleInputChange}
                        rows={3}
                        className="mt-2 w-full rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-2 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                        placeholder="Ideas, riesgos o recordatorios breves"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-6">
                    {isRecordingStage && (
                      <div className="rounded-3xl border border-border/60 bg-slate-900/60 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
                          <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">
                              Detalles de la grabación
                            </h3>
                            <p className="text-xs text-secondary">
                              Define fecha, hora, ubicación y contexto para coordinar el rodaje.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleOpenRecordingCalendar}
                            disabled={!editedProject.recordingDate}
                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                              editedProject.recordingDate
                                ? 'border-accent/60 text-accent hover:border-accent/80 hover:text-accent'
                                : 'cursor-not-allowed border-border/60 text-secondary'
                            }`}
                          >
                            <Calendar size={14} />
                            Agendar grabación
                          </button>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="text-sm font-medium text-secondary">Día de grabación</label>
                            <input
                              type="date"
                              value={editedProject.recordingDate || ''}
                              onChange={handleRecordingDateChange}
                              className="mt-2 w-full rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-secondary">Hora</label>
                            <input
                              type="time"
                              value={editedProject.recordingTime || ''}
                              onChange={handleRecordingFieldChange('recordingTime')}
                              className="mt-2 w-full rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-secondary">Lugar</label>
                            <input
                              type="text"
                              value={editedProject.recordingLocation || ''}
                              onChange={handleRecordingFieldChange('recordingLocation')}
                              className="mt-2 w-full rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-2 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                              placeholder="Estudio, locación, referencia"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-secondary">Descripción de la grabación</label>
                            <textarea
                              value={editedProject.recordingDescription || ''}
                              onChange={handleRecordingFieldChange('recordingDescription')}
                              rows={3}
                              className="mt-2 w-full rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-2 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                              placeholder="Ángulos, requerimientos técnicos o mensajes clave"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">
                        Planificación
                      </h3>
                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-secondary">Fecha de inicio</label>
                          <input
                            type="date"
                            name="startDate"
                            value={editedProject.startDate || ''}
                            onChange={handleInputChange}
                            className="mt-2 w-full rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-secondary">Fecha de entrega</label>
                          <input
                            type="date"
                            name="deadline"
                            value={editedProject.deadline || ''}
                            onChange={handleInputChange}
                            className="mt-2 w-full rounded-2xl border border-border/60 bg-slate-900/70 px-4 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-secondary">Recursos compartidos</label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(editedProject.resources || []).length === 0 ? (
                          <span className="text-xs text-secondary">Sin enlaces añadidos.</span>
                        ) : (
                          editedProject.resources.map((resource, index) => (
                            <div
                              key={`${resource}-${index}`}
                              className="group flex items-center gap-2 rounded-full border border-border/60 bg-slate-900/70 px-3 py-1 text-xs text-primary shadow-sm transition hover:-translate-y-0.5 hover:border-accent/60"
                            >
                              <a
                                href={resource}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="max-w-[200px] truncate text-accent transition group-hover:text-accent"
                              >
                                {resource}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveResource(index)}
                                className="rounded-full bg-slate-800 p-1 text-secondary transition hover:bg-red-500/80 hover:text-white"
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
                        className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent/60 px-3 py-1.5 text-xs font-medium text-accent transition hover:border-accent hover:-translate-y-0.5"
                      >
                        <Plus size={14} />
                        Añadir recurso
                      </button>
                    </div>
                  </div>

                  {editedProject.id && (
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">
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
                              className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-slate-900/70 p-4 md:flex-row md:items-center md:gap-4"
                            >
                              <input
                                type="text"
                                value={key}
                                disabled
                                className="w-full rounded-xl bg-slate-900/60 px-3 py-2 text-xs uppercase tracking-wide text-secondary md:max-w-[200px]"
                              />
                              <input
                                type="text"
                                value={value}
                                onChange={(event) => handlePropertyChange(key, event.target.value)}
                                className="w-full rounded-xl bg-slate-900/60 px-3 py-2 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent/30"
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 border-t border-border/60 bg-slate-900/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  {editedProject.id ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/30"
                      onClick={handleDelete}
                    >
                      <Trash2 size={16} />
                      Eliminar proyecto
                    </button>
                  ) : (
                    <span className="text-xs uppercase tracking-wide text-secondary">
                      Nuevo proyecto
                    </span>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="rounded-full border border-border/60 px-4 py-2 text-sm font-medium text-primary transition hover:border-accent/70 hover:text-accent"
                      onClick={closeModal}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-gradient-to-r from-emerald-500 via-emerald-500 to-lime-500 px-5 py-2 text-sm font-semibold text-slate-900 shadow-[0_18px_36px_rgba(34,197,94,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(34,197,94,0.45)]"
                      onClick={handleSave}
                    >
                      Guardar cambios
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
