import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { queryKeys } from '@/app/query-client';
import { requireSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ServiceShop, TablesInsert } from '@/types';
import type { ShopCategory } from './constants';
import {
  geocodeSearch,
  getPlaceDetails,
  searchNearby,
  type GeocodeResult,
  type NearbyPlace,
  type PlaceDetails,
} from './api/places';

export interface SearchOptions {
  center: { lat: number; lng: number } | null;
  radius: number;
  category: ShopCategory;
  nameRegexOverride?: string;
  enabled: boolean;
}

/**
 * Runs a free OpenStreetMap (Overpass) nearby search whenever the criteria
 * change. Unlike a paid Places API this needs no map instance or API key —
 * it's a plain fetch keyed off the current search center.
 */
export function useNearbyPlaces(options: SearchOptions) {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const run = useCallback(async () => {
    if (!options.center || !options.enabled) return;

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const results = await searchNearby({
        center: options.center,
        radius: options.radius,
        category: options.category,
        nameRegexOverride: options.nameRegexOverride,
      });
      if (id === requestId.current) setPlaces(results);
    } catch (searchError) {
      if (id === requestId.current) {
        setError(searchError instanceof Error ? searchError.message : 'Search failed');
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.center?.lat,
    options.center?.lng,
    options.radius,
    options.category,
    options.nameRegexOverride,
    options.enabled,
  ]);

  useEffect(() => {
    void run();
  }, [run]);

  return { places, loading, error, refresh: run };
}

export function usePlaceDetails(placeId: string | null, origin?: { lat: number; lng: number } | null) {
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!placeId) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    getPlaceDetails(placeId, origin ?? undefined)
      .then((result) => {
        if (!cancelled) setDetails(result);
      })
      .catch((detailsError: unknown) => {
        if (!cancelled) {
          setError(detailsError instanceof Error ? detailsError.message : 'Could not load details');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId, origin?.lat, origin?.lng]);

  return { details, loading, error };
}

/** Free-text location search (address/city/zip) backed by Nominatim geocoding. */
export function useLocationSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const search = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const found = await geocodeSearch(trimmed);
      if (id === requestId.current) setResults(found);
    } catch (searchError) {
      if (id === requestId.current) {
        setError(searchError instanceof Error ? searchError.message : 'Search failed');
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [query]);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { query, setQuery, results, loading, error, search, clear };
}

// ---------------------------------------------------------------------------
// Saved shops
// ---------------------------------------------------------------------------
async function listShops(): Promise<ServiceShop[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('service_shops')
    .select('*')
    .order('is_favorite', { ascending: false })
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function useSavedShops() {
  return useQuery({
    queryKey: queryKeys.shops(),
    queryFn: listShops,
    enabled: isSupabaseConfigured,
    staleTime: 5 * 60_000,
  });
}

export function useShopMutations() {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async (shop: TablesInsert<'service_shops'>) => {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from('service_shops')
        .upsert(shop, { onConflict: 'place_id' })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success('Shop saved');
      void queryClient.invalidateQueries({ queryKey: queryKeys.shops() });
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from('service_shops')
        .update({ is_favorite: isFavorite })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shops() });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const supabase = requireSupabase();
      const { error } = await supabase.from('service_shops').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success('Shop removed');
      void queryClient.invalidateQueries({ queryKey: queryKeys.shops() });
    },
  });

  return { save, toggleFavorite, remove };
}

/** Browser geolocation with a graceful fallback to the truck's last position. */
export function useBrowserLocation(fallback: { lat: number; lng: number } | null) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [denied, setDenied] = useState(false);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (result) => setPosition({ lat: result.coords.latitude, lng: result.coords.longitude }),
      () => setDenied(true),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  }, []);

  const center = useMemo(() => position ?? fallback, [position, fallback]);

  return { position, center, denied, request };
}
