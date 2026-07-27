import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { queryKeys } from '@/app/query-client';
import { requireSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ServiceShop, TablesInsert } from '@/types';
import { getPlaceDetails, searchNearby, type NearbyPlace, type PlaceDetails } from './api/places';

export interface SearchOptions {
  center: { lat: number; lng: number } | null;
  radius: number;
  keyword: string;
  type?: string;
  openNow: boolean;
  minRating: number;
  enabled: boolean;
}

/**
 * Runs a Places nearby search whenever the criteria change. The PlacesService
 * needs a map (or a div) to attach to, so the caller passes the map instance
 * once it is ready.
 */
export function useNearbyPlaces(map: google.maps.Map | null, options: SearchOptions) {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef<google.maps.places.PlacesService | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (map && !serviceRef.current) {
      serviceRef.current = new google.maps.places.PlacesService(map);
    }
  }, [map]);

  const run = useCallback(async () => {
    const service = serviceRef.current;
    if (!service || !options.center || !options.enabled) return;

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const results = await searchNearby({
        service,
        center: options.center,
        radius: options.radius,
        keyword: options.keyword,
        type: options.type,
        openNow: options.openNow,
        minRating: options.minRating,
      });
      if (id === requestId.current) setPlaces(results);
    } catch (searchError) {
      if (id === requestId.current) {
        setError(searchError instanceof Error ? searchError.message : 'Search failed');
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [options.center, options.radius, options.keyword, options.type, options.openNow, options.minRating, options.enabled]);

  useEffect(() => {
    void run();
  }, [run]);

  return { places, loading, error, refresh: run, service: serviceRef };
}

export function usePlaceDetails(
  service: google.maps.places.PlacesService | null,
  placeId: string | null,
  origin?: { lat: number; lng: number } | null,
) {
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!service || !placeId) {
      setDetails(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    getPlaceDetails(service, placeId, origin ?? undefined)
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
  }, [service, placeId, origin?.lat, origin?.lng]);

  return { details, loading, error };
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
