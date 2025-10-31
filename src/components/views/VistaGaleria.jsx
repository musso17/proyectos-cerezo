"use client";

import React, { useState, useMemo, useEffect } from 'react';
import useStore from '../../hooks/useStore';
import { Link, Save, CheckCircle, ExternalLink, Edit } from 'lucide-react';

const GalleryCard = ({ project }) => {
  const updateProject = useStore((state) => state.updateProject);
  
  const initialLink = useMemo(() => project.properties?.deliverableLink || project.deliverableLink || '', [project]);

  const [link, setLink] = useState(initialLink);
  const [isEditing, setIsEditing] = useState(!initialLink);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Sincroniza el estado si el proyecto cambia desde fuera
    const newInitialLink = project.properties?.deliverableLink || project.deliverableLink || '';
    setLink(newInitialLink);
    // Si no estamos editando, o si el link se borra, ajustamos el modo de edición
    if (!isEditing || !newInitialLink) {
      setIsEditing(!newInitialLink);
    }
  }, [project, isEditing]);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const updatedProperties = {
      ...project.properties,
      deliverableLink: link.trim(),
    };

    // Prepara el payload asegurando que solo se actualicen los campos necesarios
    const payload = {
      id: project.id,
      properties: updatedProperties,
    };

    await updateProject(payload, true); // El 'true' evita que se recargue toda la lista

    setIsSaving(false);
    setIsEditing(false);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
      <div className="p-5">
        <p className="text-sm font-semibold text-gray-800">{project.name}</p>
        <p className="text-xs text-gray-500">{project.client}</p>
      </div>
      <div className="border-t border-gray-200 bg-gray-50/70 p-4">
        <label htmlFor={`link-${project.id}`} className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-600">
          <Link size={14} />
          Enlace del entregable
        </label>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              id={`link-${project.id}`}
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Pega el enlace aquí..."
              className="w-full flex-grow rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all ${
                isSaving ? 'cursor-not-allowed bg-violet-400' : 'bg-violet-600 hover:bg-violet-500'
              }`}
            >
              {isSaving ? <CheckCircle size={16} className="animate-spin" /> : <Save size={16} />}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-grow items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
            >
              <ExternalLink size={16} /> Ver entregable
            </a>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <Edit size={16} /> Editar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const VistaGaleria = () => {
  const projects = useStore((state) => state.projects);

  const completedProjects = useMemo(() => {
    return (projects || [])
      .filter(p => p.status?.toLowerCase() === 'completado')
      .sort((a, b) => new Date(b.deadline || b.updated_at) - new Date(a.deadline || a.updated_at));
  }, [projects]);

  return (
    <div className="space-y-8 px-3 py-4 sm:px-6 md:py-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Galería de entregables</h1>
        <p className="mt-1 text-sm text-gray-600">
          Repositorio de proyectos completados con sus enlaces finales.
        </p>
      </div>

      {completedProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {completedProjects.map((project) => (
            <GalleryCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
          <p className="text-sm text-gray-500">No hay proyectos completados para mostrar.</p>
        </div>
      )}
    </div>
  );
};

export default VistaGaleria;
