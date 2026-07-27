import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { queryKeys } from '@/app/query-client';
import { isSupabaseConfigured } from '@/lib/supabase';
import { usePermissions } from '@/hooks/use-permissions';
import type { AppSettingsRow, Role } from '@/types';
import {
  inviteUser,
  listAuditLogs,
  listLoginHistory,
  listProfiles,
  setProfileActive,
  updateAppSettings,
  updateProfileRole,
  type AuditFilters,
} from './api/admin.api';

export function useProfiles() {
  const { isAdmin } = usePermissions();
  return useQuery({
    queryKey: queryKeys.profiles(),
    queryFn: listProfiles,
    enabled: isAdmin && isSupabaseConfigured,
  });
}

export function useAuditLogs(filters: AuditFilters = {}) {
  const { isAdmin } = usePermissions();
  return useQuery({
    queryKey: queryKeys.auditLogs(filters),
    queryFn: () => listAuditLogs(filters),
    enabled: isAdmin && isSupabaseConfigured,
  });
}

export function useLoginHistory() {
  const { isAdmin } = usePermissions();
  return useQuery({
    queryKey: queryKeys.loginHistory(),
    queryFn: () => listLoginHistory(),
    enabled: isAdmin && isSupabaseConfigured,
  });
}

export function useAdminMutations() {
  const queryClient = useQueryClient();

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => updateProfileRole(id, role),
    onSuccess: () => {
      toast.success('Role updated');
      void queryClient.invalidateQueries({ queryKey: queryKeys.profiles() });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setProfileActive(id, isActive),
    onSuccess: (profile) => {
      toast.success(profile.is_active ? 'Account reactivated' : 'Account paused');
      void queryClient.invalidateQueries({ queryKey: queryKeys.profiles() });
    },
  });

  const invite = useMutation({
    mutationFn: ({ email, role, fullName }: { email: string; role: Role; fullName: string }) =>
      inviteUser(email, role, fullName),
    onSuccess: () => {
      toast.success('Invitation email sent');
      void queryClient.invalidateQueries({ queryKey: queryKeys.profiles() });
    },
  });

  const saveSettings = useMutation({
    mutationFn: (patch: Partial<AppSettingsRow>) => updateAppSettings(patch),
    onSuccess: () => {
      toast.success('Settings saved');
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings() });
    },
  });

  return { changeRole, toggleActive, invite, saveSettings };
}
