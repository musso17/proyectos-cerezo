"use client";

import React, { useMemo } from 'react';
import useStore from '../../hooks/useStore';
import { ExternalLink, LayoutGrid } from 'lucide-react';
import { filterProjects } from '../../utils/filterProjects';
import { getClientBadgeClass } from '../../utils/clientStyles';

const normalizeResourceValue = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const url = value.url || value.link;
    if (typeof url === 'string') return url.trim();
  }
  return null;
};

const getProjectResources = (project) => {
  if (!project) return [];

  const directResources = Array.isArray(project.resources) ? project.resources : [];
  const propertyResources = Array.isArray(project.properties?.resources) ? project.properties.resources : [];

  const combined = [...directResources, ...propertyResources];

  return combined
    .map(normalizeResourceValue)
    .filter((value, index, array) => Boolean(value) && array.indexOf(value) === index);
};

const getGoogleDriveExportLink = (project) => {
  if (!project) return null;

  const candidateValues = [
    project.googleDriveExport,
    project.exportLink,
    project.driveExportLink,
    project.properties?.googleDriveExport,
    project.properties?.driveExport,
    project.properties?.driveExportLink,
    project.properties?.exportLink,
    project.properties?.export_link,
  ];

  const resources = getProjectResources(project);

  const candidates = [...candidateValues, ...resources];

  for (const candidate of candidates) {
    const value = normalizeResourceValue(candidate);
    if (!value) continue;
    if (value.includes('drive.google.com')) return value;
  }

  return null;
};

const extractGoogleDriveId = (url) => {
  if (!url) return null;
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) return idParamMatch[1];

  return null;
};

const getGoogleDrivePreviewUrl = (url) => {
  const id = extractGoogleDriveId(url);
  if (!id) return null;
  return `https://drive.google.com/uc?export=view&id=${id}`;
};

const VistaGaleria = () => {
  const projects = useStore((state) => state.projects);
  const searchTerm = useStore((state) => state.searchTerm);
  const openModal = useStore((state) => state.openModal);

  const filteredProjects = useMemo(
    () => filterProjects(projects, searchTerm),
    [projects, searchTerm]
  );

  const galleryProjects = useMemo(() => {
    return filteredProjects
      .map((project) => {
        const statusLabel = project.status?.toString().trim().toLowerCase() || '';
        const isCompleted = statusLabel === 'completado' || statusLabel === 'finalizado';
        if (!isCompleted) return null;

        const driveLink = getGoogleDriveExportLink(project);
        if (!driveLink) return null;

        return {
          project,
          driveLink,
          previewUrl: getGoogleDrivePreviewUrl(driveLink),
        };
      })
      .filter(Boolean);
  }, [filteredProjects]);

  if (galleryProjects.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-slate-400">
        No hay proyectos finalizados con enlace de exportación disponible.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {galleryProjects.map(({ project, driveLink, previewUrl }) => (
        <div
          key={project.id}
          className="group ios-card rounded-2xl border border-border bg-surface/80 overflow-hidden cursor-pointer transition-all duration-200 hover:border-cyan-400/60"
          onClick={() => openModal(project)}
        >
          <div className="h-40 bg-background flex items-center justify-center text-secondary overflow-hidden">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`Vista previa de ${project.name}`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            ) : (
              <LayoutGrid size={48} />
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-primary">{project.name}</h3>
            <div className="mt-2 flex items-center justify-between">
              {(() => {
                const clientLabel = project.client || 'Sin cliente';
                return <span className={getClientBadgeClass(clientLabel, 'sm')}>{clientLabel}</span>;
              })()}
              <span className="text-xs text-slate-400">{project.deadline || 'Sin fecha'}</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] uppercase tracking-wide">
                {project.status}
              </span>
              <span>{project.manager || 'Sin responsable'}</span>
            </div>
            <div className="mt-4">
              <a
                href={driveLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 px-3 py-1.5 text-xs font-medium text-cyan-200 transition hover:border-cyan-300 hover:text-cyan-100"
              >
                <ExternalLink size={14} />
                Ver exportación
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default VistaGaleria;
