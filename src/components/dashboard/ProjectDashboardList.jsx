import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import useStore from '../../hooks/useStore';
import { isAbsenceProject } from '../../utils/absences';
import { extractProjectInfo, isProjectInPeriod } from '../../utils/dashboardHelpers';
import { getStatusLabel, normalizeStatus } from '../../utils/statusHelpers';

const STATUS_DOT = {
  Programado: 'bg-slate-400',
  'En progreso': 'bg-amber-500',
  'En revisión': 'bg-blue-500',
  Completado: 'bg-emerald-500',
  Stuck: 'bg-red-500',
};

const formatDay = (date) => (date ? format(date, 'd MMM', { locale: es }) : 'sin fecha');

// Proyectos del mes con el mismo criterio que los KPIs: abiertos con actividad
// en el mes + completados entregados en el mes. Sin ausencias.
const ProjectDashboardList = ({ projects, selectedMonth, title = 'Proyectos del mes' }) => {
  const openModal = useStore((state) => state.openModal);

  const items = useMemo(() => {
    const list = (projects || [])
      .filter((project) => !isAbsenceProject(project))
      .map((project) => ({ project, info: extractProjectInfo(project) }))
      .filter(({ info }) => isProjectInPeriod(info, selectedMonth));
    const open = list
      .filter(({ info }) => !info.isCompleted)
      .sort((a, b) => (a.info.workStart?.getTime() ?? Infinity) - (b.info.workStart?.getTime() ?? Infinity));
    const delivered = list
      .filter(({ info }) => info.isCompleted)
      .sort((a, b) => b.info.deliveryDate - a.info.deliveryDate);
    return { open, delivered };
  }, [projects, selectedMonth]);

  const renderItem = ({ project, info }) => {
    const status = normalizeStatus(project.status);
    return (
      <li key={project.id}>
        <button
          type="button"
          onClick={() => openModal(project)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[status]}`} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-primary dark:text-white/90">{project.name || 'Sin título'}</span>
            <span className="block text-xs text-secondary dark:text-white/60">
              {project.client || 'Sin cliente'} ·{' '}
              {info.isCompleted ? `entregado ${formatDay(info.deliveryDate)}` : `desde ${formatDay(info.workStart)}`}
            </span>
          </span>
          <span className="shrink-0 text-xs font-medium text-secondary dark:text-white/60">{getStatusLabel(status)}</span>
        </button>
      </li>
    );
  };

  return (
    <section className="glass-panel flex flex-col gap-3 rounded-xl p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold tracking-tight text-primary dark:text-white">{title}</h3>
        <p className="text-sm text-secondary dark:text-white/60">
          {items.open.length} en curso · {items.delivered.length} entregados
        </p>
      </div>

      {items.open.length + items.delivered.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-border/60 p-6 text-center text-sm text-secondary dark:text-white/60">
          No hay proyectos en este mes.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="px-3 text-sm font-semibold text-secondary dark:text-white/60">En curso</h4>
            <ul className="mt-1">{items.open.map(renderItem)}</ul>
          </div>
          <div>
            <h4 className="px-3 text-sm font-semibold text-secondary dark:text-white/60">Entregados</h4>
            <ul className="mt-1">{items.delivered.map(renderItem)}</ul>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProjectDashboardList;
