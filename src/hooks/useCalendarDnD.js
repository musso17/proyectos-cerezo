import { useState, useCallback } from 'react';
import { startOfDay } from 'date-fns';
import { isAllowedIsaMilestoneDay, getIsaProjectKey } from '../utils/isaEstimates';

export const ISA_DRAG_TYPE = 'application/cerezo-isa';

export const useCalendarDnD = (projects, updateProject) => {
  const [draggingIsaPayload, setDraggingIsaPayload] = useState(null);
  const isDraggingIsa = Boolean(draggingIsaPayload);

  const updateProjectIsaOverride = useCallback(
    async (projectKey, milestoneType, date) => {
      if (!projectKey || !milestoneType || !date) return;

      const project = projects.find(p => getIsaProjectKey(p) === projectKey);
      if (!project) return;

      const normalizedDate = startOfDay(date);
      const currentOverrides = project.properties?.isaOverrides || {};

      const newProperties = {
        ...project.properties,
        isaOverrides: {
          ...currentOverrides,
          [milestoneType]: normalizedDate.toISOString(),
        },
      };

      const updatedProject = {
        ...project,
        properties: newProperties,
      };

      await updateProject(updatedProject, { skipLoading: true });
    },
    [projects, updateProject]
  );

  const handleIsaDragStart = useCallback((event, payload) => {
    if (!payload?.projectKey || !payload?.milestoneType) return;
    try {
      event.dataTransfer.setData(ISA_DRAG_TYPE, JSON.stringify(payload));
      event.dataTransfer.effectAllowed = 'move';
      setDraggingIsaPayload(payload);
    } catch (error) {
      console.error('No se pudo iniciar el arrastre ISA', error);
    }
  }, []);

  const handleIsaDragEnd = useCallback(() => {
    setDraggingIsaPayload(null);
  }, []);

  const handleDayDragOver = useCallback(
    (day) => (event) => {
      if (!draggingIsaPayload || !event.dataTransfer?.types?.includes(ISA_DRAG_TYPE)) return;
      const allowed = isAllowedIsaMilestoneDay(draggingIsaPayload.milestoneType, day);
      if (!allowed) {
        event.dataTransfer.dropEffect = 'none';
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    },
    [draggingIsaPayload]
  );

  const handleDayDrop = useCallback(
    (day) => (event) => {
      if (!event.dataTransfer?.types?.includes(ISA_DRAG_TYPE)) return;
      event.preventDefault();
      let payload = draggingIsaPayload;
      if (!payload) {
        try {
          const raw = event.dataTransfer.getData(ISA_DRAG_TYPE);
          payload = raw ? JSON.parse(raw) : null;
        } catch {
          payload = null;
        }
      }
      if (!payload?.projectKey || !payload?.milestoneType) {
        setDraggingIsaPayload(null);
        return;
      }
      if (!isAllowedIsaMilestoneDay(payload.milestoneType, day)) {
        setDraggingIsaPayload(null);
        return;
      }
      updateProjectIsaOverride(payload.projectKey, payload.milestoneType, day);
      setDraggingIsaPayload(null);
    },
    [draggingIsaPayload, updateProjectIsaOverride]
  );

  return {
    isDraggingIsa,
    draggingIsaPayload,
    handleIsaDragStart,
    handleIsaDragEnd,
    handleDayDragOver,
    handleDayDrop,
  };
};

export default useCalendarDnD;
