// Re-export the single shared supabase client from config/supabase
// to avoid creating multiple instances (which triggers multiple GoTrueClient warnings).
import { supabase as sharedSupabase } from './config/supabase';

export const supabase = sharedSupabase;
