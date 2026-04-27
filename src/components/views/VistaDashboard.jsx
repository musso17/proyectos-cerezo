"use client";

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import useDashboardData from '../../hooks/useDashboardData';
import DashboardMetrics from '../dashboard/DashboardMetrics';
import ClientProjectsChart from '../dashboard/ClientProjectsChart';
import WeeklyRecordingsChart from '../dashboard/WeeklyRecordingsChart';
import EditingAvgChart from '../dashboard/EditingAvgChart';
import StatusChart from '../dashboard/StatusChart';
import ManagerLoadTable from '../dashboard/ManagerLoadTable';

const VistaDashboard = () => {
  const {
    totals,
    carbonoProjectsThisMonth,
    revisionMetrics,
    clientsData,
    recordingsByWeek,
    editingAverageByType,
    activeStatusData,
    managerLoad,
  } = useDashboardData();

  return (
    <div className="space-y-8 px-3 py-4 sm:px-4 md:px-6 md:py-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Panel ejecutivo</h1>
          <p className="text-sm text-secondary/80">
            Monitorea el desempeño operativo del estudio.
          </p>
        </div>
      </div>

      <>
        {carbonoProjectsThisMonth > 6 && (
          <div className="bg-red-500/15 border border-red-400/30 text-red-300 p-4 rounded-lg flex items-center gap-3">
            <AlertTriangle />
            <span>
              <strong>Alerta:</strong> Se han agendado más de 6 proyectos de Carbono para este mes.
            </span>
          </div>
        )}

        <DashboardMetrics 
          totals={totals} 
          carbonoProjectsThisMonth={carbonoProjectsThisMonth} 
          revisionMetrics={revisionMetrics} 
        />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <ClientProjectsChart data={clientsData} />
          <WeeklyRecordingsChart data={recordingsByWeek} />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <EditingAvgChart data={editingAverageByType} />
          <ManagerLoadTable managerLoad={managerLoad} />
          <StatusChart data={activeStatusData} />
        </section>
      </>
    </div>
  );
};

export default VistaDashboard;
