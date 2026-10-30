import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useStore from './useStore';
import { isSameMonth } from 'date-fns';
import { buildDashboardData, extractProjectInfo } from '../utils/dashboardHelpers';
import { isAbsenceProject } from '../utils/absences';

const selectDashboardState = (state) => ({
  projects: state.projects,
  selectedDashboardDate: state.selectedDashboardDate,
  isOnline: state.reportingData.isOnline,
});

const isCarbonoProject = (p) =>
  p.client?.toLowerCase() === 'carbono' || p.cliente?.toLowerCase() === 'carbono' || p.properties?.tag === 'carbono';

export const useDashboardData = () => {
  const { projects, selectedDashboardDate, isOnline } = useStore(useShallow(selectDashboardState));

  const dashboardMetrics = useMemo(
    () => buildDashboardData(projects || [], selectedDashboardDate),
    [projects, selectedDashboardDate]
  );

  // Cuota de Carbono: proyectos de Carbono que arrancan (inicio o primer
  // rodaje) en el mes elegido.
  const carbonoProjectsThisMonth = useMemo(
    () =>
      (projects || []).filter((p) => {
        if (!isCarbonoProject(p) || isAbsenceProject(p)) return false;
        const { workStart } = extractProjectInfo(p);
        return Boolean(workStart && isSameMonth(workStart, selectedDashboardDate));
      }).length,
    [projects, selectedDashboardDate]
  );

  return {
    ...dashboardMetrics,
    carbonoProjectsThisMonth,
    projects,
    selectedDashboardDate,
    isOnline,
  };
};

export default useDashboardData;
