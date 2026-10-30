"use client";

import React from 'react';
import { toast } from 'react-hot-toast';
import useStore from '../../hooks/useStore';

// Elimina sin cuadro de confirmación del navegador y ofrece "Deshacer" durante
// unos segundos (vuelve a insertar el mismo proyecto).
export const deleteProjectWithUndo = async (project) => {
  if (!project?.id) return { ok: false };
  const { deleteProject, restoreProject } = useStore.getState();
  const result = await deleteProject(project.id);
  if (!result.ok) {
    toast.error('No se pudo eliminar el proyecto. Intenta de nuevo.');
    return result;
  }

  const name = project.name || 'Proyecto';
  toast(
    (t) => (
      <span className="flex items-center gap-3">
        <span>
          Se eliminó «{name}».
        </span>
        <button
          type="button"
          onClick={async () => {
            toast.dismiss(t.id);
            const restored = await restoreProject(result.project || project);
            if (restored.ok) toast.success(`«${name}» restaurado.`);
            else toast.error('No se pudo restaurar el proyecto.');
          }}
          className="shrink-0 rounded-md bg-white/15 px-2.5 py-1 text-sm font-semibold underline-offset-2 hover:underline"
        >
          Deshacer
        </button>
      </span>
    ),
    { duration: 8000 }
  );
  return result;
};

export const hasDeliverableLink = (project) =>
  Boolean(
    (project?.deliverableLink || project?.properties?.deliverableLink || project?.properties?.deliverable_link || '')
      .toString()
      .trim()
  );
