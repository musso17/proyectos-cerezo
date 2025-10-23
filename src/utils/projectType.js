export const PROJECT_TYPE_VARIANTS = {
  grabacion: { label: 'Grabación', variant: 'grabacion' },
  edición: { label: 'Edición', variant: 'edicion' },
  edicion: { label: 'Edición', variant: 'edicion' },
};

const FALLBACK_TYPE = { label: 'Sin tipo', variant: 'neutral' };

const getStringValue = (value) => {
  if (!value) return '';
  return value.toString().trim().toLowerCase();
};

export const getProjectTypeMeta = (project) => {
  if (!project) return FALLBACK_TYPE;

  const stage = getStringValue(project.stage || project.properties?.stage);
  if (stage && PROJECT_TYPE_VARIANTS[stage]) {
    return PROJECT_TYPE_VARIANTS[stage];
  }

  const type = getStringValue(project.type || project.properties?.type);
  if (type && PROJECT_TYPE_VARIANTS[type]) {
    return PROJECT_TYPE_VARIANTS[type];
  }

  return FALLBACK_TYPE;
};
