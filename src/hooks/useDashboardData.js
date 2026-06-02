import { useMemo, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { isSameMonth, parseISO } from 'date-fns';
import useStore from './useStore';
import { buildDashboardData, calculateEfficiencyMetrics, extractProjectInfo } from '../utils/dashboardHelpers';

const selectDashboardState = (state) => ({
  projects: state.projects,
  selectedDashboardDate: state.selectedDashboardDate,
  reportingData: state.reportingData,
  fetchReportingData: state.fetchReportingData,
});

export const useDashboardData = () => {
  const {
    projects,
    selectedDashboardDate,
    reportingData,
    fetchReportingData
  } = useStore(useShallow(selectDashboardState));

  useEffect(() => {
    fetchReportingData();
  }, [fetchReportingData]);

  const dashboardMetrics = useMemo(
    () => buildDashboardData(projects || [], selectedDashboardDate),
    [projects, selectedDashboardDate]
  );

  const { carbonoProjectsThisMonth, variableProjectsCount } = useMemo(() => {
    const now = selectedDashboardDate;
    const carbonoProjects = (projects || []).filter(p => {
      const info = extractProjectInfo(p);
      return (p.client?.toLowerCase() === 'carbono' || p.cliente?.toLowerCase() === 'carbono' || p.properties?.tag === 'carbono') &&
      info.startDate && isSameMonth(info.startDate, now);
    });

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
