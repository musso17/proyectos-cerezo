"use client";

import React, { useEffect, useMemo, useState } from 'react';
import useStore from '../../hooks/useStore';
import { ExternalLink, File, FileText, LayoutGrid } from 'lucide-react';
import { filterProjects } from '../../utils/filterProjects';
import { getClientBadgeClass } from '../../utils/clientStyles';
import { supabase } from '../../config/supabase';

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'project-files';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'webm', 'mkv', 'avi']);
const PDF_EXTENSIONS = new Set(['pdf']);
const DOC_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv']);

const TYPE_BADGES = {
  grabacion: {
    label: 'Grabación',
    className: 'bg-blue-500/10 text-blue-200 border border-blue-400/40',
  },
  edicion: {
    label: 'Edición',
    className: 'bg-emerald-500/10 text-emerald-200 border border-emerald-400/40',
  },
};

const getProjectTypeBadge = (project) => {
  if (!project) return { label: 'Sin tipo', className: 'bg-slate-700/50 text-secondary border border-border/60' };

  const rawStage = project.stage || project.properties?.stage || '';
  const rawType = project.type || project.properties?.registrationType || '';

  const normalizedStage = rawStage?.toString().trim().toLowerCase();
  const normalizedType = rawType?.toString().trim().toLowerCase();

  if (normalizedStage && TYPE_BADGES[normalizedStage]) {
    return TYPE_BADGES[normalizedStage];
  }
  if (normalizedType && TYPE_BADGES[normalizedType]) {
    return TYPE_BADGES[normalizedType];
  }

  const label = rawType || rawStage || 'Sin tipo';
  return { label, className: 'bg-slate-700/50 text-secondary border border-border/60' };
};

const sanitizeSegment = (value) => {
  if (!value) return 'sin-nombre';
  return (
    value
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'sin-nombre'
  );
};

const getProjectKey = (project) => {
  if (!project) return null;
  if (project.id) return project.id.toString();
  if (project.slug) return sanitizeSegment(project.slug);
  if (project.properties?.slug) return sanitizeSegment(project.properties.slug);
  if (project.name) return sanitizeSegment(project.name);
  return null;
};

const getProjectStoragePath = (project) => {
  if (!project) return null;
  if (project.storagePath) return project.storagePath;
  if (project.properties?.storagePath) return project.properties.storagePath;
  const key = getProjectKey(project);
  if (!key) return null;
  if (key.startsWith('projects/')) return key;
  return `projects/${key}`;
};

const determineFileType = (fileName) => {
  const extension = fileName?.split('.').pop()?.toLowerCase() || '';
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  if (PDF_EXTENSIONS.has(extension)) return 'pdf';
  if (DOC_EXTENSIONS.has(extension)) return 'doc';
  return 'other';
};

