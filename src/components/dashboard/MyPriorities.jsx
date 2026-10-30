import React, { useMemo } from 'react';
import { differenceInCalendarDays, startOfDay } from 'date-fns';
import { ArrowUpRight } from 'lucide-react';
import useStore from '../../hooks/useStore';
import { getMemberNameForUser, ensureMemberName } from '../../constants/team';
import { isAbsenceProject } from '../../utils/absences';
import { extractProjectInfo } from '../../utils/dashboardHelpers';
import { getStatusLabel, normalizeStatus } from '../../utils/statusHelpers';
import MemberAvatar from '../ui/MemberAvatar';

// Mismo mapeo que AUTO_PROGRESS_BY_STATUS en ModalDetalles.
const STATUS_PROGRESS = {
  Programado: 15,
  'En progreso': 55,
  'En revisión': 85,
  Completado: 100,
  Stuck: 40,
};

const STATUS_COLOR = {
  Programado: 'bg-slate-400',
  'En progreso': 'bg-amber-500',
  'En revisión': 'bg-blue-500',
  Completado: 'bg-emerald-500',
  Stuck: 'bg-red-500',
};

const MAX_PRIORITIES = 4;

// Tus proyectos abiertos: primero los vencidos (más atrasados arriba), luego por fecha más cercana.
const MyPriorities = ({ projects }) => {
  const currentUser = useStore((state) => state.currentUser);
  const openModal = useStore((state) => state.openModal);
  const member = getMemberNameForUser(currentUser);

  const priorities = useMemo(() => {
    if (!member) return [];
    const today = startOfDay(new Date());
    return (projects || [])
      .filter((project) => !isAbsenceProject(project))
      .filter((project) => (project.managers || []).some((m) => ensureMemberName(m) === member))
      .map((project) => {
        const info = extractProjectInfo(project);
        const overdueDays = info.deadlineDate && info.deadlineDate < today ? differenceInCalendarDays(today, info.deadlineDate) : 0;
        const nextDate = info.deadlineDate || info.lastRecordingDate || info.workStart;
        return { project, info, overdueDays, nextDate };
      })
      .filter(({ info }) => !info.isCompleted)
      .sort((a, b) => {
        if (a.overdueDays !== b.overdueDays) return b.overdueDays - a.overdueDays;
        return (a.nextDate?.getTime() ?? Infinity) - (b.nextDate?.getTime() ?? Infinity);
      });
  }, [projects, member]);

  if (!member) return null;

  return (
    <div>
      <h4 className="text-sm font-semibold text-primary dark:text-white">
        Tus proyectos abiertos <span className="font-normal text-secondary dark:text-white/60">({priorities.length})</span>
      </h4>
      {priorities.length === 0 ? (
        <p className="mt-2 text-sm text-secondary dark:text-white/60">No tienes proyectos abiertos.</p>
      ) : (
        <ul className="mt-2 grid gap-2 md:grid-cols-2">
          {priorities.slice(0, MAX_PRIORITIES).map(({ project, overdueDays }) => {
            const status = normalizeStatus(project.status);
            const manualProgress = project.properties?.progress;
            const hasManual = manualProgress !== '' && manualProgress !== null && manualProgress !== undefined;
            const progress = hasManual ? Math.min(100, Math.max(0, Number(manualProgress))) : STATUS_PROGRESS[status] ?? 20;
            return (
              <li key={project.id}>
                <button
                  type="button"
                  onClick={() => openModal(project)}
                  className={`group flex w-full items-center gap-3 rounded-lg border bg-white p-3 text-left transition hover:shadow-md dark:bg-white/[0.03] ${
                    overdueDays > 0 ? 'border-red-300 dark:border-red-500/40' : 'border-border/70 dark:border-white/10'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    {overdueDays > 0 ? (
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                        Vencido hace {overdueDays} {overdueDays === 1 ? 'día' : 'días'}
                      </p>
                    ) : (
                      <p className="flex items-center gap-1.5 text-xs font-medium text-secondary dark:text-white/60">
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_COLOR[status]}`} />
                        {getStatusLabel(status)}
                      </p>
                    )}
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-primary dark:text-white">{project.name || 'Sin nombre'}</p>
                    <p className="text-xs text-secondary dark:text-white/60">{project.client || '—'}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" aria-hidden="true">
                        <div className={`h-full rounded-full ${STATUS_COLOR[status]}`} style={{ width: `${progress}%` }} />
                      </div>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-secondary dark:text-white/60">{progress}%</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <ArrowUpRight size={15} className="text-secondary transition group-hover:text-primary dark:text-white/50" />
                    <div className="flex -space-x-1.5">
                      {(project.managers || []).slice(0, 3).map((m) => (
                        <MemberAvatar key={m} name={m} size="sm" ring />
                      ))}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MyPriorities;
