import { Link } from 'react-router-dom';
import { Bell, Menu, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePermissions } from '@/hooks/use-permissions';
import { useUIStore } from '@/stores/ui.store';
import { Breadcrumbs } from './breadcrumbs';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

export function Topbar({ unreadCount = 0 }: { unreadCount?: number }) {
  const setMobileNavOpen = useUIStore((state) => state.setMobileNavOpen);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const { can } = usePermissions();

  return (
    <header className="glass sticky top-0 z-30 flex h-[var(--topbar-height)] items-center gap-2 border-b px-3 sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>

      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Button
          variant="outline"
          className="hidden h-9 w-56 justify-start gap-2 px-3 text-muted-foreground md:flex xl:w-72"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search className="size-4" aria-hidden />
          <span className="text-sm">Search…</span>
          <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label="Search"
        >
          <Search />
        </Button>

        {can('notifications.view') ? (
          <Button variant="ghost" size="icon" asChild aria-label="Notifications">
            <Link to="/notifications" className="relative">
              <Bell />
              {unreadCount > 0 ? (
                <Badge
                  variant="danger"
                  className="absolute -right-0.5 -top-0.5 min-w-4 justify-center px-1 py-0 text-[10px] leading-4"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              ) : null}
            </Link>
          </Button>
        ) : null}

        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
