import { createClient } from '@supabase/supabase-js';

export const getSupabase = (env: any) => {
  const url = env?.PUBLIC_SUPABASE_URL || env?.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
  const key = env?.PUBLIC_SUPABASE_ANON_KEY || env?.SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY;
  return createClient(url, key);
};
