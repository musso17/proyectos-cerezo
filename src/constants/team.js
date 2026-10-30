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

const matchTeamMember = (raw) => {
  if (!raw) return null;
  const trimmed = raw.toString().trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  // Exact match
  const exact = TEAM_MEMBERS.find((m) => m.toLowerCase() === lower);
  if (exact) return exact;
  // First-name match (e.g. "Luis Matallana" → "Luis")
  const firstName = lower.split(/\s+/)[0];
  if (firstName) {
    const partial = TEAM_MEMBERS.find((m) => m.toLowerCase() === firstName);
    if (partial) return partial;
  }
  return trimmed;
};

// Avatares: mismas iniciales y colores en toda la app. Dos letras para que
// Marcelo (Ma) y Mauricio (Mu) no se confundan.
export const MEMBER_ABBREV = { Marcelo: 'Ma', Mauricio: 'Mu', Edson: 'Ed', Luis: 'Lu' };

export const MEMBER_COLORS = {
  Marcelo: '#10b981',
  Mauricio: '#0ea5e9',
  Edson: '#f59e0b',
  Luis: '#8b5cf6',
};

export const DEFAULT_MEMBER_COLOR = '#64748b';

// Lista blanca del equipo: también la usan las rutas del servidor para
// autorizar la oficina y los avisos por correo (ver src/lib/auth/teamAuth.js).
export const MEMBER_BY_EMAIL = {
  'hola@cerezoperu.com': 'Marcelo',
  'mauriciomu22ts@gmail.com': 'Mauricio',
  'edsonlom321@gmail.com': 'Edson',
  'luis.matallana.30@gmail.com': 'Luis',
};

export const getMemberInitials = (name) => {
  const member = matchTeamMember(name);
  if (!member) return '?';
  if (MEMBER_ABBREV[member]) return MEMBER_ABBREV[member];
  const parts = member.split(/[\s._-]+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return member.charAt(0).toUpperCase() + (member.charAt(1) || '').toLowerCase();
};

export const getTeamMemberByEmail = (email) =>
  MEMBER_BY_EMAIL[(email || '').toString().trim().toLowerCase()] || null;

// Solo el equipo entra a la oficina y a las salas de voz (Francisco no).
export const isTeamUser = (user) => Boolean(user && getTeamMemberByEmail(user.email));

// Integrante del equipo que corresponde al usuario con sesión iniciada.
export const getMemberNameForUser = (user) => {
  if (!user) return null;
  const meta = user.user_metadata || {};
  const fromName = matchTeamMember(meta.display_name || meta.full_name || meta.name || '');
  if (fromName && TEAM_MEMBERS.includes(fromName)) return fromName;
  const email = (user.email || '').toString().trim().toLowerCase();
  return MEMBER_BY_EMAIL[email] || null;
};

export const ensureMemberName = (name) => {
  if (Array.isArray(name)) {
    const [first] = name
      .map((member) => matchTeamMember(member))
      .filter(Boolean);
    return first || 'Sin asignar';
  }
  return matchTeamMember(name) || 'Sin asignar';
};
