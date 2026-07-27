import { requireSupabase } from '@/lib/supabase';
import type { GlobalSearchRow } from '@/types';

/**
 * Fans out across trucks, invoices, maintenance/repairs, mileage & fuel,
 * documents and service shops via the `global_search` Postgres function.
 *
 * The function is `security invoker`, so it runs with the caller's row-level
 * security — a mechanic and an owner call the exact same RPC and simply get
 * different rows back. There is no separate "can search" permission to keep
 * in sync with the rest of the app.
 */
export async function searchAll(
  term: string,
  truckId: string | null,
  limitPerType = 6,
): Promise<GlobalSearchRow[]> {
  const query = term.trim();
  if (query.length < 2) return [];

  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('global_search', {
    p_query: query,
    p_truck_id: truckId,
    p_limit_per_type: limitPerType,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}
