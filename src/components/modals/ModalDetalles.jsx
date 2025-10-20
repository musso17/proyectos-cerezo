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
      const normalizedTeam = Array.isArray(selectedProject.team)
        ? selectedProject.team
        : typeof selectedProject.team === 'string' && selectedProject.team.length > 0
          ? selectedProject.team.split(',').map((member) => member.trim()).filter(Boolean)
          : [];

      const defaultManager = teamMembers?.[0] || '';

      setEditedProject({
        ...selectedProject,
        manager: selectedProject.manager || defaultManager,
        startDate: selectedProject.startDate || '',
        deadline: selectedProject.deadline || '',
        team: normalizedTeam,
        properties,
      });
    } else {
      setEditedProject(null);
    }
  }, [selectedProject, teamMembers]);

  if (!editedProject) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedProject({ ...editedProject, [name]: value });
  };

  const handlePropertyChange = (key, value) => {
    setEditedProject({
      ...editedProject,
      properties: { ...editedProject.properties, [key]: value },
    });
  };

  const handleAddProperty = () => {
    const newKey = `Propiedad ${Object.keys(editedProject.properties).length + 1}`;
    setEditedProject({
      ...editedProject,
      properties: { ...editedProject.properties, [newKey]: '' },
    });
  };

  const handleSave = async () => {
    if (editedProject.id) {
      const result = await updateProject(editedProject);
      if (result?.success) {
        closeModal();
      }
    } else {
      const result = await addProject(editedProject);
      if (result?.success) {
        closeModal();
      }
    }
  };

  const handleDelete = async () => {
    if (editedProject.id && window.confirm('¿Estás seguro de que deseas eliminar este proyecto?')) {
      const result = await deleteProject(editedProject.id);
      if (result?.success) {
        closeModal();
      }
    }
  };

  return (
    <Transition.Root show={isModalOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeModal}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-500"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-500"
          leaveFrom="opacity-100"
          leaveTo="opacity-0">
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full">
                <Dialog.Panel className="pointer-events-auto w-screen max-w-2xl">
                  <div className="flex h-full flex-col overflow-y-scroll bg-slate-800 shadow-xl">
                    <div className="p-4 border-b border-slate-700">
                      <div className="flex items-start justify-between">
                        <Dialog.Title className="text-xl font-bold text-cyan-400">
                          <input type="text" name="name" value={editedProject.name} onChange={handleInputChange} className="w-full bg-transparent focus:outline-none" placeholder="Nombre del Proyecto"/>
                        </Dialog.Title>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            className="p-2 hover:bg-slate-700 rounded-full"
                            onClick={closeModal}>
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="relative mt-6 flex-1 px-4 sm:px-6">
                      <div className="border-b border-slate-700">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                          <a href="#" className="border-cyan-500 text-cyan-400 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium">
                            Details
                          </a>
                        </nav>
                      </div>

                      <div className="py-6 space-y-6">
                        {/* Default properties */}
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm text-slate-400">Descripción</label>
                            <textarea name="description" value={editedProject.description || ''} onChange={handleInputChange} rows="3" className="w-full bg-slate-700 rounded p-2 mt-1" placeholder="Descripción del proyecto"/>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="text-sm text-slate-400">Cliente</label>
                            <input type="text" name="client" value={editedProject.client || ''} onChange={handleInputChange} className="w-full bg-slate-700 rounded p-2 mt-1" placeholder="Nombre del cliente"/>
                          </div>
                          <div>
                            <label className="text-sm text-slate-400">Tipo</label>
                            <input type="text" name="type" value={editedProject.type || ''} onChange={handleInputChange} className="w-full bg-slate-700 rounded p-2 mt-1" placeholder="Tipo de proyecto"/>
                          </div>
                          <div>
                            <label className="text-sm text-slate-400">Estado</label>
                            <select name="status" value={editedProject.status || 'Pendiente'} onChange={handleInputChange} className="w-full bg-slate-700 rounded p-2 mt-1">
                              <option value="Pendiente">Pendiente</option>
                              <option value="En progreso">En progreso</option>
                              <option value="En revisión">En revisión</option>
                              <option value="Completado">Completado</option>
                              <option value="Cancelado">Cancelado</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-sm text-slate-400">Responsable</label>
                            <select
                              name="manager"
                              value={editedProject.manager || ''}
                              onChange={handleInputChange}
                              className="w-full bg-slate-700 rounded p-2 mt-1">
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
                          <div>
                            <label className="text-sm text-slate-400">Fecha de inicio</label>
                            <input type="date" name="startDate" value={editedProject.startDate || ''} onChange={handleInputChange} className="w-full bg-slate-700 rounded p-2 mt-1"/>
                          </div>
                          <div>
                            <label className="text-sm text-slate-400">Fecha de entrega</label>
                            <input type="date" name="deadline" value={editedProject.deadline || ''} onChange={handleInputChange} className="w-full bg-slate-700 rounded p-2 mt-1"/>
                          </div>
                          <div>
                            <label className="text-sm text-slate-400">Presupuesto</label>
                            <input type="number" name="budget" value={editedProject.budget || ''} onChange={handleInputChange} className="w-full bg-slate-700 rounded p-2 mt-1" placeholder="0"/>
                          </div>
                          <div>
                            <label className="text-sm text-slate-400">Equipo (separados por coma)</label>
                            <input type="text" name="team" value={editedProject.team?.join(', ') || ''} onChange={(e) => handleInputChange({target: {name: 'team', value: e.target.value.split(',').map(m => m.trim()).filter(m => m)}})} className="w-full bg-slate-700 rounded p-2 mt-1" placeholder="Nombre1, Nombre2, Nombre3"/>
                          </div>
                        </div>

                        {/* Custom properties */}
                        <div>
                          <h3 className="text-lg font-medium text-slate-300 mb-4">Propiedades Personalizadas</h3>
                          <div className="space-y-4">
                            {Object.entries(editedProject.properties).map(([key, value]) => (
                              <div key={key} className="grid grid-cols-2 gap-4 items-center">
                                <input
                                  type="text"
                                  value={key}
                                  disabled
                                  className="w-full bg-slate-700/50 rounded p-2 mt-1 text-slate-400"
                                />
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => handlePropertyChange(key, e.target.value)}
                                  className="w-full bg-slate-700 rounded p-2 mt-1"
                                />
                              </div>
                            ))}
                          </div>
                          <button onClick={handleAddProperty} className="mt-4 flex items-center gap-2 text-cyan-400 hover:text-cyan-300">
                            <Plus size={16} />
                            Añadir propiedad
                          </button>
                        </div>
                      </div>

                    </div>
                    <div className="flex flex-shrink-0 justify-between px-4 py-4 border-t border-slate-700">
                      <div>
                        {editedProject.id && (
                          <button type="button" className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 flex items-center gap-2" onClick={handleDelete}>
                            <Trash2 size={16} />
                            Eliminar
                          </button>
                        )}
                      </div>
                      <div className="flex gap-4">
                        <button type="button" className="rounded-md bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600" onClick={closeModal}>
                          Cancelar
                        </button>
                        <button type="button" className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-cyan-400" onClick={handleSave}>
                          Guardar
                        </button>
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default ModalDetalles;
