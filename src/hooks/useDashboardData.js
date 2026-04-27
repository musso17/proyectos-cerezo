import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { isSameMonth, parseISO } from 'date-fns';
import useStore from './useStore';
import { buildDashboardData } from '../utils/dashboardHelpers';

const selectDashboardState = (state) => ({
  projects: state.projects,
  revisionCycles: state.revisionCycles,
});

export const useDashboardData = () => {
  const { projects, revisionCycles } = useStore(useShallow(selectDashboardState));

  const dashboardMetrics = useMemo(
    () => buildDashboardData(projects || [], revisionCycles || {}),
    [projects, revisionCycles]
  );

  const { carbonoProjectsThisMonth, variableProjectsCount } = useMemo(() => {
    const now = new Date();
    const carbonoProjects = (projects || []).filter(p => 
      (p.client?.toLowerCase() === 'carbono' || p.cliente?.toLowerCase() === 'carbono' || p.properties?.tag === 'carbono') &&
      p.startDate && isSameMonth(parseISO(p.startDate), now)
    );

    const variableProjects = (projects || []).filter(p => 
      !(p.client?.toLowerCase() === 'carbono' || p.cliente?.toLowerCase() === 'carbono' || p.properties?.tag === 'carbono')
    );
    return {
      carbonoProjectsThisMonth: carbonoProjects.length,
      variableProjectsCount: variableProjects.length,
    };
  }, [projects]);

  return {
    ...dashboardMetrics,
    carbonoProjectsThisMonth,
    variableProjectsCount,
    projects,
  };
};

export default useDashboardData;
