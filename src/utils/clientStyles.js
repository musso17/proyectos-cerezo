const palette = [
  { badge: 'border-[#D9D6FF] bg-[#EEF1FF] text-[#6C63FF]' },
  { badge: 'border-[#CDE5FF] bg-[#E7F3FF] text-[#4C8EF7]' },
  { badge: 'border-[#FFE0B0] bg-[#FFF4E6] text-[#C07A00]' },
  { badge: 'border-[#C8E6C9] bg-[#F1FAF3] text-[#2F9E44]' },
  { badge: 'border-[#D8F2F0] bg-[#ECFDF5] text-[#0F766E]' },
  { badge: 'border-[#FBCFE8] bg-[#FDF2F8] text-[#C026D3]' },
  { badge: 'border-[#FDE68A] bg-[#FEF9C3] text-[#B45309]' },
  { badge: 'border-[#D0D7E3] bg-[#F4F5F7] text-[#4B5563]' },
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
  md: 'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] glass-pill',
  sm: 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] glass-pill',
};

export const getClientBadgeClass = (client, size = 'md') => {
  const styles = getClientStyles(client);
  const base = baseBadges[size] || baseBadges.md;
  return `${base} ${styles.badge}`;
};
