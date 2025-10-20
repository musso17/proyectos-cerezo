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
      <div className="flex gap-6 p-6 h-full overflow-x-auto">
        {columns.map((status) => (
          <Droppable droppableId={status} key={status}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex-1 bg-surface rounded-lg p-4 border border-transparent transition-colors w-80 ${snapshot.isDraggingOver ? 'border-accent' : ''}`}>
                <h3 className="font-semibold mb-4 text-lg text-primary flex items-center justify-between">
                  {status}
                  <span className="text-sm text-secondary">
                    {projects.filter((p) => p.status === status).length}
                  </span>
                </h3>
                <div className="space-y-4 h-full">
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
                            className={`bg-background p-4 rounded-lg cursor-pointer border border-border hover:border-accent transition-all duration-200 ${snapshot.isDragging ? 'ring-2 ring-accent shadow-lg' : ''}`}>
                            <h4 className="font-semibold text-primary">{project.name}</h4>
                            <p className="text-sm text-secondary mt-1">{project.client}</p>
                            <div className="flex justify-between items-center mt-4">
                              <span className="text-xs text-secondary">{project.deadline}</span>
                              <span className="text-xs font-medium text-primary bg-border px-2 py-1 rounded-full">{project.manager}</span>
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
