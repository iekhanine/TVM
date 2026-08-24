import { DEMO_DATA } from '../data/demo';
import { MENU_INSTANCE_ID, supabase } from '../lib/supabase';
import type { AppData } from '../types/menu';

const TABLE = 'one_time_menu_state';

function normalizeData(value: unknown): AppData {
  if (!value || typeof value !== 'object') {
    return structuredClone(DEMO_DATA);
  }

  return {
    ...structuredClone(DEMO_DATA),
    ...(value as Partial<AppData>),
  };
}

export async function loadRemoteData(fallback: AppData): Promise<AppData | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('id', MENU_INSTANCE_ID)
    .maybeSingle();

  if (error) {
    console.warn('[OneTime Menu] Supabase load failed; using local cache.', error.message);
    return null;
  }

  if (data?.data) {
    return normalizeData(data.data);
  }

  const seeded = normalizeData(fallback);
  const { error: seedError } = await supabase
    .from(TABLE)
    .upsert({
      id: MENU_INSTANCE_ID,
      data: seeded,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (seedError) {
    console.warn('[OneTime Menu] Supabase seed failed; using local cache.', seedError.message);
    return null;
  }

  return seeded;
}

export async function saveRemoteData(data: AppData): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from(TABLE)
    .upsert({
      id: MENU_INSTANCE_ID,
      data,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) {
    console.warn('[OneTime Menu] Supabase save failed; local cache still contains the update.', error.message);
  }
}

export function subscribeToRemoteData(onData: (data: AppData) => void): () => void {
  if (!supabase) return () => undefined;

  const channel = supabase
    .channel(`one-time-menu:${MENU_INSTANCE_ID}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE,
        filter: `id=eq.${MENU_INSTANCE_ID}`,
      },
      (payload: { new: unknown }) => {
        const nextRow = payload.new as { data?: unknown } | undefined;
        if (nextRow?.data) {
          onData(normalizeData(nextRow.data));
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
