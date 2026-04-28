const palette = [
  { badge: 'border-accent/40 bg-accent/20 backdrop-blur-md text-slate-900 dark:text-accent shadow-[0_4px_12px_rgba(255,75,42,0.1)]' },
  { badge: 'border-blue-300 bg-blue-100 backdrop-blur-md text-blue-900 dark:bg-blue-500/20 dark:text-blue-300' },
  { badge: 'border-amber-300 bg-amber-100 backdrop-blur-md text-amber-900 dark:bg-amber-500/20 dark:text-amber-300' },
  { badge: 'border-emerald-300 bg-emerald-100 backdrop-blur-md text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300' },
  { badge: 'border-teal-300 bg-teal-100 backdrop-blur-md text-teal-900 dark:bg-teal-500/20 dark:text-teal-300' },
  { badge: 'border-pink-300 bg-pink-100 backdrop-blur-md text-pink-900 dark:bg-pink-500/20 dark:text-pink-300' },
  { badge: 'border-orange-300 bg-orange-100 backdrop-blur-md text-orange-900 dark:bg-orange-500/20 dark:text-orange-300' },
  { badge: 'border-slate-300 bg-slate-100 backdrop-blur-md text-slate-900 dark:bg-slate-500/20 dark:text-slate-300' },
];

const clientColorMap = new Map();
let paletteIndex = 0;

import { normalizeString } from './normalize';

export const getClientStyles = (client) => {
  if (!client || client.toString().trim().length === 0) {
    return palette[palette.length - 1];
  }

  const key = normalizeString(client);

  if (clientColorMap.has(key)) {
    return clientColorMap.get(key);
  }

  const styles = palette[paletteIndex % palette.length];
  clientColorMap.set(key, styles);
  paletteIndex += 1;
  return styles;
};

const baseBadges = {
  md: 'inline-flex items-center rounded-xl border px-3 py-1 text-xs font-black uppercase tracking-[0.2em] shadow-sm',
  sm: 'inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] shadow-sm',
};

export const getClientBadgeClass = (client, size = 'md') => {
  const styles = getClientStyles(client);
  const base = baseBadges[size] || baseBadges.md;
  return `${base} ${styles.badge}`;
};
