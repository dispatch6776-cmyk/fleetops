import { requireSupabase } from '@/lib/supabase';
import type { AppSettingsRow, AuditLogRow, LoginHistoryRow, Profile, Role } from '@/types';

export async function listProfiles(): Promise<Profile[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateProfileRole(id: string, role: Role): Promise<Profile> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function setProfileActive(id: string, isActive: boolean): Promise<Profile> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export interface AuditFilters {
  entityType?: string | 'all';
  action?: string | 'all';
  limit?: number;
}

export async function listAuditLogs(filters: AuditFilters = {}): Promise<AuditLogRow[]> {
  const supabase = requireSupabase();
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.entityType && filters.entityType !== 'all') {
    query = query.eq('entity_type', filters.entityType);
  }
  if (filters.action && filters.action !== 'all') {
    query = query.eq('action', filters.action as AuditLogRow['action']);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listLoginHistory(limit = 100): Promise<LoginHistoryRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('login_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateAppSettings(patch: Partial<AppSettingsRow>): Promise<AppSettingsRow> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('app_settings')
    .update(patch)
    .eq('id', true)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Invites a teammate. Supabase's admin invite endpoint requires the service-role
 * key, so the supported path from the browser is a password-reset style signup
 * link the owner forwards. We create the invitation by sending a magic link.
 */
export async function inviteUser(email: string, role: Role, fullName: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: { role, full_name: fullName },
      emailRedirectTo: `${window.location.origin}/reset-password`,
    },
  });
  if (error) throw new Error(error.message);
}
