import { startOfDay, parseISO, isValid } from 'date-fns';
import { getClientStyles } from './clientStyles';

export const getClientDetailBadgeClass = (client) => {
  const styles = getClientStyles(client);
  const paletteClass = styles?.badge || 'bg-[#EEF1FF] text-accent border-accent/40';
  return `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${paletteClass}`;
};

export const normalizeStageValue = (value) => {
  if (!value) return '';
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export const parseDate = (value) => {
  if (!value) return null;
  const iso = value.length <= 10 ? `${value}T00:00:00` : value;
  const date = parseISO(iso);
  if (Number.isNaN(date.getTime())) return null;
  return startOfDay(date);
};
