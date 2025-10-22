import { addDays, isValid, parseISO, setHours, setMinutes, startOfDay } from 'date-fns';

const KEYWORD_RULES = [
  {
    keywords: ['spot'],
    offsetDays: 1,
  },
  {
    keywords: ['evento', 'contenido', 'lanzamiento'],
    offsetDays: 0,
  },
];

const toLower = (value) => {
  if (!value) return '';
  return value.toString().trim().toLowerCase();
};

const normalizeRecordingDate = (project) => {
  const candidates = [
    project.fechaGrabacion,
    project.fecha_grabacion,
    project.fechaGrabación,
    project.recordingDate,
    project.recording_date,
    project.properties?.fechaGrabacion,
    project.properties?.fecha_grabacion,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const strValue = candidate.toString().trim();
    if (!strValue) continue;

    // Try ISO parsing first to avoid timezone surprises
    const parsed = parseISO(strValue);
    if (isValid(parsed)) {
      return parsed;
    }

    const asDate = new Date(strValue);
    if (isValid(asDate)) {
      return asDate;
    }
  }

  return null;
};

const detectKeywordRule = (project) => {
  const detalleSources = [
    project.detalle,
    project.detail,
    project.descripcion,
    project.description,
    project.properties?.detalle,
    project.properties?.descripcion,
  ];

  const normalizedDetalle = detalleSources.map(toLower).join(' ');
  if (!normalizedDetalle) return null;

  for (const config of KEYWORD_RULES) {
    for (const keyword of config.keywords) {
      if (normalizedDetalle.includes(keyword)) {
        return { keyword, offsetDays: config.offsetDays };
      }
    }
  }

  return null;
};

const formatKeywordLabel = (keyword) => {
  if (!keyword) return 'proyecto';
  return keyword.charAt(0).toUpperCase() + keyword.slice(1);
};

export const generarTareaEdicion = (project) => {
  if (!project) return null;

  const recordingDate = normalizeRecordingDate(project);
  if (!recordingDate) return null;

  const rule = detectKeywordRule(project);
  if (!rule) return null;

  const sessionDay = startOfDay(addDays(recordingDate, rule.offsetDays));
  const startTime = setMinutes(setHours(sessionDay, 9), 0);
  const endTime = setMinutes(setHours(sessionDay, 18), 0);

  const relatedId = project.id || project.proyectoRelacionado || project.name || null;
  const relatedName = project.name || project.proyectoRelacionado || '';
  const keywordLabel = formatKeywordLabel(rule.keyword);
  const descripcion = `Edición para ${keywordLabel}`;

  const taskIdBase = relatedId ? relatedId.toString().trim() : relatedName.toLowerCase().replace(/\s+/g, '-');
  const taskId = `edicion-${taskIdBase}-${sessionDay.toISOString().split('T')[0]}`;

  return {
    id: taskId,
    tipo: 'edicion',
    fechaInicio: startTime.toISOString(),
    fechaFin: endTime.toISOString(),
    proyectoRelacionado: relatedId || relatedName,
    descripcion,
    projectName: relatedName,
    relatedProjectId: project.id || null,
    relatedProjectName: relatedName,
    manager: project.manager || '',
    keyword: rule.keyword,
    color: 'editing',
  };
};

export const generarTareasEdicionDesdeProyectos = (projects) => {
  if (!Array.isArray(projects)) return [];
  return projects
    .map((project) => generarTareaEdicion(project))
    .filter(Boolean);
};
