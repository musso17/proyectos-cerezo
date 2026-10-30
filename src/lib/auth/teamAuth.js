import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { TEAM_MEMBERS, getTeamMemberByEmail, MEMBER_BY_EMAIL } from '../../constants/team.js';

// Solo servidor. Autentica (JWT de Supabase válido) y autoriza (el email está
// en la lista del equipo). Un JWT válido no basta: la anon key es pública y,
// si el registro estuviera abierto, cualquiera podría conseguir uno.

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://yoszuiotyyckvirlbleh.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || null;

export const getBearerToken = (req) => {
  const header = req.headers.get('authorization') || '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
};

// Solo en desarrollo y con OFFICE_DEV_AUTH=1: permite probar con varias
// pestañas sin cuentas reales (cabecera x-dev-member: Marcelo|Mauricio|…).
const getDevMember = (req) => {
  if (process.env.NODE_ENV !== 'development' || process.env.OFFICE_DEV_AUTH !== '1') return null;
  const member = req.headers.get('x-dev-member');
  if (!member || !TEAM_MEMBERS.includes(member)) return null;
  const email = Object.keys(MEMBER_BY_EMAIL).find((key) => MEMBER_BY_EMAIL[key] === member);
  return {
    user: { id: `dev-${member.toLowerCase()}`, email, user_metadata: { display_name: member } },
    member,
  };
};

const deny = (status, message) => NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });

// Devuelve { user, member } o { response } con el 401/403 listo para devolver.
// `verifyToken` se puede inyectar en pruebas.
export const requireTeamMember = async (req, { verifyToken } = {}) => {
  const dev = getDevMember(req);
  if (dev) return dev;

  const jwt = getBearerToken(req);
  if (!jwt) return { response: deny(401, 'Falta la sesión.') };

  let user = null;
  try {
    if (verifyToken) {
      user = await verifyToken(jwt);
    } else {
      if (!SUPABASE_ANON_KEY) return { response: deny(500, 'Falta NEXT_PUBLIC_SUPABASE_ANON_KEY en el servidor.') };
      // Cliente por request, sin sesión persistida: no mezcla estado entre usuarios.
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      // getUser consulta al servidor de Auth: detecta usuarios borrados o baneados.
      const { data, error } = await supabase.auth.getUser(jwt);
      if (error) throw error;
      user = data?.user || null;
    }
  } catch (error) {
    return { response: deny(401, 'Sesión inválida o vencida.') };
  }

  if (!user) return { response: deny(401, 'Sesión inválida o vencida.') };
  if (user.is_anonymous) return { response: deny(403, 'Las sesiones anónimas no tienen acceso.') };

  const member = getTeamMemberByEmail(user.email);
  if (!member) return { response: deny(403, 'Esta función es solo para el equipo.') };

  return { user, member };
};
