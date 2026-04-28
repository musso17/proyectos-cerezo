import { useMemo, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { isSameMonth, parseISO } from 'date-fns';
import useStore from './useStore';
import { buildDashboardData, calculateEfficiencyMetrics } from '../utils/dashboardHelpers';

const selectDashboardState = (state) => ({
  projects: state.projects,
  revisionCycles: state.revisionCycles,
  selectedDashboardDate: state.selectedDashboardDate,
  reportingData: state.reportingData,
  fetchReportingData: state.fetchReportingData,
});

export const useDashboardData = () => {
  const { 
    projects, 
    revisionCycles, 
    selectedDashboardDate, 
    reportingData,
    fetchReportingData 
  } = useStore(useShallow(selectDashboardState));

  useEffect(() => {
    fetchReportingData();
  }, [fetchReportingData]);

  const dashboardMetrics = useMemo(
    () => buildDashboardData(projects || [], revisionCycles || {}, selectedDashboardDate),
    [projects, revisionCycles, selectedDashboardDate]
  );

  const { carbonoProjectsThisMonth, variableProjectsCount } = useMemo(() => {
    const now = selectedDashboardDate;
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
  }, [projects, selectedDashboardDate]);

  const efficiencyMetrics = useMemo(
    () => calculateEfficiencyMetrics(reportingData?.efficiency || []),
    [reportingData?.efficiency]
  );

  return {
    ...dashboardMetrics,
    carbonoProjectsThisMonth,
    variableProjectsCount,
    projects,
    selectedDashboardDate,
    reportingData,
    isOnline: reportingData.isOnline,
    efficiencyMetrics,
  };
};

export default useDashboardData;
