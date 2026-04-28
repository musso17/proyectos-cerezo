import React from 'react';
import { Activity, Video, PenSquare, CheckCircle2, Briefcase } from 'lucide-react';
import MetricCard from '../shared/MetricCard';

const DashboardMetrics = ({ totals, carbonoProjectsThisMonth, revisionMetrics }) => {
  return (
    <div className="space-y-6">
      {/* KPIs Principales */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard
          title="Carbono (Mes)"
          value={`${carbonoProjectsThisMonth}/6`}
          description="Objetivo mensual"
          icon={Briefcase}
        />
        <MetricCard
          title="Activos"
          value={totals.active}
          description="En curso"
          icon={Activity}
        />
        <MetricCard
          title="Grabación"
          value={totals.recording}
          description="Vigentes"
          icon={Video}
        />
        <MetricCard
          title="Edición"
          value={totals.editing}
          description="Post-producción"
          icon={PenSquare}
        />
        <MetricCard
          title="Entregados"
          value={totals.delivered}
          description="Completados"
          icon={CheckCircle2}
        />
      </section>
    </div>
  );
};

export default DashboardMetrics;
