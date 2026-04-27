import React from 'react';
import { Activity, Video, PenSquare, CheckCircle2, Briefcase, GaugeCircle, CalendarDays, Clock } from 'lucide-react';
import MetricCard from '../shared/MetricCard';

const DashboardMetrics = ({ totals, carbonoProjectsThisMonth, revisionMetrics }) => {
  return (
    <div className="space-y-6">
      {/* KPIs Principales - 2 columnas en móvil para mejor densidad */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard
          title="Activos"
          value={totals.active}
          description="Pendientes/Progreso"
          icon={Activity}
          accent="border-transparent bg-[#E7F3FF] text-[#2563EB] dark:border-[#2B2D31] dark:bg-[#212226] dark:text-blue-300"
        />
        <MetricCard
          title="Grabación"
          value={totals.recording}
          description="Vigentes"
          icon={Video}
          accent="border-transparent bg-[#E7F1FF] text-[#4C8EF7] dark:border-[#2B2D31] dark:bg-[#212226] dark:text-blue-300"
        />
        <MetricCard
          title="Edición"
          value={totals.editing}
          description="Post-producción"
          icon={PenSquare}
          accent="border-transparent bg-[#EEF1FF] text-accent dark:border-[#2B2D31] dark:bg-[#212226] dark:text-purple-300"
        />
        <MetricCard
          title="Entregados"
          value={totals.delivered}
          description="Completados"
          icon={CheckCircle2}
          accent="border-transparent bg-[#E6F5EC] text-[#2F9E44] dark:border-[#2B2D31] dark:bg-[#212226] dark:text-emerald-300"
        />
      </section>

      {/* Métricas de Gestión y Revisoría */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard
          title="Carbono (Mes)"
          value={`${carbonoProjectsThisMonth}/6`}
          description="Objetivo mensual"
          icon={Briefcase}
          accent="border-transparent bg-[#EEF1FF] text-accent dark:border-[#2B2D31] dark:bg-[#212226] dark:text-purple-300"
        />
        <MetricCard
          title="En Revisión"
          value={
            revisionMetrics.totalCycles > 0
              ? `${revisionMetrics.pendingReviews} / ${revisionMetrics.totalCycles}`
              : revisionMetrics.pendingReviews
          }
          description="Pendientes cliente"
          icon={GaugeCircle}
          accent="border-transparent bg-[#E7F3FF] text-[#2563EB] dark:border-[#2B2D31] dark:bg-[#212226] dark:text-amber-300"
        />
        <MetricCard
          title="Eficiencia"
          value={revisionMetrics.avgCyclesPerProject || 0}
          description="Ciclos promedio"
          icon={CalendarDays}
          accent="border-transparent bg-[#EEF1FF] text-accent dark:border-[#2B2D31] dark:bg-[#212226] dark:text-purple-300"
        />
        <MetricCard
          title="Feedback"
          value={
            revisionMetrics.averageReviewDays !== null
              ? `${revisionMetrics.averageReviewDays}d`
              : 'N/A'
          }
          description="Días de espera"
          icon={Clock}
          accent="border-transparent bg-[#FFF4E6] text-[#FFB020] dark:border-[#2B2D31] dark:bg-[#212226] dark:text-amber-300"
        />
      </section>
    </div>
  );
};

export default DashboardMetrics;
