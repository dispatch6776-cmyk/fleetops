import { QueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

/** Errors that should never be retried. */
function isFatal(error: unknown): boolean {
  const status = (error as { status?: number; code?: string } | null)?.status;
  return status === 401 || status === 403 || status === 404;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 15 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => (isFatal(error) ? false : failureCount < 2),
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
        networkMode: 'offlineFirst',
      },
      mutations: {
        retry: 0,
        networkMode: 'online',
        onError: (error: unknown) => {
          const message =
            error instanceof Error ? error.message : 'Request failed. Please try again.';
          toast.error(message);
        },
      },
    },
  });
}

/** Centralised query keys — prevents typos and makes invalidation predictable. */
export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  profiles: () => ['profiles'] as const,
  trucks: () => ['trucks'] as const,
  truck: (id: string) => ['trucks', id] as const,
  compliance: (truckId: string) => ['compliance', truckId] as const,
  dashboard: (truckId: string) => ['dashboard', truckId] as const,
  maintenance: (truckId: string, filters?: unknown) =>
    ['maintenance', truckId, filters ?? null] as const,
  maintenanceRecord: (id: string) => ['maintenance', 'record', id] as const,
  schedules: (truckId: string) => ['schedules', truckId] as const,
  mileage: (truckId: string, range?: unknown) => ['mileage', truckId, range ?? null] as const,
  fuel: (truckId: string, range?: unknown) => ['fuel', truckId, range ?? null] as const,
  expenses: (truckId: string, range?: unknown) => ['expenses', truckId, range ?? null] as const,
  payments: (truckId: string, range?: unknown) => ['payments', truckId, range ?? null] as const,
  invoices: (truckId: string) => ['invoices', truckId] as const,
  invoice: (id: string) => ['invoices', 'record', id] as const,
  rentals: (truckId: string) => ['rentals', truckId] as const,
  documents: (truckId: string, folder?: string) => ['documents', truckId, folder ?? null] as const,
  notifications: () => ['notifications'] as const,
  auditLogs: (filters?: unknown) => ['audit-logs', filters ?? null] as const,
  loginHistory: () => ['login-history'] as const,
  settings: () => ['settings'] as const,
  shops: (params?: unknown) => ['shops', params ?? null] as const,
  search: (term: string) => ['search', term] as const,
} as const;