const VistaGaleria = () => {
  const projects = useStore((state) => state.projects);
  const searchTerm = useStore((state) => state.searchTerm);
  const openModal = useStore((state) => state.openModal);

  const filteredProjects = useMemo(
    () => filterProjects(projects, searchTerm),
    [projects, searchTerm]
  );

  const completedProjects = useMemo(() => {
    return filteredProjects.filter((project) => {
      const statusLabel = project.status?.toString().trim().toLowerCase() || '';
      return statusLabel === 'completado' || statusLabel === 'finalizado';
    });
  }, [filteredProjects]);

  const [attachmentMap, setAttachmentMap] = useState({});
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAttachments = async () => {
      if (!completedProjects || completedProjects.length === 0 || !supabase) {
        if (isMounted) {
          setAttachmentMap({});
          setLoadingAttachments(false);
        }
        return;
      }

      setLoadingAttachments(true);

      try {
        const results = await Promise.all(
          completedProjects.map(async (project) => {
            const key = getProjectKey(project);
            if (!key) return null;
            const path = getProjectStoragePath(project);
            if (!path) return [key, null];

            const { data, error } = await supabase.storage
              .from(STORAGE_BUCKET)
              .list(path, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } });

            if (error) {
              console.error('Error al listar archivos de', path, error);
              return [key, null];
            }

            if (!data || data.length === 0) {
              return [key, null];
            }

            const sorted = [...data].sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            const file = sorted[0];
            const fullPath = `${path}/${file.name}`;

            const { data: publicData, error: urlError } = supabase.storage
              .from(STORAGE_BUCKET)
              .getPublicUrl(fullPath);

            if (urlError) {
              console.error('Error al obtener URL pública de', fullPath, urlError);
            }

            return [
              key,
              {
                file,
                url: publicData?.publicUrl || null,
                type: determineFileType(file.name),
                fullPath,
              },
            ];
          })
        );

        if (!isMounted) return;

        const entries = results?.filter(Boolean) ?? [];
        setAttachmentMap(Object.fromEntries(entries));
      } finally {
        if (isMounted) {
          setLoadingAttachments(false);
        }
      }
    };

    loadAttachments();

    return () => {
      isMounted = false;
    };
  }, [completedProjects]);

  if (completedProjects.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-400">
        No hay proyectos finalizados disponibles en la galería.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {completedProjects.map((project) => {
        const typeMeta = getProjectTypeBadge(project);
        const key = getProjectKey(project);
        const attachment = key ? attachmentMap[key] : null;

        const handleOpenAttachment = (event) => {
          event.stopPropagation();
          if (!attachment?.url) return;
          window.open(attachment.url, '_blank', 'noopener');
        };

        const renderPreview = () => {
          if (attachment && attachment.url && attachment.type === 'image') {
            return (
              <img
                src={attachment.url}
                alt={`Vista previa de ${project.name}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            );
          }

          if (attachment && attachment.url && attachment.type === 'video') {
            return (
              <video
                src={attachment.url}
                className="h-full w-full object-cover"
                controls
                playsInline
              />
            );
          }

          if (attachment) {
            const IconComponent = attachment.type === 'pdf' ? FileText : File;
            return (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-900/70 px-4 text-secondary">
                <IconComponent size={44} />
                <span className="max-w-[220px] truncate text-xs text-secondary/70">
                  {attachment.file?.name || 'Archivo adjunto'}
                </span>
              </div>
            );
          }

          return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-900/70 text-secondary">
              <LayoutGrid size={44} />
              <span className="text-xs text-secondary/60">
                {loadingAttachments ? 'Buscando adjuntos…' : 'Archivo vacío'}
              </span>
            </div>
          );
        };

        const clientLabel = project.client || 'Sin cliente';

        return (
          <div
            key={project.id || key}
            className="group ios-card cursor-pointer overflow-hidden rounded-2xl border border-border bg-surface/80 transition-all duration-200 hover:border-cyan-400/60"
            onClick={() => openModal(project)}
          >
            <div className="flex h-48 items-center justify-center overflow-hidden bg-background text-secondary">
              {renderPreview()}
            </div>
            <div className="space-y-4 p-4">
              <div className="flex flex-wrap items-start gap-2">
                <h3 className="flex-1 text-lg font-semibold text-primary">{project.name}</h3>
                {typeMeta && (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${typeMeta.className}`}
                  >
                    {typeMeta.label}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className={getClientBadgeClass(clientLabel, 'sm')}>{clientLabel}</span>
                <span>{project.deadline || 'Sin fecha'}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] uppercase tracking-wide">
                  {project.status || 'Sin estado'}
                </span>
                <span>{project.manager || 'Sin responsable'}</span>
              </div>
              <button
                type="button"
                onClick={handleOpenAttachment}
                disabled={!attachment?.url}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition sm:w-auto sm:rounded-full ${
                  attachment?.url
                    ? 'border border-cyan-500/50 text-cyan-200 hover:border-cyan-300 hover:text-cyan-100'
                    : 'cursor-not-allowed border border-border/60 text-secondary'
                }`}
              >
                <ExternalLink size={16} />
                Ver archivos
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VistaGaleria;
