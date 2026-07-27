import { useMemo } from 'react';
import { useAuthStore } from '@/features/auth/auth.store';
import {
  isFinancialRole,
  roleHas,
  roleHasAll,
  roleHasAny,
  type Permission,
  type Role,
} from '@/lib/permissions';

export interface PermissionsApi {
  role: Role | null;
  can: (permission: Permission) => boolean;
  canAll: (permissions: Permission[]) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  /** Owner / Administrator — the only roles allowed to see money. */
  canSeeMoney: boolean;
  isAdmin: boolean;
}

export function usePermissions(): PermissionsApi {
  const role = useAuthStore((state) => state.profile?.role ?? null);

  return useMemo(
    () => ({
      role,
      can: (permission: Permission) => roleHas(role, permission),
      canAll: (permissions: Permission[]) => roleHasAll(role, permissions),
      canAny: (permissions: Permission[]) => roleHasAny(role, permissions),
      canSeeMoney: isFinancialRole(role),
      isAdmin: role === 'owner' || role === 'admin',
    }),
    [role],
  );
}

/** Convenience hook for a single permission check. */
export function useCan(permission: Permission): boolean {
  const { can } = usePermissions();
  return can(permission);
}
