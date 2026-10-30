"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { normalizeStatus } from '../../utils/statusHelpers';
import useStore from '../../hooks/useStore';
import { filterProjects } from '../../utils/filterProjects';
import { isAbsenceProject } from '../../utils/absences';
import { extractProjectInfo } from '../../utils/dashboardHelpers';
import MemberAvatar from '../ui/MemberAvatar';
import { clearUIPreference, getUIPreference } from '../../utils/uiPreferences';
import {
  Save,
  ExternalLink,
  Edit,
  Copy,
  Check,
  Search,
  AlertCircle,
  CheckCircle,
  X,
  Folder,
  Film,
  Link as LinkIcon,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDay = (date) => (date ? format(date, "d MMM yyyy", { locale: es }) : null);

const getDeliverableLink = (project) =>
  (project.properties?.deliverableLink || project.deliverableLink || '').toString().trim();

// Miniatura según el servicio del link. Las carpetas de Drive no tienen.
const parseDeliverable = (link) => {
  try {
    const url = new URL(link);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be' || host.endsWith('youtube.com')) {
      const id =
        host === 'youtu.be'
          ? url.pathname.slice(1)
          : url.searchParams.get('v') || (url.pathname.match(/\/(?:shorts|embed|live)\/([^/?]+)/) || [])[1];
      return { kind: 'video', provider: 'YouTube', thumbnail: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null };
    }
    if (host.endsWith('vimeo.com')) {
      return { kind: 'video', provider: 'Vimeo', thumbnail: null, oembed: true };
    }
    if (host === 'drive.google.com' || host === 'docs.google.com') {
      if (/\/folders\//.test(url.pathname)) return { kind: 'folder', provider: 'Carpeta de Drive', thumbnail: null };
      const id = (url.pathname.match(/\/file\/d\/([^/]+)/) || [])[1] || url.searchParams.get('id');
      return {
        kind: 'file',
        provider: 'Archivo de Drive',
        thumbnail: id ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w640` : null,
      };
    }
    return { kind: 'link', provider: host, thumbnail: null };
  } catch {
    return { kind: 'link', provider: 'Enlace', thumbnail: null };
  }
};

const vimeoThumbnailCache = new Map();

const useDeliverablePreview = (link) => {
  const parsed = useMemo(() => (link ? parseDeliverable(link) : null), [link]);
  const [thumbnail, setThumbnail] = useState(parsed?.thumbnail || null);

  useEffect(() => {
    setThumbnail(parsed?.thumbnail || null);
    if (!parsed?.oembed) return undefined;
    if (vimeoThumbnailCache.has(link)) {
      setThumbnail(vimeoThumbnailCache.get(link));
      return undefined;
    }
    let cancelled = false;
    fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(link)}&width=640`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const url = data?.thumbnail_url || null;
        vimeoThumbnailCache.set(link, url);
        if (!cancelled) setThumbnail(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [link, parsed]);

  return { parsed, thumbnail };
};

// ─── CopyButton ───────────────────────────────────────────────────────────────

const CopyButton = ({ link }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar el enlace.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? '¡Copiado!' : 'Copiar enlace'}
      aria-label={copied ? 'Enlace copiado' : 'Copiar enlace'}
      className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all active:scale-95 ${
        copied
          ? 'border-green-400/40 bg-green-500/10 text-green-600 dark:border-green-400/30 dark:bg-green-500/10'
          : 'border-border bg-white text-secondary hover:border-accent/30 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-white/70'
      }`}
    >
      {copied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} />}
    </button>
  );
};

// ─── Preview ──────────────────────────────────────────────────────────────────

const DeliverablePreview = ({ link, name }) => {
  const { parsed, thumbnail } = useDeliverablePreview(link);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [thumbnail]);

  const Icon = parsed?.kind === 'folder' ? Folder : parsed?.kind === 'link' ? LinkIcon : Film;

  if (thumbnail && !failed) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-slate-200 dark:bg-white/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnail}
          alt={`Vista previa de ${name}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
        <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
          {parsed?.provider}
        </span>
      </div>
    );
  }

  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-t-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 dark:from-white/[0.04] dark:to-white/[0.08] dark:text-white/60">
      <Icon size={28} strokeWidth={1.5} />
      <span className="text-xs font-medium">{link ? parsed?.provider : 'Sin entregable'}</span>
    </div>
  );
};

// ─── GalleryCard ──────────────────────────────────────────────────────────────

