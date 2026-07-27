import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, ShieldCheck, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/features/auth/auth.store';
import { usePermissions } from '@/hooks/use-permissions';
import { ROLE_LABELS } from '@/lib/permissions';
import { initials } from '@/lib/utils';

export function UserMenu() {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const { isAdmin, role } = usePermissions();

  const displayName = profile?.full_name ?? user?.email ?? 'Signed out';
  const email = profile?.email ?? user?.email ?? '';

  async function handleSignOut() {
    await signOut();
    toast.success('Signed out');
    navigate('/login', { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5 sm:px-2" aria-label="Account menu">
          <Avatar className="size-7">
            {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
            <AvatarFallback>{initials(displayName)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-28 truncate text-sm font-medium lg:inline">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="normal-case">
          <div className="space-y-1">
            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">{email}</p>
            {role ? (
              <Badge variant="neutral" className="mt-1">
                <ShieldCheck aria-hidden />
                {ROLE_LABELS[role]}
              </Badge>
            ) : null}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/settings')}>
          <UserRound />
          Profile & preferences
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem onSelect={() => navigate('/admin')}>
            <Settings />
            Admin panel
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={handleSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
