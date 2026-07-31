import { createClient } from '@supabase/supabase-js';

// Get credentials from .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env file');
  console.error('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
