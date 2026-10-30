import React, { useMemo } from 'react';
import { differenceInCalendarDays, format, parseISO, startOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, CalendarX, CheckCircle2, Clock, Link2Off, OctagonAlert } from 'lucide-react';
import useStore from '../../hooks/useStore';
import { isAbsenceProject } from '../../utils/absences';
import { extractProjectInfo } from '../../utils/dashboardHelpers';
import { findUpcomingConflicts } from '../../utils/scheduleConflicts';
import { normalizeStatus } from '../../utils/statusHelpers';
import { setUIPreference } from '../../utils/uiPreferences';
import { hasDeliverableLink } from '../ui/projectActions';
import { SectionCard } from './ChartCard';

const MAX_ITEMS = 4;
const RECENT_DELIVERY_DAYS = 60;

const Group = ({ icon: Icon, title, count, tone = 'red', children, footer }) => (
  <div className="rounded-lg border border-border/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.02]">
    <p className="flex items-center gap-2 text-sm font-semibold text-primary dark:text-white">
      <Icon size={16} className={tone === 'red' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'} />
      {title}
      <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-secondary dark:bg-white/10 dark:text-white/70">
        {count}
      </span>
    </p>
    <ul className="mt-2 space-y-1">{children}</ul>
    {footer}
  </div>
);

const ItemButton = ({ onClick, title, detail }) => (
  <li>
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col rounded-md px-2 py-1.5 text-left transition hover:bg-slate-100 dark:hover:bg-white/5"
    >
      <span className="line-clamp-2 text-sm font-medium text-primary dark:text-white/90">{title}</span>
      {detail && <span className="text-xs text-secondary dark:text-white/60">{detail}</span>}
    </button>
  </li>
);

const More = ({ count }) =>
  count > 0 ? <li className="px-2 pt-1 text-xs text-secondary dark:text-white/50">y {count} más</li> : null;

// Lo que necesita a alguien hoy: vencidos, cruces, atascados, entregas sin link y sin fecha.
const ActionItems = ({ projects }) => {
  const openModal = useStore((state) => state.openModal);
  const setCurrentView = useStore((state) => state.setCurrentView);

  const groups = useMemo(() => {
    const today = startOfDay(new Date());
    const recentLimit = subDays(today, RECENT_DELIVERY_DAYS);
    const overdue = [];
    const stuck = [];
    const missingLinks = [];
    const unscheduled = [];

    (projects || []).forEach((project) => {
      if (isAbsenceProject(project)) return;
      const info = extractProjectInfo(project);
      if (info.isCompleted) {
        if (!hasDeliverableLink(project) && info.deliveryDate && info.deliveryDate >= recentLimit) {
          missingLinks.push({ project, info });
        }
        return;
      }
      if (info.deadlineDate && info.deadlineDate < today) {
        overdue.push({ project, info, days: differenceInCalendarDays(today, info.deadlineDate) });
      }
      if (normalizeStatus(project.status) === 'Stuck') stuck.push({ project, info });
      if (!info.workStart) unscheduled.push({ project, info });
    });

    overdue.sort((a, b) => b.days - a.days);
    missingLinks.sort((a, b) => b.info.deliveryDate - a.info.deliveryDate);

    return {
      overdue,
      stuck,
      missingLinks,
      unscheduled,
      conflicts: findUpcomingConflicts(projects || [], today),
    };
  }, [projects]);

  const total =
    groups.overdue.length + groups.stuck.length + groups.missingLinks.length + groups.unscheduled.length + groups.conflicts.length;

  const goToMissingDeliverables = () => {
    setUIPreference('galleryShowMissing', true);
    setCurrentView('Gallery');
  };

  return (
    <SectionCard title="Requiere acción" description={total ? `${total} pendiente${total === 1 ? '' : 's'}` : 'Nada pendiente'}>
      {total === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center dark:border-white/10">
          <CheckCircle2 size={24} className="text-emerald-600" />
          <p className="text-sm text-secondary dark:text-white/60">Todo en orden.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.overdue.length > 0 && (
            <Group icon={Clock} title="Vencidos" count={groups.overdue.length}>
              {groups.overdue.slice(0, MAX_ITEMS).map(({ project, days }) => (
                <ItemButton
                  key={project.id}
                  onClick={() => openModal(project)}
                  title={project.name}
                  detail={`Vencido hace ${days} ${days === 1 ? 'día' : 'días'} · ${(project.managers || []).join(', ') || 'sin responsable'}`}
                />
              ))}
              <More count={groups.overdue.length - MAX_ITEMS} />
            </Group>
          )}

          {groups.conflicts.length > 0 && (
            <Group icon={AlertTriangle} title="Cruces de agenda" count={groups.conflicts.length}>
              {groups.conflicts.slice(0, MAX_ITEMS).map((conflict) => (
                <ItemButton
                  key={`${conflict.member}-${conflict.day}`}
                  onClick={() => openModal(conflict.entries.find((e) => e.kind !== 'absence')?.project || conflict.entries[0].project)}
                  title={`${conflict.member} · ${format(parseISO(`${conflict.day}T00:00:00`), "EEE d MMM", { locale: es })}`}
                  detail={conflict.entries
                    .map((entry) => (entry.kind === 'absence' ? 'ausente' : entry.project.name))
                    .join(' + ')}
                />
              ))}
              <More count={groups.conflicts.length - MAX_ITEMS} />
            </Group>
          )}

          {groups.stuck.length > 0 && (
            <Group icon={OctagonAlert} title="Atascados" count={groups.stuck.length}>
              {groups.stuck.slice(0, MAX_ITEMS).map(({ project }) => (
                <ItemButton key={project.id} onClick={() => openModal(project)} title={project.name} detail={project.client} />
              ))}
              <More count={groups.stuck.length - MAX_ITEMS} />
            </Group>
          )}

          {groups.missingLinks.length > 0 && (
            <Group
              icon={Link2Off}
              tone="amber"
              title="Entregados sin link"
              count={groups.missingLinks.length}
              footer={
                <button
                  type="button"
                  onClick={goToMissingDeliverables}
                  className="mt-2 px-2 text-xs font-semibold text-[#C2321A] underline-offset-2 hover:underline dark:text-accent"
                >
                  Completar en Galería
                </button>
              }
            >
              {groups.missingLinks.slice(0, MAX_ITEMS - 1).map(({ project, info }) => (
                <ItemButton
                  key={project.id}
                  onClick={() => openModal(project)}
                  title={project.name}
                  detail={`Entregado el ${format(info.deliveryDate, "d MMM", { locale: es })}`}
                />
              ))}
              <More count={groups.missingLinks.length - (MAX_ITEMS - 1)} />
            </Group>
          )}

          {groups.unscheduled.length > 0 && (
            <Group icon={CalendarX} tone="amber" title="Sin fecha" count={groups.unscheduled.length}>
              {groups.unscheduled.slice(0, MAX_ITEMS).map(({ project }) => (
                <ItemButton key={project.id} onClick={() => openModal(project)} title={project.name} detail={project.client} />
              ))}
              <More count={groups.unscheduled.length - MAX_ITEMS} />
            </Group>
          )}
        </div>
      )}
    </SectionCard>
  );
};

export default ActionItems;
