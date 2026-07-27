import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { queryKeys } from '@/app/query-client';
import { isSupabaseConfigured } from '@/lib/supabase';
import { usePermissions } from '@/hooks/use-permissions';
import type { TablesInsert } from '@/types';
import {
  createFuelLog,
  createMileageLog,
  deleteFuelLog,
  deleteMileageLog,
  getFuelEconomy,
  getMonthlyMileage,
  importMileageLogs,
  listFuelLogs,
  listMileageLogs,
} from './api/mileage.api';

export function useMileageLogs(truckId: string | null) {
  return useQuery({
    queryKey: queryKeys.mileage(truckId ?? 'none'),
    queryFn: () => listMileageLogs(truckId as string),
    enabled: Boolean(truckId) && isSupabaseConfigured,
  });
}

export function useMonthlyMileage(truckId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.mileage(truckId ?? 'none'), 'monthly'],
    queryFn: () => getMonthlyMileage(truckId as string),
    enabled: Boolean(truckId) && isSupabaseConfigured,
  });
}

export function useFuelEconomy(truckId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.fuel(truckId ?? 'none'), 'economy'],
    queryFn: () => getFuelEconomy(truckId as string),
    enabled: Boolean(truckId) && isSupabaseConfigured,
  });
}

export function useFuelLogs(truckId: string | null) {
  const { canSeeMoney } = usePermissions();
  return useQuery({
    queryKey: queryKeys.fuel(truckId ?? 'none'),
    queryFn: () => listFuelLogs(truckId as string),
    enabled: Boolean(truckId) && canSeeMoney && isSupabaseConfigured,
  });
}

export function useMileageMutations(truckId: string | null) {
  const queryClient = useQueryClient();

  function invalidate() {
    if (!truckId) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.mileage(truckId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.fuel(truckId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.trucks() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(truckId) });
  }

  const create = useMutation({
    mutationFn: (payload: TablesInsert<'mileage_logs'>) => createMileageLog(payload),
    onSuccess: () => {
      toast.success('Odometer reading saved');
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMileageLog(id),
    onSuccess: () => {
      toast.success('Reading deleted');
      invalidate();
    },
  });

  const importCsv = useMutation({
    mutationFn: (rows: TablesInsert<'mileage_logs'>[]) => importMileageLogs(rows),
    onSuccess: (result) => {
      toast.success(`Imported ${result.inserted} readings`);
      invalidate();
    },
  });

  const addFuel = useMutation({
    mutationFn: (payload: TablesInsert<'fuel_logs'>) => createFuelLog(payload),
    onSuccess: () => {
      toast.success('Fuel purchase saved');
      invalidate();
      if (truckId) void queryClient.invalidateQueries({ queryKey: queryKeys.expenses(truckId) });
    },
  });

  const removeFuel = useMutation({
    mutationFn: (id: string) => deleteFuelLog(id),
    onSuccess: () => {
      toast.success('Fuel purchase deleted');
      invalidate();
    },
  });

  return { create, remove, importCsv, addFuel, removeFuel };
}
