import { NavLink, useLocation } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NAVIGATION, type NavItem } from '@/app/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { useUIStore } from '@/stores/ui.store';
import { cn } from '@/lib/utils';
import { Wordmark } from './logo';

function isActive(item: NavItem, pathname: string) {
  if (item.href === '/') return pathname === '/';
  return item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href;
}

interface SidebarProps {
  /** Rendered inside the mobile drawer — always expanded, no collapse control. */
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
}

export function Sidebar({ variant = 'desktop', onNavigate }: SidebarProps) {
  const { pathname } = useLocation();
  const { can } = usePermissions();
  const collapsed = useUIStore((state) => state.sidebarCollapsed) && variant === 'desktop';
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  const groups = NAVIGATION.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(item.permission)),
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-surface',
        variant === 'desktop' && 'transition-[width] duration-200 ease-smooth',
        collapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width)]',
      )}
      aria-label="Primary"
    >
      <div className="flex h-[var(--topbar-height)] items-center justify-between gap-2 border-b border-border px-3">
        <Wordmark collapsed={collapsed} />
        {variant === 'desktop' ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(collapsed && 'absolute left-1/2 top-3 hidden')}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed ? (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {group.label}
              </p>
            ) : (
              <div className="mx-3 mb-2 h-px bg-border" aria-hidden />
            )}
            {group.items.map((item) => {
              const active = isActive(item, pathname);
              const link = (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={onNavigate}
                  data-active={active}
                  className={cn('nav-link', collapsed && 'justify-center px-0')}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  {!collapsed && active ? (
                    <motion.span
                      layoutId="sidebar-active-dot"
                      className="ml-auto size-1.5 rounded-full bg-primary"
                    />
                  ) : null}
                </NavLink>
              );

              if (!collapsed) return link;

              return (
                <Tooltip key={item.href} delayDuration={80}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-2.5">
        {collapsed ? (
          <Tooltip delayDuration={80}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-full" onClick={toggleSidebar}>
                <PanelLeftOpen />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        ) : (
          <p className="px-2 text-[11px] leading-relaxed text-muted-foreground">
            FleetOps v1.0 ·{' '}
            <span className="font-mono">
              {new Date().getFullYear()}
            </span>
          </p>
        )}
      </div>
    </aside>
  );
}
