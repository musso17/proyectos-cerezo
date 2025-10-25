export const normalizeString = (value) => {
  if (!value && value !== 0) return '';
  const text = value.toString().trim().toLowerCase();
  // Remove diacritics
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9\s-]/g, '').trim();
};

export default normalizeString;
