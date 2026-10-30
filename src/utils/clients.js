import { normalizeString } from './normalize';

// Nombres distintos para el mismo cliente.
const CLIENT_ALIASES = {
  propio: 'interno',
};

export const getClientKey = (name) => {
  const key = normalizeString(name || '');
  return CLIENT_ALIASES[key] || key;
};

const getRawClient = (project) =>
  (project?.client || project?.cliente || project?.properties?.client || project?.properties?.cliente || '')
    .toString()
    .trim();

// Para cada cliente (sin distinguir mayúsculas, tildes ni alias) elige la
// escritura más usada: "FUSO" (1) y "Fuso" (22) → "Fuso".
export const buildClientLabelMap = (projects = []) => {
  const countsByKey = new Map();
  projects.forEach((project) => {
    const raw = getRawClient(project);
    if (!raw) return;
    const key = getClientKey(raw);
    if (!countsByKey.has(key)) countsByKey.set(key, new Map());
    const counts = countsByKey.get(key);
    counts.set(raw, (counts.get(raw) || 0) + 1);
  });

  const labels = new Map();
  countsByKey.forEach((counts, key) => {
    const [best] = Array.from(counts.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')
    );
    labels.set(key, best[0]);
  });
  return labels;
};

// Devuelve los proyectos con `client` unificado a la escritura canónica.
export const canonicalizeProjectClients = (projects = []) => {
  const labels = buildClientLabelMap(projects);
  return projects.map((project) => {
    const raw = getRawClient(project);
    if (!raw) return project;
    const canonical = labels.get(getClientKey(raw));
    if (!canonical || canonical === project.client) return project;
    return {
      ...project,
      client: canonical,
      properties: project.properties ? { ...project.properties, client: canonical } : project.properties,
    };
  });
};
