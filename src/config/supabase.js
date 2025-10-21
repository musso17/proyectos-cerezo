import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://yoszuiotyyckvirlbleh.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlvc3p1aW90eXlja3ZpcmxibGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTEzODgsImV4cCI6MjA3NjEyNzM4OH0.SVuKeVx8fdTF38ipWpQaoQTlkfdXj7D05E9-LyBTW04';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  DEFAULT_SUPABASE_URL;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  DEFAULT_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!hasSupabaseConfig && typeof window !== 'undefined') {
  console.warn('Supabase env vars not found. Falling back to local storage.');
}
