"use client";

import { addMonths } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import useDashboardData from '../../hooks/useDashboardData';
import DashboardMetrics from '../dashboard/DashboardMetrics';
import ClientProjectsChart from '../dashboard/ClientProjectsChart';
import WeeklyRecordingsChart from '../dashboard/WeeklyRecordingsChart';
import EditingAvgChart from '../dashboard/EditingAvgChart';
import StatusChart from '../dashboard/StatusChart';
import ManagerLoadTable from '../dashboard/ManagerLoadTable';
import { MonthNavigator } from '../calendar/CalendarControls';
import ProjectDashboardList from '../dashboard/ProjectDashboardList';
import UnclassifiedProjectsPanel from '../dashboard/UnclassifiedProjectsPanel';
import useStore from '../../hooks/useStore';

const VistaDashboard = () => {
  const openModal = useStore((state) => state.openModal);
  const {
    totals,
    carbonoProjectsThisMonth,
    revisionMetrics,
    clientsData,
    recordingsByWeek,
    editingAverageByType,
    activeStatusData,
    managerLoad,
    projects,
    selectedDashboardDate,
    isOnline,
  } = useDashboardData();

  const setSelectedDashboardDate = useStore((state) => state.setSelectedDashboardDate);

  const handlePrevMonth = () => setSelectedDashboardDate(addMonths(selectedDashboardDate, -1));
  const handleNextMonth = () => setSelectedDashboardDate(addMonths(selectedDashboardDate, 1));

  return (
    <div className="flex h-full flex-col gap-12 p-4 md:p-6 animate-fade-up overflow-y-auto soft-scroll">
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-primary tracking-tight dark:text-white leading-tight">Panel Ejecutivo</h1>
          <div className="flex items-center gap-2 mt-4">
            <div className="h-1.5 w-16 rounded-full brand-gradient" />
            <p className="text-[10px] font-semibold text-secondary/40 uppercase tracking-[0.4em]">
              Monitoreo operativo en tiempo real
            </p>
          </div>
        </div>
        <div className="glass-panel p-2 rounded-[1.5rem]">
          <MonthNavigator
            currentMonth={selectedDashboardDate}
            handlePrevMonth={handlePrevMonth}
            handleNextMonth={handleNextMonth}
          />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {!isOnline && (
          <div className="glass-panel bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-200 p-6 rounded-[2rem] flex items-center gap-4">
            <div className="rounded-2xl bg-amber-500/10 p-3">
              <AlertTriangle size={20} />
            </div>
            <span className="text-xs font-medium uppercase tracking-wide">
              <strong>Modo Offline:</strong> Datos locales activos
            </span>
          </div>
        )}

        {carbonoProjectsThisMonth > 6 && (
          <div className="glass-panel bg-red-500/5 border-red-500/20 text-red-500 dark:text-red-200 p-6 rounded-[2rem] flex items-center gap-4">
            <div className="rounded-2xl bg-red-500/10 p-3">
              <AlertTriangle size={20} />
            </div>
            <span className="text-xs font-medium uppercase tracking-wide">
              <strong>Alerta:</strong> Saturación de proyectos Carbono
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-12">
        <UnclassifiedProjectsPanel
          projects={projects}
          onAssign={(p) => openModal(p)}
        />

        <DashboardMetrics
          totals={totals}
          carbonoProjectsThisMonth={carbonoProjectsThisMonth}
          revisionMetrics={revisionMetrics}
        />

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <ClientProjectsChart data={clientsData} />
          <WeeklyRecordingsChart data={recordingsByWeek} />
          <ProjectDashboardList
            projects={projects}
            selectedMonth={selectedDashboardDate}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <EditingAvgChart data={editingAverageByType} />
          <ManagerLoadTable managerLoad={managerLoad} />
          <StatusChart data={activeStatusData} />
        </section>
      </div>
    </div>
  );
};

export default VistaDashboard;
