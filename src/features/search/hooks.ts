import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-client';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { isSupabaseConfigured } from '@/lib/supabase';
import { searchAll } from './api/search.api';

/**
 * Debounced global search across trucks, invoices, maintenance/repairs,
 * mileage & fuel, documents and service shops.
 *
 * `truckId` narrows results to the active truck when one is selected — pass
 * `null` to search across the whole fleet (e.g. from the command palette
 * before a truck is chosen).
 */
export function useGlobalSearch(term: string, truckId: string | null, limitPerType = 6) {
  const debounced = useDebouncedValue(term.trim(), 250);

  return useQuery({
    queryKey: [...queryKeys.search(debounced), truckId, limitPerType],
    queryFn: () => searchAll(debounced, truckId, limitPerType),
    enabled: debounced.length >= 2 && isSupabaseConfigured,
    staleTime: 30_000,
  });
}
