import { normalizeString } from './normalize';

// Filtros rápidos soportados en la búsqueda: `cliente:`, `estado:`, `tipo:`,
// `responsable:` (alias `encargado:`). Lo que no matchea `clave:valor` se
// trata como texto libre y se busca como antes.
const FILTER_FIELDS = {
  cliente: ['client', 'cliente'],
  estado: ['status'],
  tipo: ['type', 'registrationType'],
  responsable: ['manager', 'managers', 'team'],
  encargado: ['manager', 'managers', 'team'],
};

export const SEARCH_FILTER_KEYS = Object.keys(FILTER_FIELDS);

const isProjectOverdue = (project) => {
  const deadline = project?.deadline;
  if (!deadline) return false;
  if (normalizeString(project?.status || '') === 'completado') return false;
  const str = deadline.toString().trim();
  const date = new Date(str.length <= 10 ? `${str}T12:00:00` : str);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

const getFieldValues = (project, fields) => {
  const values = [];
  fields.forEach((field) => {
    const v = project?.[field];
    if (Array.isArray(v)) values.push(...v);
    else if (v) values.push(v);
  });
  return values;
};

// Separa `cliente:Carbono estado:vencido spot` en filtros estructurados +
// el resto como texto libre ("spot").
const parseSearchQuery = (term) => {
  const tokens = term.trim().split(/\s+/).filter(Boolean);
  const filters = [];
  const freeWords = [];

  tokens.forEach((token) => {
    const match = token.match(/^([a-zA-Záéíóúñ]+):(.+)$/i);
    const key = match ? normalizeString(match[1]) : null;
    if (match && FILTER_FIELDS[key] && match[2]) {
      filters.push({ key, value: match[2] });
    } else {
      freeWords.push(token);
    }
  });

  return { filters, freeText: freeWords.join(' ') };
};

export const filterProjects = (projects, term) => {
  const raw = (term || '').toString();
  if (!raw.trim()) return projects;

  const { filters, freeText } = parseSearchQuery(raw);
  const normalizedFreeText = normalizeString(freeText);

  return projects.filter((project) => {
    for (const { key, value } of filters) {
      if (key === 'estado' && normalizeString(value) === 'vencido') {
        if (!isProjectOverdue(project)) return false;
        continue;
      }
      const normalizedValue = normalizeString(value);
      const values = getFieldValues(project, FILTER_FIELDS[key]);
      if (!values.some((v) => normalizeString(v).includes(normalizedValue))) return false;
    }

    if (!normalizedFreeText) return true;

    const haystack = [
      project.name,
      project.client,
      project.manager,
      project.type,
      project.status,
      project.description,
    ];

    if (Array.isArray(project.team)) haystack.push(...project.team);
    if (Array.isArray(project.managers)) haystack.push(...project.managers);

    return haystack
      .filter(Boolean)
      .some((value) => normalizeString(value).includes(normalizedFreeText));
  });
};
