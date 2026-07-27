import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-client';
import { isSupabaseConfigured } from '@/lib/supabase';
import { usePermissions } from '@/hooks/use-permissions';
import {
  buildAlerts,
  getComplianceStatus,
  getExpenseBreakdown,
  getMonthlyFinancials,
  getRecentActivity,
  getTruckKpis,
  getUpcomingServices,
} from './api/dashboard.api';

export function useTruckKpis(truckId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.dashboard(truckId ?? 'none'), 'kpis'],
    queryFn: () => getTruckKpis(truckId as string),
    enabled: Boolean(truckId) && isSupabaseConfigured,
  });
}

export function useMonthlyFinancials(truckId: string | null, months = 12) {
  const { canSeeMoney } = usePermissions();
  return useQuery({
    queryKey: [...queryKeys.dashboard(truckId ?? 'none'), 'financials', months],
    queryFn: () => getMonthlyFinancials(truckId as string, months),
    enabled: Boolean(truckId) && canSeeMoney && isSupabaseConfigured,
  });
}

export function useExpenseBreakdown(truckId: string | null) {
  const { canSeeMoney } = usePermissions();
  return useQuery({
    queryKey: [...queryKeys.expenses(truckId ?? 'none'), 'by-category'],
    queryFn: () => getExpenseBreakdown(truckId as string),
    enabled: Boolean(truckId) && canSeeMoney && isSupabaseConfigured,
  });
}

export function useUpcomingServices(truckId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.schedules(truckId ?? 'none'), 'upcoming'],
    queryFn: () => getUpcomingServices(truckId as string),
    enabled: Boolean(truckId) && isSupabaseConfigured,
  });
}

export function useComplianceStatus(truckId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.compliance(truckId ?? 'none'), 'status'],
    queryFn: () => getComplianceStatus(truckId as string),
    enabled: Boolean(truckId) && isSupabaseConfigured,
  });
}

export function useRecentActivity(truckId: string | null, limit = 8) {
  const { canSeeMoney } = usePermissions();
  return useQuery({
    queryKey: [...queryKeys.dashboard(truckId ?? 'none'), 'activity', limit, canSeeMoney],
    queryFn: () => getRecentActivity(truckId as string, { includeFinancial: canSeeMoney, limit }),
    enabled: Boolean(truckId) && isSupabaseConfigured,
  });
}

/** Combined alert feed used by the dashboard and the notifications page. */
export function useAlerts(truckId: string | null, outstandingBalance?: number | null) {
  const compliance = useComplianceStatus(truckId);
  const services = useUpcomingServices(truckId);

  const alerts = useMemo(
    () =>
      buildAlerts({
        compliance: compliance.data ?? [],
        services: services.data ?? [],
        outstandingBalance,
      }),
    [compliance.data, services.data, outstandingBalance],
  );

  return {
    alerts,
    isLoading: compliance.isLoading || services.isLoading,
    isError: compliance.isError || services.isError,
  };
}
