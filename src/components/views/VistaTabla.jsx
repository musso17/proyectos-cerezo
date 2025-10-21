"use client";

import React, { useMemo } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import useStore from '../../hooks/useStore';

const statusStyles = {
  Finalizado: 'bg-blue-500/20 text-blue-200 border-blue-400/40',
  'En curso': 'bg-amber-300/20 text-amber-200 border-amber-300/40',
  'En progreso': 'bg-amber-300/20 text-amber-200 border-amber-300/40',
  Pendiente: 'bg-slate-500/20 text-slate-200 border-slate-400/40',
  'En revisión': 'bg-purple-500/20 text-purple-200 border-purple-400/40',
  Cancelado: 'bg-red-500/20 text-red-200 border-red-400/40',
};

const typeStyles = 'bg-slate-700/60 text-slate-200 border border-slate-600/60';
const clientStyles = 'bg-rose-500/20 text-rose-200 border border-rose-400/40';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().split('T')[0];
  } catch {
    return value;
  }
};

const VistaTabla = () => {
  const projects = useStore((state) => state.projects);
  const openModal = useStore((state) => state.openModal);
  const deleteProject = useStore((state) => state.deleteProject);

  const orderedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
      return bDate - aDate;
    });
  }, [projects]);

  const handleEdit = (project, event) => {
    event.stopPropagation();
    openModal(project);
  };

  const handleDelete = (project, event) => {
    event.stopPropagation();
    if (!project.id) return;
    const confirmed = window.confirm(`¿Eliminar el proyecto "${project.name}"?`);
    if (confirmed) {
      deleteProject(project.id);
    }
  };

  return (
    <div className="soft-scroll h-full overflow-auto">
      <div className="glass-panel overflow-hidden rounded-3xl">
        <table className="w-full border-collapse text-sm text-slate-300">
          <thead>
            <tr className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
              {['Contenido', 'Tipo', 'Encargado', 'Estado', 'Inicio', 'Entrega', 'Cliente', 'Acciones'].map((header) => (
                <th key={header} className="px-6 py-4 text-left font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orderedProjects.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                  No hay proyectos para mostrar.
                </td>
              </tr>
            ) : (
              orderedProjects.map((project, index) => {
                const statusClass = statusStyles[project.status] || statusStyles.Pendiente;
                return (
                  <tr
                    key={project.id || index}
                    className="border-t border-white/5 transition hover:bg-white/5"
                    onClick={() => openModal(project)}
                  >
                    <td className="px-6 py-5 text-sm font-semibold text-slate-100">
                      {project.name || 'Sin título'}
                      <p className="text-xs font-normal text-slate-400">{project.description || 'Sin descripción'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${typeStyles}`}>
                        {project.type || 'Sin tipo'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-300">{project.manager || 'Sin asignar'}</td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass}`}>
                        {project.status || 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-300">{formatDate(project.startDate)}</td>
                    <td className="px-6 py-5 text-sm text-slate-300">{formatDate(project.deadline)}</td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${clientStyles}`}>
                        {project.client || 'Sin cliente'}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => handleEdit(project, event)}
                          className="rounded-full bg-white/10 p-2 text-slate-100 transition hover:bg-white/20"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => handleDelete(project, event)}
                          className="rounded-full bg-red-500/20 p-2 text-red-200 transition hover:bg-red-500/30"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VistaTabla;
