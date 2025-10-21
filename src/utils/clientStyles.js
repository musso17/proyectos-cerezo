const palette = [
  { bg: 'bg-rose-500/15', text: 'text-rose-200', border: 'border-rose-400/40', badge: 'bg-rose-500/20 text-rose-200 border-rose-400/40' },
  { bg: 'bg-cyan-500/15', text: 'text-cyan-200', border: 'border-cyan-400/40', badge: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40' },
  { bg: 'bg-amber-500/15', text: 'text-amber-200', border: 'border-amber-400/40', badge: 'bg-amber-500/20 text-amber-200 border-amber-400/40' },
  { bg: 'bg-emerald-500/15', text: 'text-emerald-200', border: 'border-emerald-400/40', badge: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' },
  { bg: 'bg-indigo-500/15', text: 'text-indigo-200', border: 'border-indigo-400/40', badge: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40' },
  { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-200', border: 'border-fuchsia-400/40', badge: 'bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/40' },
  { bg: 'bg-lime-500/15', text: 'text-lime-200', border: 'border-lime-400/40', badge: 'bg-lime-500/20 text-lime-200 border-lime-400/40' },
  { bg: 'bg-blue-500/15', text: 'text-blue-200', border: 'border-blue-400/40', badge: 'bg-blue-500/20 text-blue-200 border-blue-400/40' },
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

