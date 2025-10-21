import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// The Supabase client is used across your app to talk to your database.
// These values should ideally be defined in an .env file at the root of the project
// as VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. See .env.example for more details.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
