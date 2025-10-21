const palette = [
  { badge: 'bg-rose-500/20 text-rose-200 border-rose-400/40' },
  { badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40' },
  { badge: 'bg-amber-500/20 text-amber-200 border-amber-400/40' },
  { badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' },
  { badge: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40' },
  { badge: 'bg-violet-500/20 text-violet-200 border-violet-400/40' },
  { badge: 'bg-pink-500/20 text-pink-200 border-pink-400/40' },
  { badge: 'bg-blue-500/20 text-blue-200 border-blue-400/40' },
];

const clientColorMap = new Map();
let paletteIndex = 0;

export const getClientStyles = (client) => {
  if (!client || client.trim().length === 0) {
    return palette[palette.length - 1];
  }

  const key = client.trim().toLowerCase();

  if (clientColorMap.has(key)) {
    return clientColorMap.get(key);
  }

  const styles = palette[paletteIndex % palette.length];
  clientColorMap.set(key, styles);
  paletteIndex += 1;
  return styles;
};

const baseBadges = {
  md: 'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-[0_0_0_1px_rgba(255,255,255,0.05)]',
  sm: 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-[0_0_0_1px_rgba(255,255,255,0.05)]',
};

export const getClientBadgeClass = (client, size = 'md') => {
  const styles = getClientStyles(client);
  const base = baseBadges[size] || baseBadges.md;
  return `${base} ${styles.badge}`;
};
