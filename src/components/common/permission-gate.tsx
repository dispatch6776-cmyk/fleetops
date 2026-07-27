import type { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import type { Permission } from '@/lib/permissions';

interface PermissionGateProps {
  /** Required permission, or list of permissions. */
  permission: Permission | Permission[];
  /** When true, every permission in the list is required. Default: any. */
  requireAll?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children only when the signed-in role holds the permission.
 * This is a UX affordance — the authoritative check lives in RLS policies.
 */
export function PermissionGate({
  permission,
  requireAll = false,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { can, canAll, canAny } = usePermissions();
  const list = Array.isArray(permission) ? permission : [permission];
  const allowed = list.length === 1 ? can(list[0]) : requireAll ? canAll(list) : canAny(list);
  return <>{allowed ? children : fallback}</>;
}
