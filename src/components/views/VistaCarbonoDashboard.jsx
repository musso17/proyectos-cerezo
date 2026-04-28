"use client";
import { useMemo } from 'react';

import { addMonths, isSameMonth, parseISO, startOfMonth } from 'date-fns';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import {
  Briefcase,
  Activity,
  Video,
  PenSquare,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import useStore from '../../hooks/useStore';
import { useShallow } from 'zustand/react/shallow';
import MetricCard from '../shared/MetricCard';
import { MonthNavigator } from '../calendar/CalendarControls';
import ProjectDashboardList from '../dashboard/ProjectDashboardList';
import UnclassifiedProjectsPanel from '../dashboard/UnclassifiedProjectsPanel';
import { isProjectActiveInMonth, extractProjectInfo } from '../../utils/dashboardHelpers';

const selectDashboardState = (state) => ({
  projects: state.projects,
  selectedDashboardDate: state.selectedDashboardDate,
  setSelectedDashboardDate: state.setSelectedDashboardDate,
  reportingData: state.reportingData,
  openModal: state.openModal,
});

const VistaCarbonoDashboard = () => {
  const { projects, selectedDashboardDate, setSelectedDashboardDate, reportingData, openModal } = useStore(useShallow(selectDashboardState));
  const isOnline = reportingData.isOnline;

  const handlePrevMonth = () => setSelectedDashboardDate(addMonths(selectedDashboardDate, -1));
  const handleNextMonth = () => setSelectedDashboardDate(addMonths(selectedDashboardDate, 1));

  const carbonoData = useMemo(() => {
    const carbonoProjects = (projects || []).filter(
      (p) =>
        p.client?.toLowerCase() === 'carbono' ||
        p.cliente?.toLowerCase() === 'carbono' ||
        p.properties?.tag === 'carbono'
    );

    const totals = { active: 0, recording: 0, editing: 0, delivered: 0 };
    const managerLoad = new Map();
    const referenceDate = selectedDashboardDate;

    const carbonoProjectsThisMonth = carbonoProjects.filter(
      (p) => p.startDate && isSameMonth(parseISO(p.startDate), referenceDate)
    ).length;

    const RETAINER_LIMIT = 6;

    carbonoProjects.forEach((p) => {
      const projectInfo = extractProjectInfo(p);
      const { statusLabel, statusKey, isCompleted, stage, referenceCompletionDate, managers } = projectInfo;

      const isActiveInPeriod = isProjectActiveInMonth(projectInfo, referenceDate);

      if (!isCompleted && statusLabel !== 'Cancelado' && isActiveInPeriod) {
        totals.active += 1;
        const assignedManagers = managers?.length > 0 ? managers : ['Sin asignar'];
        assignedManagers.forEach((manager) => {
          managerLoad.set(manager, (managerLoad.get(manager) || 0) + 1);
        });
      }

      if (stage === 'grabacion' && !isCompleted && isActiveInPeriod) totals.recording += 1;
      if (stage === 'edicion' && !isCompleted && isActiveInPeriod) totals.editing += 1;

      // Entregados en el mes de referencia
      if (isCompleted && referenceCompletionDate && isSameMonth(referenceCompletionDate, referenceDate)) {
        totals.delivered += 1;
      }
    });

    const managerLoadData = Array.from(managerLoad.entries())
      .map(([manager, total]) => ({
        manager,
        total,
        level: total >= 5 ? 'Carga alta' : total >= 3 ? 'Carga media' : 'Carga controlada',
      }))
      .sort((a, b) => b.total - a.total);

    return {
      totals,
      managerLoad: managerLoadData,
      carbonoProjectsThisMonth,
      RETAINER_LIMIT,
      carbonoProjects
    };
  }, [projects, selectedDashboardDate]);

  const { totals, managerLoad, carbonoProjects } = carbonoData;

  return (
    <div className="space-y-8 px-3 py-4 sm:px-4 md:px-6 md:py-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-medium text-primary">Dashboard de Carbono MKT</h1>
          <p className="text-sm text-secondary/80">
            Resumen operativo de los proyectos de Carbono.
          </p>
        </div>
        <div className="glass-panel p-2">
          <MonthNavigator
            currentMonth={selectedDashboardDate}
            handlePrevMonth={handlePrevMonth}
            handleNextMonth={handleNextMonth}
          />
        </div>
      </div>

      {!isOnline && (
        <div className="bg-amber-500/15 border border-amber-400/30 text-amber-600 dark:text-amber-300 p-4 rounded-lg flex items-center gap-3">
          <AlertTriangle />
          <span>
            <strong>Modo Offline:</strong> Los reportes de Carbono están usando datos locales. Verifica tu conexión para sincronizar metas y KPIs oficiales.
          </span>
        </div>
      )}

      <UnclassifiedProjectsPanel
        projects={carbonoProjects}
        onAssign={(p) => openModal(p)}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Proyectos Carbono (Mes)"
          value={`${carbonoData.carbonoProjectsThisMonth} / ${carbonoData.RETAINER_LIMIT}`}
          description="Proyectos agendados este mes"
          icon={Briefcase}
          accent="border-transparent bg-[#EEF1FF] text-accent dark:border-[#2B2D31] dark:bg-[#212226] dark:text-purple-300"
        />
        <MetricCard
          title="Activos en periodo"
          value={totals.active}
          description="Proyectos no completados"
          icon={Activity}
          accent="border-transparent bg-[#E7F3FF] text-[#2563EB] dark:border-[#2B2D31] dark:bg-[#212226] dark:text-blue-300"
        />
        <MetricCard
          title="En grabación"
          value={totals.recording}
          description="En fase de grabación"
          icon={Video}
          accent="border-transparent bg-[#E7F1FF] text-[#4C8EF7] dark:border-[#2B2D31] dark:bg-[#212226] dark:text-blue-300"
        />
        <MetricCard
          title="En edición"
          value={totals.editing}
          description="En post-producción"
          icon={PenSquare}
          accent="border-transparent bg-[#EEF1FF] text-accent dark:border-[#2B2D31] dark:bg-[#212226] dark:text-purple-300"
        />
        <MetricCard
          title="Entregados (Mes)"
          value={totals.delivered}
          description="Completados en este mes"
          icon={CheckCircle2}
          accent="border-transparent bg-[#E6F5EC] text-[#2F9E44] dark:border-[#2B2D31] dark:bg-[#212226] dark:text-emerald-300"
        />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <div className="glass-panel flex flex-col gap-4 p-4 transition-all sm:p-6 h-full">
            <Header title="Carga de trabajo" subtitle="Por responsable (periodo)" />
            {managerLoad.length > 0 ? (
              <ul className="space-y-3">
                {managerLoad.map(({ manager, total, level }) => (
                  <li key={manager} className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#2B2D31] dark:bg-[#1B1C20]">
                    <div className="flex items-center gap-3">
                      <div className={`h-2.5 w-2.5 rounded-full ${getLoadColor(level)}`} />
                      <p className="text-sm font-medium text-primary">{manager}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-secondary">{total}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState message="No hay responsables asignados en este periodo." />
            )}
          </div>
        </div>
        <div className="xl:col-span-2">
          <ProjectDashboardList
            projects={carbonoProjects}
            selectedMonth={selectedDashboardDate}
            title="Listado de Proyectos Carbono"
          />
        </div>
      </section>
    </div>
  );
};

const Header = ({ title, subtitle }) => (
  <div>
    <h2 className="text-lg font-semibold text-primary">{title}</h2>
    <p className="text-xs uppercase tracking-[0.32em] text-secondary/60">{subtitle}</p>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[#CBD5F5] bg-[#F9FAFF] p-6 text-xs text-secondary dark:border-[#2B2D31] dark:bg-[#1B1C20] dark:text-white/50">
    {message}
  </div>
);

const getLoadColor = (level) => {
  switch (level) {
    case 'Carga alta':
      return 'bg-rose-400 shadow-[0_0_0_4px_rgba(248,113,113,0.12)]';
    case 'Carga media':
      return 'bg-amber-400 shadow-[0_0_0_4px_rgba(251,191,36,0.12)]';
    default:
      return 'bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]';
  }
};

export default VistaCarbonoDashboard;
