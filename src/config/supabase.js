import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!hasSupabaseConfig && typeof window !== 'undefined') {
  console.warn('Supabase env vars not found. Falling back to local storage.');
}
