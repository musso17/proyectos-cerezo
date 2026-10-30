import { getClientKey } from './clients';
import { normalizeString } from './normalize';
import { TEAM_MEMBERS } from '../constants/team';

// Fase usada para registrar ausencias del equipo (vacaciones, permisos…).
export const ABSENCE_STAGE = 'ausencia';

// Antes las ausencias se cargaban como grabaciones del cliente "Interno"
// llamadas "NO ESTÁ <nombre>". Se siguen reconociendo para no perderlas.
const LEGACY_ABSENCE_NAME = /^\s*no\s+est[aá](\s|$)/i;

export const isAbsenceProject = (project) => {
  if (!project) return false;
  const stage = (project.stage || project.properties?.stage || '').toString().trim().toLowerCase();
  if (stage === ABSENCE_STAGE) return true;
  const clientKey = getClientKey(
    project.client || project.cliente || project.properties?.client || ''
  );
  return clientKey === 'interno' && LEGACY_ABSENCE_NAME.test(project.name || '');
};

export const excludeAbsences = (projects = []) => projects.filter((project) => !isAbsenceProject(project));

// Las ausencias heredadas no tienen responsable: la persona está en el nombre
// ("NO ESTÁ EDSON" → Edson).
export const getAbsenceMembersFromName = (name) => {
  const words = new Set(normalizeString(name || '').split(/\s+/));
  return TEAM_MEMBERS.filter((member) => words.has(normalizeString(member)));
};
