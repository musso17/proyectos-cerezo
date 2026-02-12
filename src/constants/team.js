export const TEAM_MEMBERS = ['Marcelo', 'Mauricio', 'Edson', 'Luis'];

export const TEAM_STYLES = {
  Marcelo: {
    bg: 'bg-emerald-500/80',
    border: 'border-emerald-300/70',
    text: 'text-emerald-950',
    pill: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  },
  Mauricio: {
    bg: 'bg-sky-500/80',
    border: 'border-sky-300/70',
    text: 'text-sky-950',
    pill: 'bg-sky-500/20 text-sky-200 border-sky-400/40',
  },
  Edson: {
    bg: 'bg-amber-500/80',
    border: 'border-amber-300/70',
    text: 'text-amber-950',
    pill: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
  },
  Luis: {
    bg: 'bg-violet-500/80',
    border: 'border-violet-300/70',
    text: 'text-violet-950',
    pill: 'bg-violet-500/20 text-violet-200 border-violet-400/40',
  },
  default: {
    bg: 'bg-slate-500/80',
    border: 'border-slate-300/70',
    text: 'text-slate-950',
    pill: 'bg-slate-500/20 text-slate-200 border-slate-400/40',
  },
};

export const ensureMemberName = (name) => {
  if (Array.isArray(name)) {
    const [first] = name.map((member) => (member ? member.toString().trim() : '')).filter(Boolean);
    return first || 'Sin asignar';
  }
  if (name && name.toString().trim().length > 0) {
    return name.toString().trim();
  }
  return 'Sin asignar';
};
