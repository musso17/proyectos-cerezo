"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { normalizeStatus } from '../../utils/statusHelpers';
import useStore from '../../hooks/useStore';
import { Link, Save, CheckCircle, ExternalLink, Edit, Calendar, User, Clock } from 'lucide-react';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'd MMM, yyyy', { locale: es });
  } catch (e) {
    return 'Fecha inválida';
  }
};

const getProjectStartDate = (project) => {
  if (!project) return null;
  const candidates = [
    project.startDate,
    project.start_date,
    project.fecha_inicio,
    project.properties?.startDate,
    project.properties?.fecha_inicio,
    project.created_at,
  ];
  return candidates.find(date => date) || null;
};

const getProjectCompletionDate = (project) => {
  if (!project) return null;
  const candidates = [
    project.completedAt,
    project.completed_at,
    project.deadline,
    project.fechaEntrega,
    project.fecha_entrega,
    project.endDate,
    project.end_date,
    project.properties?.completedAt,
    project.properties?.deadline,
    project.updated_at,
  ];
  return candidates.find(date => date) || null;
};

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

  const startDate = getProjectStartDate(project);
  const completionDate = getProjectCompletionDate(project);
  const manager = project.manager || (Array.isArray(project.managers) && project.managers.join(', '));

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-[#2B2D31] dark:bg-[#1E1F23] dark:hover:shadow-[0_20px_36px_rgba(0,0,0,0.45)]">
      <div className="p-5">
        <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{project.name}</p>
        <p className="text-xs text-gray-500 dark:text-white/50">{project.client}</p>
      </div>
      <div className="flex-grow space-y-2 px-5 pb-4 text-xs text-gray-500 dark:text-white/50">
        {manager && (
          <div className="flex items-center gap-2">
            <User size={14} />
            <span>Encargado: <strong>{manager}</strong></span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar size={14} />
          <span>Inició: <strong>{formatDate(startDate)}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} />
          <span>Completado: <strong>{formatDate(completionDate)}</strong></span>
        </div>
      </div>
      <div className="mt-auto border-t border-gray-200 bg-gray-50/70 p-4 dark:border-[#2B2D31] dark:bg-[#1B1C20]">
        <label
          htmlFor={`link-${project.id}`}
          className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-white/60"
        >
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
              className="w-full flex-grow rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-[#2B2D31] dark:bg-[#0F0F11] dark:text-white/80 dark:focus:border-purple-400 dark:focus:ring-purple-400/40"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all ${
                isSaving
                  ? 'cursor-not-allowed bg-violet-400'
                  : 'bg-violet-600 hover:bg-violet-500 dark:bg-purple-500 dark:hover:bg-purple-400'
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
              className="inline-flex flex-grow items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              <ExternalLink size={16} /> Ver entregable
            </a>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-[#2B2D31] dark:bg-[#0F0F11] dark:text-white/70 dark:hover:bg-white/10"
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
      .filter(p => normalizeStatus(p.status) === 'Completado')
      .sort((a, b) => new Date(b.deadline || b.updated_at) - new Date(a.deadline || a.updated_at));
  }, [projects]);

  return (
    <div className="space-y-8 px-3 py-4 sm:px-6 md:py-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white/90">Galería de entregables</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-white/60">
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
        <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 dark:border-[#2B2D31] dark:bg-[#1B1C20]">
          <p className="text-sm text-gray-500 dark:text-white/50">No hay proyectos completados para mostrar.</p>
        </div>
      )}
    </div>
  );
};

export default VistaGaleria;
