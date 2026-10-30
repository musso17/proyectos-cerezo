"use client";

import { addMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import useDashboardData from '../../hooks/useDashboardData';
import ClientProjectsChart from '../dashboard/ClientProjectsChart';
import WeeklyRecordingsChart from '../dashboard/WeeklyRecordingsChart';
import EditingAvgChart from '../dashboard/EditingAvgChart';
import ProjectDashboardList from '../dashboard/ProjectDashboardList';
import WeekAgenda from '../dashboard/WeekAgenda';
import ActionItems from '../dashboard/ActionItems';
import TeamLoad from '../dashboard/TeamLoad';
import MyPriorities from '../dashboard/MyPriorities';
import { MonthNavigator } from '../calendar/CalendarControls';
import useStore from '../../hooks/useStore';

const CARBONO_LIMIT = 5;

const StatTile = ({ label, value, hint, alert }) => (
  <div className={`flex flex-col gap-1 rounded-lg border p-4 ${alert ? 'border-red-300 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10' : 'border-border/70 bg-white dark:border-white/10 dark:bg-white/[0.03]'}`}>
    <span className="text-sm font-medium text-secondary dark:text-white/60">{label}</span>
    <span className="text-3xl font-semibold leading-none tabular-nums text-primary dark:text-white">{value}</span>
    {hint && (
      <span className={`flex items-center gap-1 text-xs font-medium ${alert ? 'text-red-700 dark:text-red-300' : 'text-secondary dark:text-white/60'}`}>
        {alert && <AlertTriangle size={12} />}
        {hint}
      </span>
    )}
  </div>
);

// Inicio en tres bloques: Esta semana · Requiere acción · Mes.
const VistaDashboard = () => {
  const openModal = useStore((state) => state.openModal);
  const currentUser = useStore((state) => state.currentUser);
  const setSelectedDashboardDate = useStore((state) => state.setSelectedDashboardDate);
  const {
    totals,
    carbonoProjectsThisMonth,
    clientsData,
    recordingsByWeek,
    editingAverageByType,
    managerLoad,
    projects,
    selectedDashboardDate,
    isOnline,
  } = useDashboardData();

  const handlePrevMonth = () => setSelectedDashboardDate(addMonths(selectedDashboardDate, -1));
  const handleNextMonth = () => setSelectedDashboardDate(addMonths(selectedDashboardDate, 1));

  const firstName =
    currentUser?.user_metadata?.display_name?.split(' ')[0] ||
    currentUser?.user_metadata?.full_name?.split(' ')[0] ||
    currentUser?.email?.split('@')[0] ||
    'equipo';
  const todayRaw = format(new Date(), "EEEE d 'de' MMMM", { locale: es });
  const todayLabel = todayRaw.charAt(0).toUpperCase() + todayRaw.slice(1);
  const monthLabel = format(selectedDashboardDate, 'MMMM yyyy', { locale: es });
  const carbonoFull = carbonoProjectsThisMonth >= CARBONO_LIMIT;

  return (
    <div className="flex h-full flex-col gap-6 p-2 sm:p-4 md:p-6 animate-fade-up">
      <div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-primary dark:text-white">
          Hola {firstName}
        </h1>
        <p className="mt-1 text-sm text-secondary dark:text-white/60">{todayLabel}</p>
      </div>

      {!isOnline && (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle size={18} />
          <span><strong>Sin conexión:</strong> estás viendo los datos guardados en este navegador.</span>
        </div>
      )}

      {/* 1 · Esta semana  +  2 · Requiere acción */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <div className="flex flex-col gap-6 xl:col-span-8">
          <WeekAgenda projects={projects} openModal={openModal} />
          <section className="glass-panel rounded-xl p-5 sm:p-6">
            <MyPriorities projects={projects} />
          </section>
        </div>
        <div className="xl:col-span-4">
          <ActionItems projects={projects} />
        </div>
      </div>

      {/* 3 · Mes */}
      <section aria-labelledby="month-title" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6 dark:border-white/10">
          <h2 id="month-title" className="text-2xl font-semibold tracking-tight text-primary dark:text-white">
            Mes
          </h2>
          <div className="glass-panel rounded-lg p-2">
            <MonthNavigator
              currentMonth={selectedDashboardDate}
              handlePrevMonth={handlePrevMonth}
              handleNextMonth={handleNextMonth}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <StatTile label="En curso" value={totals.active} hint={`Abiertos en ${monthLabel}`} />
          <StatTile label="En grabación" value={totals.recording} />
          <StatTile label="En edición" value={totals.editing} />
          <StatTile label="Entregados" value={totals.delivered} hint="Con entrega en el mes" />
          <StatTile
            label="Cuota Carbono"
            value={`${carbonoProjectsThisMonth} / ${CARBONO_LIMIT}`}
            hint={carbonoFull ? 'Límite mensual alcanzado' : `Quedan ${CARBONO_LIMIT - carbonoProjectsThisMonth}`}
            alert={carbonoFull}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <TeamLoad managerLoad={managerLoad} />
          <ClientProjectsChart data={clientsData} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <WeeklyRecordingsChart data={recordingsByWeek} />
          <EditingAvgChart data={editingAverageByType} />
        </div>

        <ProjectDashboardList projects={projects} selectedMonth={selectedDashboardDate} />
      </section>
    </div>
  );
};

export default VistaDashboard;
