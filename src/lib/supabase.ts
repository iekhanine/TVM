import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* ==========================================================
   TVM SUPABASE CLIENT
   Shared Supabase connection for all Television Venue Media
   modules, including the existing Menu/Boards module and
   TVM Trivia.
   ========================================================== */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();

// Preferred variable for Supabase's current publishable-key format.
// VITE_SUPABASE_ANON_KEY remains supported as a compatibility fallback.
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
);

/* ==========================================================
   LEGACY MENU / BOARDS COMPATIBILITY

   The current Menu module still stores its prototype state in
   one_time_menu_state and appData.ts imports MENU_INSTANCE_ID.
   Keep this export until that module is migrated to the new
   normalized TVM Boards tables.
   ========================================================== */

export const MENU_INSTANCE_ID = (
  import.meta.env.VITE_MENU_INSTANCE_ID?.trim()
  || 'copper-fork'
);

export const SUPABASE_ENABLED = Boolean(
  supabaseUrl
  && supabasePublishableKey,
);

export const supabase: SupabaseClient | null = SUPABASE_ENABLED
  ? createClient(
      supabaseUrl!,
      supabasePublishableKey!,
      {
        auth: {
          // Trivia / TVM host administration requires persistent sessions.
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    )
  : null;