const GalleryCard = ({ project, info }) => {
  const updateProject = useStore((state) => state.updateProject);
  const openModal = useStore((state) => state.openModal);

  const initialLink = getDeliverableLink(project);
  const [link, setLink] = useState(initialLink);
  const [isEditing, setIsEditing] = useState(!initialLink);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLink(initialLink);
    setIsEditing(!initialLink);
  }, [initialLink]);

  const handleSave = async () => {
    if (isSaving) return;
    const trimmed = link.trim();
    if (!trimmed) {
      toast.error('Pega el link del entregable.');
      return;
    }
    setIsSaving(true);
    // Solo cambia el link: el store conserva fechas, responsables y el resto.
    const result = await updateProject({
      id: project.id,
      properties: { ...project.properties, deliverableLink: trimmed },
    });
    setIsSaving(false);
    if (result?.ok) {
      setIsEditing(false);
      toast.success('Entregable guardado');
    } else {
      toast.error('No se pudo guardar el link. Intenta de nuevo.');
    }
  };

  const managers = info.managers || [];
  const isMissing = !initialLink;

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl dark:bg-[#16171D] ${
        isMissing ? 'border-amber-400/50 dark:border-amber-500/30' : 'border-border/60 dark:border-white/5'
      }`}
    >
      <DeliverablePreview link={initialLink} name={project.name} />

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <p className="text-xs font-semibold text-[#C2321A] dark:text-accent">{project.client || 'Sin cliente'}</p>
          <h3 className="mt-0.5 text-lg font-semibold leading-snug tracking-tight text-primary dark:text-white">
            <button type="button" onClick={() => openModal(project)} className="text-left hover:underline">
              {project.name}
            </button>
          </h3>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt className="text-secondary dark:text-white/50">Entregado</dt>
          <dd className="text-right font-medium text-primary dark:text-white/85">{formatDay(info.deliveryDate) || '—'}</dd>
          {info.firstRecordingDate && (
            <>
              <dt className="text-secondary dark:text-white/50">Rodaje</dt>
              <dd className="text-right font-medium text-primary dark:text-white/85">{formatDay(info.firstRecordingDate)}</dd>
            </>
          )}
        </dl>

        {managers.length > 0 && (
          <div className="flex items-center gap-1.5">
            {managers.map((m) => (
              <MemberAvatar key={m} name={m} size="sm" />
            ))}
            <span className="ml-1 truncate text-xs text-secondary dark:text-white/60">{managers.join(', ')}</span>
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-border/40 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/[0.02]">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <label htmlFor={`link-${project.id}`} className="sr-only">
              Link del entregable de {project.name}
            </label>
            <input
              id={`link-${project.id}`}
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Pega el link del entregable…"
              className="w-full flex-grow rounded-lg border border-border bg-white px-3 py-2.5 text-xs font-medium text-primary focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 dark:border-white/10 dark:bg-[#0B0C10] dark:text-white"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              aria-label="Guardar link del entregable"
              title="Guardar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-dark-bg text-white shadow transition-all active:scale-95 disabled:opacity-60 dark:bg-accent dark:text-dark-bg"
            >
              {isSaving ? <CheckCircle size={18} className="animate-spin" /> : <Save size={18} />}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <a
              href={initialLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-dark-bg px-4 py-2.5 text-sm font-semibold text-white shadow transition-all active:scale-95 dark:bg-accent dark:text-dark-bg"
            >
              <ExternalLink size={15} strokeWidth={2.5} /> Ver<span className="sr-only"> entregable de {project.name}</span>
            </a>
            <CopyButton link={initialLink} />
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              aria-label="Editar link del entregable"
              title="Editar link"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-white text-secondary transition-all active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-white/70"
            >
              <Edit size={16} />
            </button>
          </div>
        )}
      </div>
    </article>
  );
};

// ─── VistaGaleria ─────────────────────────────────────────────────────────────

const VistaGaleria = ({ projects: projectsProp }) => {
  const projectsFromStore = useStore((state) => state.projects);
  const projects = projectsProp !== undefined ? projectsProp : projectsFromStore;
  // Misma búsqueda que el buscador de arriba (y acepta cliente:, responsable:…).
  const searchTerm = useStore((state) => state.searchTerm);
  const setSearchTerm = useStore((state) => state.setSearchTerm);

  const [selectedClient, setSelectedClient] = useState('Todos');
  const [selectedMonth, setSelectedMonth] = useState('Todos');
  // "Completar en Galería" (desde Inicio) abre directo en "Sin entregable".
  const [showMissing, setShowMissing] = useState(() => getUIPreference('galleryShowMissing', false) === true);
  useEffect(() => {
    clearUIPreference('galleryShowMissing');
  }, []);

  // Completados (sin ausencias) con su fecha de entrega, del más reciente al más antiguo.
  const completedProjects = useMemo(
    () =>
      (projects || [])
        .filter((p) => normalizeStatus(p.status) === 'Completado' && !isAbsenceProject(p))
        .map((project) => ({ project, info: extractProjectInfo(project) }))
        .sort((a, b) => {
          const timeA = a.info.deliveryDate ? a.info.deliveryDate.getTime() : -Infinity;
          const timeB = b.info.deliveryDate ? b.info.deliveryDate.getTime() : -Infinity;
          return timeB - timeA;
        }),
    [projects]
  );

  const missingCount = useMemo(
    () => completedProjects.filter(({ project }) => !getDeliverableLink(project)).length,
    [completedProjects]
  );

  const clients = useMemo(() => {
    const all = new Set(completedProjects.map(({ project }) => project.client).filter(Boolean));
    return ['Todos', ...Array.from(all).sort((a, b) => a.localeCompare(b, 'es'))];
  }, [completedProjects]);

  // Meses en orden cronológico (más reciente primero), con clave yyyy-MM.
  const months = useMemo(() => {
    const keys = new Set(
      completedProjects
        .map(({ info }) => (info.deliveryDate ? format(info.deliveryDate, 'yyyy-MM') : null))
        .filter(Boolean)
    );
    return Array.from(keys)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => {
        const label = format(new Date(`${key}-01T00:00:00`), 'MMMM yyyy', { locale: es });
        return { key, label: label.charAt(0).toUpperCase() + label.slice(1) };
      });
  }, [completedProjects]);

  const filteredProjects = useMemo(() => {
    const matchingIds = new Set(
      filterProjects(completedProjects.map(({ project }) => project), searchTerm).map((p) => p.id)
    );
    return completedProjects.filter(({ project, info }) => {
      const hasLink = Boolean(getDeliverableLink(project));
      if (showMissing === hasLink) return false;
      if (selectedClient !== 'Todos' && project.client !== selectedClient) return false;
      if (selectedMonth !== 'Todos') {
        if (!info.deliveryDate || format(info.deliveryDate, 'yyyy-MM') !== selectedMonth) return false;
      }
      return matchingIds.has(project.id);
    });
  }, [completedProjects, selectedClient, selectedMonth, showMissing, searchTerm]);

  const isFiltering = Boolean(searchTerm.trim()) || selectedClient !== 'Todos' || selectedMonth !== 'Todos';

  return (
    <div className="flex h-full flex-col gap-6 p-2 sm:p-4 md:p-6 animate-fade-up">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-primary dark:text-white sm:text-4xl">Galería</h1>
        <p className="mt-1 text-sm text-secondary dark:text-white/60">
          Entregables finales, del más reciente al más antiguo.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-secondary dark:text-white/40"
            />
            <input
              type="search"
              aria-label="Buscar en la Galería"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, cliente o responsable…"
              className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-9 text-sm font-medium text-primary focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 dark:border-white/10 dark:bg-[#16171D] dark:text-white dark:placeholder:text-white/40"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Borrar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary transition-colors hover:text-primary dark:text-white/50 dark:hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <label className="sr-only" htmlFor="gallery-client">Cliente</label>
          <select
            id="gallery-client"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-primary focus:border-accent focus:outline-none dark:border-white/10 dark:bg-[#16171D] dark:text-white"
          >
            {clients.map((c) => (
              <option key={c} value={c}>
                {c === 'Todos' ? 'Todos los clientes' : c}
              </option>
            ))}
          </select>

          <label className="sr-only" htmlFor="gallery-month">Mes de entrega</label>
          <select
            id="gallery-month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-primary focus:border-accent focus:outline-none dark:border-white/10 dark:bg-[#16171D] dark:text-white"
          >
            <option value="Todos">Todos los meses</option>
            {months.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Entregable">
          <button
            type="button"
            aria-pressed={!showMissing}
            onClick={() => setShowMissing(false)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              !showMissing
                ? 'bg-dark-bg text-white shadow-md dark:bg-accent dark:text-dark-bg'
                : 'border border-border bg-white text-secondary hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-white/60 dark:hover:bg-white/5'
            }`}
          >
            Con entregable
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${!showMissing ? 'bg-white/20' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/60'}`}>
              {completedProjects.length - missingCount}
            </span>
          </button>

          <button
            type="button"
            aria-pressed={showMissing}
            onClick={() => setShowMissing(true)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              showMissing
                ? 'bg-amber-500 text-white shadow-md'
                : 'border border-border bg-white text-secondary hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-white/60 dark:hover:bg-white/5'
            }`}
          >
            <AlertCircle size={13} />
            Sin entregable
            {missingCount > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${showMissing ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'}`}>
                {missingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {isFiltering && (
        <p className="-mt-2 text-sm text-secondary dark:text-white/60" aria-live="polite">
          {filteredProjects.length} resultado{filteredProjects.length !== 1 ? 's' : ''}
          {searchTerm.trim() && <span> para «<strong className="text-primary dark:text-white">{searchTerm.trim()}</strong>»</span>}
        </p>
      )}

      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.map(({ project, info }) => (
            <GalleryCard key={project.id} project={project} info={info} />
          ))}
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/60 bg-slate-50 dark:bg-white/[0.02]">
          {showMissing && !isFiltering ? (
            <>
              <CheckCircle size={28} className="text-green-600 opacity-70" />
              <p className="text-sm font-medium text-secondary dark:text-white/60">
                Todos los proyectos completados tienen entregable.
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-secondary dark:text-white/60">
              No hay proyectos con esos filtros.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default VistaGaleria;
