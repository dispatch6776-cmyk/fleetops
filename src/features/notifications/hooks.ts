import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { queryKeys } from '@/app/query-client';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { AlertItem, NotificationPreferenceRow } from '@/types';
import {
  getPreferences,
  listNotifications,
  markAllRead,
  markRead,
  pushBrowserNotification,
  updatePreferences,
} from './api/notifications.api';

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => listNotifications(),
    enabled: isSupabaseConfigured,
    refetchInterval: 5 * 60_000,
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: [...queryKeys.notifications(), 'preferences'],
    queryFn: getPreferences,
    enabled: isSupabaseConfigured,
  });
}

export function useNotificationMutations() {
  const queryClient = useQueryClient();

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
  }

  const read = useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: invalidate,
  });

  const readAll = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      toast.success('All notifications marked as read');
      invalidate();
    },
  });

  const savePreferences = useMutation({
    mutationFn: (patch: Partial<NotificationPreferenceRow>) => updatePreferences(patch),
    onSuccess: () => {
      toast.success('Preferences saved');
      invalidate();
    },
  });

  return { read, readAll, savePreferences };
}

/**
 * Mirrors critical alerts into the browser's notification centre, once per
 * alert per session, so a closed tab still surfaces an expired policy.
 */
export function useCriticalAlertBridge(alerts: AlertItem[], enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const seenKey = 'fleetops.alertsSeen';
    let seen: string[] = [];
    try {
      seen = JSON.parse(sessionStorage.getItem(seenKey) ?? '[]') as string[];
    } catch {
      seen = [];
    }

    const fresh = alerts.filter((alert) => alert.severity === 'critical' && !seen.includes(alert.id));
    for (const alert of fresh.slice(0, 3)) {
      pushBrowserNotification(alert.title, alert.description, alert.href);
    }

    if (fresh.length) {
      try {
        sessionStorage.setItem(seenKey, JSON.stringify([...seen, ...fresh.map((a) => a.id)]));
      } catch {
        /* storage unavailable */
      }
    }
  }, [alerts, enabled]);
}
