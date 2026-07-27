import { requireSupabase } from '@/lib/supabase';
import type { NotificationPreferenceRow, NotificationRecord } from '@/types';

export async function listNotifications(limit = 50): Promise<NotificationRecord[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function markRead(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function markAllRead(): Promise<void> {
  const supabase = requireSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) throw new Error(error.message);
}

export async function getPreferences(): Promise<NotificationPreferenceRow | null> {
  const supabase = requireSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePreferences(
  patch: Partial<NotificationPreferenceRow>,
): Promise<NotificationPreferenceRow> {
  const supabase = requireSupabase();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('You are not signed in.');

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({ ...patch, user_id: userId }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Requests browser notification permission and shows a confirmation toastless ping. */
export async function enableBrowserNotifications(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    new Notification('FleetOps alerts enabled', {
      body: 'You will be notified about renewals, services and payments.',
      icon: '/icons/icon-192.png',
    });
  }
  return permission;
}

/** Fires a browser notification if the user has granted permission. */
export function pushBrowserNotification(title: string, body: string, href?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const notification = new Notification(title, { body, icon: '/icons/icon-192.png', tag: title });
  if (href) {
    notification.onclick = () => {
      window.focus();
      window.location.assign(href);
    };
  }
}
