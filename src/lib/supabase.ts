import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const MENU_INSTANCE_ID = import.meta.env.VITE_MENU_INSTANCE_ID?.trim() || 'copper-fork';
export const SUPABASE_ENABLED = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase: SupabaseClient | null = SUPABASE_ENABLED
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;
