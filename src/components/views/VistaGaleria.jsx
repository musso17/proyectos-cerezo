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
    // Sincroniza el estado local solo cuando el valor inicial del proyecto cambie realmente
    setLink(initialLink);
    // Si no hay link, entramos en modo edición por defecto
    setIsEditing(!initialLink);
  }, [initialLink]);

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
    <div className="flex flex-col rounded-[2.5rem] border border-border/40 bg-white shadow-sm transition-all hover:shadow-2xl hover:-translate-y-1 dark:border-white/5 dark:bg-[#16171D] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
      <div className="p-8">
        <h3 className="text-xl font-semibold text-primary tracking-tight dark:text-white leading-tight">
          {project.name}
        </h3>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">
          {project.client}
        </p>
      </div>
      <div className="flex-grow space-y-3 px-8 pb-8 text-[11px] font-medium text-secondary/60 dark:text-white/40">
        {manager && (
          <div className="flex items-center gap-3">
            <User size={16} className="text-secondary/30" />
            <span>{manager}</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-secondary/30" />
          <span>{formatDate(startDate)}</span>
        </div>
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-secondary/30" />
          <span>{formatDate(completionDate)}</span>
        </div>
      </div>
      <div className="mt-auto border-t border-border/40 bg-slate-50 p-6 rounded-b-[2.5rem] dark:border-white/5 dark:bg-white/[0.02]">
        <label
          htmlFor={`link-${project.id}`}
          className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary/50 dark:text-white/30"
        >
          Entregable
        </label>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              id={`link-${project.id}`}
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Enlace del proyecto..."
              className="w-full flex-grow rounded-2xl border border-border bg-white px-4 py-3 text-xs font-medium text-primary focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 dark:border-white/5 dark:bg-[#0B0C10] dark:text-white"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-dark-bg text-white shadow-lg transition-all hover:scale-110 active:scale-95 dark:bg-accent dark:text-dark-bg"
            >
              {isSaving ? <CheckCircle size={20} className="animate-spin" /> : <Save size={20} />}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-grow items-center justify-center gap-3 rounded-2xl bg-dark-bg px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 dark:bg-accent dark:text-dark-bg"
            >
              <ExternalLink size={16} strokeWidth={3} /> Ver
            </a>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-white text-secondary transition-all hover:scale-110 active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
            >
              <Edit size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const VistaGaleria = ({ projects: projectsProp }) => {
  const projectsFromStore = useStore((state) => state.projects);
  const projects = projectsProp !== undefined ? projectsProp : projectsFromStore;

  const completedProjects = useMemo(() => {
    return (projects || [])
      .filter(p => normalizeStatus(p.status) === 'Completado')
      .sort((a, b) => new Date(b.deadline || b.updated_at) - new Date(a.deadline || a.updated_at));
  }, [projects]);

  return (
    <div className="flex h-full flex-col gap-8 p-4 md:p-6 animate-fade-up">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold text-primary tracking-tight dark:text-white">Galería</h1>
        <div className="flex items-center gap-2 mt-2">
          <div className="h-1 w-8 rounded-full bg-accent" />
          <p className="text-xs font-medium text-secondary/60 uppercase tracking-[0.2em]">
            Repositorio de entregables finales
          </p>
        </div>
      </div>

      {completedProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {completedProjects.map((project) => (
            <GalleryCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center rounded-[3rem] border-2 border-dashed border-border/40 bg-slate-50 dark:bg-white/[0.02]">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary/40">No hay proyectos completados</p>
        </div>
      )}
    </div>
  );
};

export default VistaGaleria;
