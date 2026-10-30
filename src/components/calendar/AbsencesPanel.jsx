import React, { useMemo } from 'react';
import { format, isSameMonth, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { isAbsenceProject } from '../../utils/absences';
import { getProjectBlockingDays, getProjectManagers } from '../../utils/dashboardHelpers';
import MemberAvatar from '../ui/MemberAvatar';

// Rango legible de días: "6–15 nov 2026" o "28 oct – 2 nov 2026" (o días sueltos).
const formatDays = (days) => {
  if (days.length === 0) return '';
  const first = days[0];
  const last = days[days.length - 1];
  if (days.length === 1) return format(first, "EEE d MMM yyyy", { locale: es });
  if (isSameMonth(first, last)) {
    return `${format(first, 'd', { locale: es })}–${format(last, "d MMM yyyy", { locale: es })}`;
  }
  return `${format(first, 'd MMM', { locale: es })} – ${format(last, "d MMM yyyy", { locale: es })}`;
};

// Ausencias del equipo (próximas y en curso). Alimentan el Timeline y el aviso de cruces.
const AbsencesPanel = ({ projects, onAdd, openModal }) => {
  const absences = useMemo(() => {
    const today = startOfDay(new Date());
    return (projects || [])
      .filter(isAbsenceProject)
      .map((project) => {
        const days = getProjectBlockingDays(project);
        return { project, days, last: days[days.length - 1] };
      })
      .filter(({ last }) => last && last >= today)
      .sort((a, b) => a.days[0] - b.days[0]);
  }, [projects]);

  return (
    <section aria-labelledby="absences-title" className="rounded-xl border border-border bg-white p-5 dark:border-white/10 dark:bg-[#16171D]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="absences-title" className="text-lg font-semibold text-primary dark:text-white">Ausencias</h3>
          <p className="text-sm text-secondary dark:text-white/60">
            Vacaciones y permisos. Se ven en el Timeline y avisan si alguien queda asignado ese día.
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          <Plus size={16} />
          Registrar ausencia
        </button>
      </div>

      {absences.length === 0 ? (
        <p className="mt-4 text-sm text-secondary dark:text-white/60">No hay ausencias próximas.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border/60 dark:divide-white/5">
          {absences.map(({ project, days }) => {
            const managers = getProjectManagers(project);
            return (
              <li key={project.id || project.name}>
                <button
                  type="button"
                  onClick={() => openModal(project)}
                  className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                >
                  <div className="flex -space-x-1.5">
                    {managers.map((m) => (
                      <MemberAvatar key={m} name={m} ring />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-primary dark:text-white">
                      {managers.join(', ') || 'Sin persona'}
                    </p>
                    <p className="truncate text-xs text-secondary dark:text-white/60">
                      {formatDays(days)} · {days.length} {days.length === 1 ? 'día' : 'días'}
                      {project.description ? ` · ${project.description}` : ''}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default AbsencesPanel;
