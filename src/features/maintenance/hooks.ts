import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { queryKeys } from '@/app/query-client';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/types';
import {
  createMaintenance,
  createSchedule,
  deleteMaintenance,
  deleteSchedule,
  getMaintenanceCostByCategory,
  getMaintenanceRecord,
  listMaintenance,
  listSchedules,
  updateMaintenance,
  updateSchedule,
  type MaintenanceDraft,
  type MaintenanceFilters,
} from './api/maintenance.api';

export function useMaintenanceRecords(truckId: string | null, filters: MaintenanceFilters = {}) {
  return useQuery({
    queryKey: queryKeys.maintenance(truckId ?? 'none', filters),
    queryFn: () => listMaintenance(truckId as string, filters),
    enabled: Boolean(truckId) && isSupabaseConfigured,
  });
}

export function useMaintenanceRecord(id: string | null) {
  return useQuery({
    queryKey: queryKeys.maintenanceRecord(id ?? 'none'),
    queryFn: () => getMaintenanceRecord(id as string),
    enabled: Boolean(id) && isSupabaseConfigured,
  });
}

export function useSchedules(truckId: string | null) {
  return useQuery({
    queryKey: queryKeys.schedules(truckId ?? 'none'),
    queryFn: () => listSchedules(truckId as string),
    enabled: Boolean(truckId) && isSupabaseConfigured,
  });
}

export function useMaintenanceCosts(truckId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.maintenance(truckId ?? 'none'), 'costs'],
    queryFn: () => getMaintenanceCostByCategory(truckId as string),
    enabled: Boolean(truckId) && isSupabaseConfigured,
  });
}

export function useMaintenanceMutations(truckId: string | null) {
  const queryClient = useQueryClient();

  function invalidate() {
    if (!truckId) return;
    void queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.schedules(truckId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(truckId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.expenses(truckId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.trucks() });
  }

  const create = useMutation({
    mutationFn: (draft: MaintenanceDraft) => createMaintenance(draft),
    onSuccess: () => {
      toast.success('Work order saved');
      invalidate();
    },
  });

  const update = useMutation({
    mutationFn: ({
      id,
      patch,
      parts,
    }: {
      id: string;
      patch: TablesUpdate<'maintenance_records'>;
      parts?: Omit<TablesInsert<'maintenance_parts'>, 'maintenance_id'>[];
    }) => updateMaintenance(id, patch, parts),
    onSuccess: (record) => {
      toast.success('Work order updated');
      void queryClient.invalidateQueries({ queryKey: queryKeys.maintenanceRecord(record.id) });
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMaintenance(id),
    onSuccess: () => {
      toast.success('Work order deleted');
      invalidate();
    },
  });

  return { create, update, remove };
}

export function useScheduleMutations(truckId: string | null) {
  const queryClient = useQueryClient();

  function invalidate() {
    if (!truckId) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.schedules(truckId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(truckId) });
  }

  const create = useMutation({
    mutationFn: (payload: TablesInsert<'maintenance_schedules'>) => createSchedule(payload),
    onSuccess: () => {
      toast.success('Schedule created');
      invalidate();
    },
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'maintenance_schedules'> }) =>
      updateSchedule(id, patch),
    onSuccess: () => {
      toast.success('Schedule updated');
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => {
      toast.success('Schedule deleted');
      invalidate();
    },
  });

  return { create, update, remove };
}
