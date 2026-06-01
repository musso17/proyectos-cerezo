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
import CarbonoMonthList from '../dashboard/CarbonoMonthList';
import UnclassifiedProjectsPanel from '../dashboard/UnclassifiedProjectsPanel';
import useStore from '../../hooks/useStore';

const VistaDashboard = () => {
  const openModal = useStore((state) => state.openModal);
  const currentUser = useStore((state) => state.currentUser);
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

      {/* Tablero Personal (Cerezo Hub Journey Fase 1) */}
      <div className="glass-panel rounded-3xl p-6 bg-gradient-to-br from-white/60 to-white/30 dark:from-white/10 dark:to-transparent border border-white/40 dark:border-white/5">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          Hola {currentUser?.user_metadata?.display_name?.split(' ')[0] || currentUser?.user_metadata?.full_name?.split(' ')[0] || currentUser?.email?.split('@')[0] || 'Equipo'}, hoy es {new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(new Date())}.
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">Tus prioridades de hoy son...</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {projects
            .filter(p => {
               const u = useStore.getState().currentUser;
               if (!u) return false;
               const term = (u.user_metadata?.display_name || u.user_metadata?.full_name || u.email || '').toLowerCase();
               const m = (p.managers || []).join(' ').toLowerCase() + ' ' + (p.manager || '').toLowerCase();
               return m.includes(term.split('@')[0]) || m.includes(term.split(' ')[0]);
            })
            .slice(0, 3) // show top 3 priorities
            .map((project, idx) => {
               const statusColor = project.status === 'En progreso' || project.status === 'En Proceso' ? 'bg-yellow-500' : 'bg-slate-500';
               return (
                 <div key={project.id || idx} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md transition-all" onClick={() => openModal(project)}>
                   <div className="flex items-center gap-2 mb-3">
                     <div className={`w-3 h-3 rounded-full ${statusColor}`}></div>
                     <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{project.status}</span>
                   </div>
                   <h3 className="font-semibold text-slate-800 dark:text-white line-clamp-1">{project.name || 'Proyecto sin nombre'}</h3>
                   <p className="text-sm text-slate-500 mt-1">{project.client}</p>
                 </div>
               );
          })}
          {projects.filter(p => {
               const u = useStore.getState().currentUser;
               if (!u) return false;
               const term = (u.user_metadata?.display_name || u.user_metadata?.full_name || u.email || '').toLowerCase();
               const m = (p.managers || []).join(' ').toLowerCase() + ' ' + (p.manager || '').toLowerCase();
               return m.includes(term.split('@')[0]) || m.includes(term.split(' ')[0]);
          }).length === 0 && (
            <div className="col-span-3 text-center py-6 text-slate-400">No tienes proyectos asignados para hoy. ¡Disfruta el día!</div>
          )}
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

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ClientProjectsChart data={clientsData} />
          <WeeklyRecordingsChart data={recordingsByWeek} />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ProjectDashboardList
            projects={projects}
            selectedMonth={selectedDashboardDate}
          />
          <CarbonoMonthList
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
