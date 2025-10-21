"use client";

import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import useStore from '../../hooks/useStore';

const VistaKanban = () => {
  const projects = useStore((state) => state.projects);
  const updateProject = useStore((state) => state.updateProject);
  const openModal = useStore((state) => state.openModal);

  const columns = ['Pendiente', 'En progreso', 'En revisión', 'Completado', 'Cancelado'];

  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const project = projects.find((p) => p.id.toString() === draggableId);
    if (project) {
      updateProject({ ...project, status: destination.droppableId });
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full gap-6 overflow-x-auto p-2 md:p-4">
        {columns.map((status) => (
          <Droppable droppableId={status} key={status}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`glass-panel flex-1 rounded-3xl border border-white/5 p-4 transition-all ${
                  snapshot.isDraggingOver ? 'shadow-[0_15px_35px_rgba(56,189,248,0.35)]' : ''
                }`}
              >
                <h3 className="mb-4 flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-slate-200">
                  <span>{status}</span>
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">
                    {projects.filter((p) => p.status === status).length}
                  </span>
                </h3>
                <div className="soft-scroll flex h-full flex-col gap-3 overflow-y-auto pr-1">
                  {projects
                    .filter((p) => p.status === status)
                    .map((project, index) => (
                      <Draggable key={project.id} draggableId={project.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => openModal(project)}
                            className={`group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all duration-200 hover:border-cyan-400/40 hover:bg-white/[0.08] ${
                              snapshot.isDragging ? 'shadow-[0_12px_30px_rgba(56,189,248,0.4)]' : ''
                            }`}
                          >
                            <h4 className="font-semibold text-slate-100">{project.name}</h4>
                            <p className="mt-1 text-sm text-slate-400">{project.client}</p>
                            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                              <span>{project.deadline || 'Sin fecha'}</span>
                              <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-medium text-slate-200">
                                {project.manager || 'Sin asignar'}
                              </span>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
};

export default VistaKanban;
