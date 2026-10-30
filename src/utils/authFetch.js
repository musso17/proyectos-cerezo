import { supabase } from '../config/supabase';

const DEVICE_KEY = 'cerezo-device-id';
const DEV_MEMBER_KEY = 'cerezo-dev-member';

// fetch con la sesión de Supabase (Authorization: Bearer). getSession()
// renueva el access token si venció mientras la pestaña dormía.
export const authFetch = async (url, options = {}) => {
  const headers = new Headers(options.headers || {});
  try {
    const { data } = (await supabase?.auth.getSession()) || {};
    const token = data?.session?.access_token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
  } catch {
    // sin sesión: el servidor responde 401
  }
  // Solo desarrollo: identidad de prueba para abrir varias pestañas sin cuentas
  // reales (el servidor la acepta únicamente con OFFICE_DEV_AUTH=1).
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    const devMember = window.localStorage.getItem(DEV_MEMBER_KEY);
    if (devMember) headers.set('x-dev-member', devMember);
  }
  return fetch(url, { ...options, headers });
};

// Id estable por navegador, para que laptop y teléfono no se expulsen entre sí.
export const getDeviceId = () => {
  if (typeof window === 'undefined') return 'web';
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() || `${Date.now()}${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return 'web';
  }
};
