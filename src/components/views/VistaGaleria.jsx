"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { normalizeStatus } from '../../utils/statusHelpers';
import useStore from '../../hooks/useStore';
import {
  Link,
  Save,
  CheckCircle,
  ExternalLink,
  Edit,
  Calendar,
  User,
  Clock,
  Copy,
  Check,
  Search,
  AlertCircle,
  X,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return format(parseISO(dateString), 'd MMM, yyyy', { locale: es });
  } catch {
    return 'Fecha inválida';
  }
};

const getProjectStartDate = (project) => {
  if (!project) return null;
  return (
    project.startDate ||
    project.start_date ||
    project.fecha_inicio ||
    project.properties?.startDate ||
    project.properties?.fecha_inicio ||
    project.created_at ||
    null
  );
};

const getProjectCompletionDate = (project) => {
  if (!project) return null;
  return (
    project.completedAt ||
    project.completed_at ||
    project.deadline ||
    project.fechaEntrega ||
    project.fecha_entrega ||
    project.endDate ||
    project.end_date ||
    project.properties?.completedAt ||
    project.properties?.deadline ||
    project.updated_at ||
    null
  );
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
      // fallback
      const el = document.createElement('textarea');
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? '¡Copiado!' : 'Copiar enlace'}
      className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all hover:scale-110 active:scale-95 ${
        copied
          ? 'border-green-400/40 bg-green-500/10 text-green-500 dark:border-green-400/30 dark:bg-green-500/10'
          : 'border-border bg-white text-secondary hover:border-accent/30 hover:text-accent dark:border-white/10 dark:bg-white/5 dark:text-white/70'
      }`}
    >
      {copied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} />}
    </button>
  );
};

// ─── GalleryCard ──────────────────────────────────────────────────────────────

const GalleryCard = ({ project, isMissing }) => {
  const updateProject = useStore((state) => state.updateProject);

  const initialLink = useMemo(
    () => project.properties?.deliverableLink || project.deliverableLink || '',
    [project]
  );

  const [link, setLink] = useState(initialLink);
  const [isEditing, setIsEditing] = useState(!initialLink);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    await updateProject(
      {
        id: project.id,
        properties: { ...project.properties, deliverableLink: link.trim() },
      },
      true
    );
    setIsSaving(false);
    setIsEditing(false);
  };

  const startDate = getProjectStartDate(project);
  const completionDate = getProjectCompletionDate(project);
  const manager =
    project.manager ||
    (Array.isArray(project.managers) && project.managers.join(', ')) ||
    (Array.isArray(project.properties?.managers) && project.properties.managers.join(', '));

  return (
    <div
      className={`flex flex-col rounded-[2.5rem] border bg-white shadow-sm transition-all hover:shadow-2xl hover:-translate-y-1 dark:bg-[#16171D] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] ${
        isMissing
          ? 'border-amber-400/30 dark:border-amber-500/20'
          : 'border-border/40 dark:border-white/5'
      }`}
    >
      {/* Missing indicator */}
      {isMissing && (
        <div className="flex items-center gap-2 px-8 pt-5 pb-0">
          <AlertCircle size={13} className="text-amber-500 shrink-0" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-500">
            Sin entregable
          </span>
        </div>
      )}

      <div className="p-8 pb-4">
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
            <User size={16} className="text-secondary/30 shrink-0" />
            <span>{manager}</span>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-secondary/30 shrink-0" />
          <span>{formatDate(startDate)}</span>
        </div>
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-secondary/30 shrink-0" />
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
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
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
          <div className="flex items-center gap-2">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-dark-bg px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white shadow-xl transition-all hover:scale-[1.02] active:scale-95 dark:bg-accent dark:text-dark-bg"
            >
              <ExternalLink size={16} strokeWidth={3} /> Ver
            </a>
            <CopyButton link={link} />
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

// ─── VistaGaleria ─────────────────────────────────────────────────────────────

const VistaGaleria = ({ projects: projectsProp }) => {
  const projectsFromStore = useStore((state) => state.projects);
  const projects = projectsProp !== undefined ? projectsProp : projectsFromStore;

  const [selectedClient, setSelectedClient] = useState('Todos');
  const [selectedMonth, setSelectedMonth] = useState('Todos');
  const [showMissing, setShowMissing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const completedProjects = useMemo(
    () =>
      (projects || [])
        .filter((p) => normalizeStatus(p.status) === 'Completado')
        .sort(
          (a, b) =>
            new Date(b.deadline || b.updated_at) -
            new Date(a.deadline || a.updated_at)
        ),
    [projects]
  );

  const missingCount = useMemo(
    () =>
      completedProjects.filter(
        (p) =>
          !p.properties?.deliverableLink &&
          !p.deliverableLink
      ).length,
    [completedProjects]
  );

  const clients = useMemo(() => {
    const all = completedProjects.map((p) => p.client).filter(Boolean);
    return ['Todos', ...new Set(all)].sort();
  }, [completedProjects]);

  const months = useMemo(() => {
    const all = completedProjects
      .map((p) => {
        const d = getProjectCompletionDate(p);
        if (!d) return null;
        try {
          return format(parseISO(d), 'MMMM yyyy', { locale: es });
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return ['Todos', ...new Set(all)];
  }, [completedProjects]);

  const clearSearch = useCallback(() => setSearchQuery(''), []);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return completedProjects.filter((p) => {
      const hasLink = !!(p.properties?.deliverableLink || p.deliverableLink);
      if (showMissing && hasLink) return false;
      if (!showMissing && !hasLink) return false;
      if (selectedClient !== 'Todos' && p.client !== selectedClient) return false;
      if (selectedMonth !== 'Todos') {
        const d = getProjectCompletionDate(p);
        if (!d) return false;
        try {
          const ms = format(parseISO(d), 'MMMM yyyy', { locale: es });
          if (ms !== selectedMonth) return false;
        } catch {
          return false;
        }
      }
      if (q) {
        const name = (p.name || '').toLowerCase();
        const client = (p.client || '').toLowerCase();
        const manager = (
          p.manager ||
          (Array.isArray(p.properties?.managers) ? p.properties.managers.join(' ') : '') ||
          ''
        ).toLowerCase();
        if (!name.includes(q) && !client.includes(q) && !manager.includes(q)) return false;
      }
      return true;
    });
  }, [completedProjects, selectedClient, selectedMonth, showMissing, searchQuery]);

  return (
    <div className="flex h-full flex-col gap-6 p-4 md:p-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold text-primary tracking-tight dark:text-white">
          Galería
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <div className="h-1 w-8 rounded-full bg-accent" />
          <p className="text-xs font-medium text-secondary/60 uppercase tracking-[0.2em]">
            Repositorio de entregables finales
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3">
        {/* Row 1: search + client + month */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/40 dark:text-white/30 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, cliente o encargado…"
              className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-9 text-sm font-medium text-primary focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 dark:border-white/5 dark:bg-[#16171D] dark:text-white dark:placeholder:text-white/30"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary/40 hover:text-secondary dark:text-white/30 dark:hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Client filter */}
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-primary focus:border-accent focus:outline-none dark:border-white/5 dark:bg-[#16171D] dark:text-white"
          >
            {clients.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Month filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-primary focus:border-accent focus:outline-none dark:border-white/5 dark:bg-[#16171D] dark:text-white"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Row 2: toggle con/sin entregable */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowMissing(false)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              !showMissing
                ? 'bg-dark-bg text-white shadow-md dark:bg-accent'
                : 'border border-border bg-white text-secondary hover:bg-slate-50 dark:border-white/5 dark:bg-transparent dark:text-white/50 dark:hover:bg-white/5'
            }`}
          >
            Con entregable
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                !showMissing ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/40'
              }`}
            >
              {completedProjects.length - missingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowMissing(true)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              showMissing
                ? 'bg-amber-500 text-white shadow-md'
                : 'border border-border bg-white text-secondary hover:bg-slate-50 dark:border-white/5 dark:bg-transparent dark:text-white/50 dark:hover:bg-white/5'
            }`}
          >
            <AlertCircle size={13} />
            Sin entregable
            {missingCount > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  showMissing
                    ? 'bg-white/25 text-white'
                    : 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
                }`}
              >
                {missingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Results count */}
      {(searchQuery || selectedClient !== 'Todos' || selectedMonth !== 'Todos') && (
        <p className="text-xs text-secondary/50 dark:text-white/30 -mt-2">
          {filteredProjects.length} resultado{filteredProjects.length !== 1 ? 's' : ''}
          {searchQuery && <span className="ml-1">para &ldquo;<strong>{searchQuery}</strong>&rdquo;</span>}
        </p>
      )}

      {/* Grid */}
      {filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProjects.map((project) => (
            <GalleryCard
              key={project.id}
              project={project}
              isMissing={showMissing}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-[3rem] border-2 border-dashed border-border/40 bg-slate-50 dark:bg-white/[0.02]">
          {showMissing ? (
            <>
              <CheckCircle size={28} className="text-green-500 opacity-60" />
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary/40">
                Todos los proyectos tienen entregable cargado 🎉
              </p>
            </>
          ) : (
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary/40">
              No hay proyectos con esos filtros
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default VistaGaleria;
