import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FullPageSpinner } from '@/components/ui/spinner';
import { EmptyState } from '@/components/common/empty-state';
import { useAuthStore } from '@/features/auth/auth.store';
import { touchLastSeen } from '@/features/auth/api/auth.api';
import { usePermissions } from '@/hooks/use-permissions';
import { defaultRouteForRole, type Permission } from '@/lib/permissions';

/**
 * Blocks a route until a session exists. Unauthenticated visitors are sent to
 * /login with the attempted path so they land where they meant to go.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const profile = useAuthStore((state) => state.profile);
  const userId = useAuthStore((state) => state.user?.id);
  const signOut = useAuthStore((state) => state.signOut);
  const location = useLocation();

  useEffect(() => {
    if (userId) void touchLastSeen(userId);
  }, [userId]);

  if (status === 'idle' || status === 'loading') {
    return <FullPageSpinner />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  // Authenticated but the profile row has not loaded yet.
  if (!profile) {
    return <FullPageSpinner label="Loading your workspace" />;
  }

  // An administrator can deactivate an account without deleting it.
  if (!profile.is_active) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <EmptyState
          icon={ShieldAlert}
          title="Your access has been paused"
          description="An administrator deactivated this account. Contact the fleet owner if you believe this is a mistake."
          action={
            <Button variant="outline" onClick={() => void signOut()}>
              Sign out
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Route-level permission check. Renders a clear explanation rather than a 404
 * so a mechanic who bookmarks /financials understands what happened.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { can, role } = usePermissions();

  if (can(permission)) return <>{children}</>;

  return (
    <div className="py-10">
      <EmptyState
        icon={ShieldAlert}
        title="You do not have access to this section"
        description="Your role does not include this module. If you need it, ask the fleet owner to update your permissions."
        action={
          <Button asChild>
            <a href={defaultRouteForRole(role)}>Go to your home page</a>
          </Button>
        }
      />
    </div>
  );
}

/** Sends an already-signed-in user away from the auth pages. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.profile?.role ?? null);

  if (status === 'idle' || status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') return <Navigate to={defaultRouteForRole(role)} replace />;

  return <>{children}</>;
}
