"use client";

import React, { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Plus, Trash2 } from 'lucide-react';
import useStore from '../../hooks/useStore';

const ModalDetalles = () => {
  const isModalOpen = useStore((state) => state.isModalOpen);
  const closeModal = useStore((state) => state.closeModal);
  const selectedProject = useStore((state) => state.selectedProject);
  const updateProject = useStore((state) => state.updateProject);
  const addProject = useStore((state) => state.addProject);
  const deleteProject = useStore((state) => state.deleteProject);
  const teamMembers = useStore((state) => state.teamMembers);
  const [editedProject, setEditedProject] = useState(null);

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

      const defaultManager = teamMembers?.[0] || '';

      setEditedProject({
        ...selectedProject,
        manager: selectedProject.manager || defaultManager,
        startDate: selectedProject.startDate || '',
        deadline: selectedProject.deadline || '',
        team: normalizedTeam,
        properties: { ...properties, resources: existingResources },
        resources: existingResources,
      });
    } else {
      setEditedProject(null);
    }
  }, [selectedProject, teamMembers]);

  if (!editedProject) return null;

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setEditedProject({ ...editedProject, [name]: value });
  };

  const handlePropertyChange = (key, value) => {
    setEditedProject((prev) => ({
      ...prev,
      properties: { ...prev.properties, [key]: value },
    }));
  };

  const handleAddProperty = () => {
    const newKey = `Propiedad ${Object.keys(editedProject.properties).length + 1}`;
    setEditedProject((prev) => ({
      ...prev,
      properties: { ...prev.properties, [newKey]: '' },
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
    const payload = {
      ...editedProject,
      properties: { ...editedProject.properties, resources },
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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 text-left align-middle shadow-[0_40px_120px_rgba(8,15,40,0.6)] transition-all">
                <div className="flex items-start justify-between gap-4 border-b border-white/5 px-6 py-5">
                  <Dialog.Title className="flex-1">
                    <input
                      type="text"
                      name="name"
                      value={editedProject.name}
                      onChange={handleInputChange}
                      className="w-full bg-transparent text-2xl font-semibold text-slate-50 placeholder:text-slate-500 focus:outline-none"
                      placeholder="Nombre del proyecto"
                    />
                    <p className="mt-2 text-sm text-slate-400">
                      Gestiona la información clave y comparte recursos con tu equipo.
                    </p>
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-full bg-white/10 p-2 text-slate-200 transition hover:bg-white/20"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid max-h-[68vh] gap-6 overflow-y-auto px-6 py-6 soft-scroll md:grid-cols-2">
                  <div className="space-y-6">
                    <div>
                      <label className="text-sm font-medium text-slate-300">Descripción</label>
                      <textarea
                        name="description"
                        value={editedProject.description || ''}
                        onChange={handleInputChange}
                        rows={4}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                        placeholder="Describe objetivos, entregables y contexto del proyecto"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-slate-300">Cliente</label>
                        <input
                          type="text"
                          name="client"
                          value={editedProject.client || ''}
                          onChange={handleInputChange}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                          placeholder="Nombre del cliente"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-300">Tipo</label>
                        <input
                          type="text"
                          name="type"
                          value={editedProject.type || ''}
                          onChange={handleInputChange}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                          placeholder="Edición, rodaje, etc."
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-300">Estado</label>
                        <select
                          name="status"
                          value={editedProject.status || 'Pendiente'}
                          onChange={handleInputChange}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="En progreso">En progreso</option>
                          <option value="En revisión">En revisión</option>
                          <option value="Completado">Completado</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-300">Responsable</label>
                        <select
                          name="manager"
                          value={editedProject.manager || ''}
                          onChange={handleInputChange}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                        >
                          {teamMembers && teamMembers.length > 0 ? (
                            teamMembers.map((member) => (
                              <option key={member} value={member}>
                                {member}
                              </option>
                            ))
                          ) : (
                            <option value="">Sin integrantes definidos</option>
                          )}
                        </select>
                      </div>
                    </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300">Equipo</label>
                    <input
                      type="text"
                      name="team"
                      value={editedProject.team?.join(', ') || ''}
                      onChange={(event) =>
                        handleInputChange({
                          target: {
                            name: 'team',
                            value: event.target.value
                              .split(',')
                              .map((member) => member.trim())
                              .filter((member) => member.length > 0),
                          },
                        })
                      }
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                      placeholder="Nombre1, Nombre2, Nombre3"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-slate-300">Fecha de inicio</label>
                        <input
                          type="date"
                          name="startDate"
                          value={editedProject.startDate || ''}
                          onChange={handleInputChange}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-300">Fecha de entrega</label>
                        <input
                          type="date"
                          name="deadline"
                          value={editedProject.deadline || ''}
                          onChange={handleInputChange}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-300">Recursos compartidos</label>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(editedProject.resources || []).length === 0 ? (
                          <span className="text-xs text-slate-500">Sin enlaces añadidos.</span>
                        ) : (
                          editedProject.resources.map((resource, index) => (
                            <div
                              key={`${resource}-${index}`}
                              className="group flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-100 transition hover:bg-slate-700"
                            >
                              <a
                                href={resource}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="max-w-[200px] truncate text-cyan-300 transition group-hover:text-cyan-200"
                              >
                                {resource}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveResource(index)}
                                className="rounded-full bg-slate-700/80 p-1 text-slate-200 transition hover:bg-red-500/80 hover:text-white"
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
                        className="mt-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/60 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:border-cyan-300 hover:text-cyan-100"
                      >
                        <Plus size={14} />
                        Añadir recurso
                      </button>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-300">Notas rápidas</label>
                      <textarea
                        name="notes"
                        value={editedProject.notes || ''}
                        onChange={handleInputChange}
                        rows={3}
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                        placeholder="Ideas, riesgos o recordatorios breves"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                      Propiedades personalizadas
                    </h3>
                    <div className="mt-3 space-y-4">
                      {Object.entries(editedProject.properties)
                        .filter(([key]) => key !== 'resources')
                        .map(([key, value]) => (
                          <div
                            key={key}
                            className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-800/70 p-4 md:flex-row md:items-center md:gap-4"
                          >
                            <input
                              type="text"
                              value={key}
                              disabled
                              className="w-full rounded-xl bg-slate-900/40 px-3 py-2 text-xs uppercase tracking-wide text-slate-400 md:max-w-[200px]"
                            />
                            <input
                              type="text"
                              value={value}
                              onChange={(event) => handlePropertyChange(key, event.target.value)}
                              className="w-full rounded-xl bg-slate-900/40 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                            />
                          </div>
                        ))}
                    </div>
                    <button
                      onClick={handleAddProperty}
                      type="button"
                      className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:border-cyan-400/50 hover:text-cyan-100"
                    >
                      <Plus size={16} />
                      Añadir propiedad
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-white/5 bg-slate-900/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
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
                    <span className="text-xs uppercase tracking-wide text-slate-500">
                      Nuevo proyecto
                    </span>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-white/30"
                      onClick={closeModal}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2 text-sm font-semibold text-slate-900 shadow-[0_12px_30px_rgba(56,189,248,0.35)] transition hover:shadow-[0_18px_40px_rgba(56,189,248,0.45)]"
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
