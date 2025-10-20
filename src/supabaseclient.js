import { createClient } from '@supabase/supabase-js';

// The Supabase client is used across your app to talk to your database.
// These values should be defined in an .env file at the root of the project
// as VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. See .env.example for more details.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

