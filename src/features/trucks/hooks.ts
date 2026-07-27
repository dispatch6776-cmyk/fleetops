import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-client';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useUIStore } from '@/stores/ui.store';
import {
  getActiveRental,
  getCompliance,
  getLatestLocation,
  getTruck,
  listTrucks,
} from './api/trucks.api';

export function useTrucks() {
  return useQuery({
    queryKey: queryKeys.trucks(),
    queryFn: listTrucks,
    enabled: isSupabaseConfigured,
  });
}

/**
 * Resolves the truck the whole app is focused on: the one stored in UI state,
 * falling back to the first truck in the fleet.
 */
export function useActiveTruck() {
  const activeTruckId = useUIStore((state) => state.activeTruckId);
  const setActiveTruckId = useUIStore((state) => state.setActiveTruckId);
  const trucksQuery = useTrucks();

  const trucks = trucksQuery.data ?? [];
  const resolved = trucks.find((truck) => truck.id === activeTruckId) ?? trucks[0] ?? null;

  useEffect(() => {
    if (resolved && resolved.id !== activeTruckId) {
      setActiveTruckId(resolved.id);
    }
  }, [resolved, activeTruckId, setActiveTruckId]);

  return {
    truck: resolved,
    truckId: resolved?.id ?? null,
    trucks,
    isLoading: trucksQuery.isLoading,
    isError: trucksQuery.isError,
    error: trucksQuery.error,
    refetch: trucksQuery.refetch,
  };
}

export function useTruck(truckId: string | null) {
  return useQuery({
    queryKey: queryKeys.truck(truckId ?? 'none'),
    queryFn: () => getTruck(truckId as string),
    enabled: Boolean(truckId) && isSupabaseConfigured,
  });
}

export function useCompliance(truckId: string | null) {
  return useQuery({
    queryKey: queryKeys.compliance(truckId ?? 'none'),
    queryFn: () => getCompliance(truckId as string),
    enabled: Boolean(truckId) && isSupabaseConfigured,
  });
}

export function useActiveRental(truckId: string | null) {
  return useQuery({
    queryKey: ['rental', 'active', truckId] as const,
    queryFn: () => getActiveRental(truckId as string),
    enabled: Boolean(truckId) && isSupabaseConfigured,
  });
}

export function useLatestLocation(truckId: string | null) {
  return useQuery({
    queryKey: ['location', 'latest', truckId] as const,
    queryFn: () => getLatestLocation(truckId as string),
    enabled: Boolean(truckId) && isSupabaseConfigured,
    staleTime: 60_000,
  });
}
