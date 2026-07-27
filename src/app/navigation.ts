import {
  Banknote,
  Bell,
  BrainCircuit,
  CalendarDays,
  FileText,
  Gauge,
  LayoutDashboard,
  Map,
  Receipt,
  Settings,
  ShieldCheck,
  Truck,
  Wrench,
  History,
  BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Permission } from '@/lib/permissions';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Permission required to see the item. */
  permission: Permission;
  /** Optional keyboard shortcut suffix used with `g` prefix (e.g. `g d`). */
  shortcut?: string;
  description?: string;
  /** Matches nested routes such as /maintenance/:id */
  matchPrefix?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAVIGATION: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/',
        icon: LayoutDashboard,
        permission: 'dashboard.view',
        shortcut: 'd',
        description: 'Fleet health, income and alerts at a glance',
      },
      {
        label: 'Truck Profile',
        href: '/truck',
        icon: Truck,
        permission: 'truck.view',
        shortcut: 't',
        matchPrefix: true,
        description: 'Specs, compliance, driver and rental company',
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        label: 'Maintenance',
        href: '/maintenance',
        icon: Wrench,
        permission: 'maintenance.view',
        shortcut: 'm',
        matchPrefix: true,
        description: 'Work orders, services and upcoming schedules',
      },
      {
        label: 'Repair History',
        href: '/repairs',
        icon: History,
        permission: 'maintenance.view',
        shortcut: 'r',
        matchPrefix: true,
        description: 'Timeline, calendar and list of every repair',
      },
      {
        label: 'Mileage',
        href: '/mileage',
        icon: Gauge,
        permission: 'mileage.view',
        shortcut: 'g',
        description: 'Odometer, trips and fuel economy',
      },
      {
        label: 'Documents',
        href: '/documents',
        icon: FileText,
        permission: 'documents.view',
        shortcut: 'o',
        matchPrefix: true,
        description: 'Insurance, registration, leases and receipts',
      },
      {
        label: 'Calendar',
        href: '/calendar',
        icon: CalendarDays,
        permission: 'calendar.view',
        shortcut: 'c',
        description: 'Services, renewals and payment due dates',
      },
      {
        label: 'Map & Shops',
        href: '/map',
        icon: Map,
        permission: 'map.view',
        shortcut: 'p',
        matchPrefix: true,
        description: 'Truck location, repair shops and truck stops',
      },
    ],
  },
  {
    label: 'Business',
    items: [
      {
        label: 'Financials',
        href: '/financials',
        icon: Banknote,
        permission: 'financials.view',
        shortcut: 'f',
        matchPrefix: true,
        description: 'Rent, expenses, profit and cash flow',
      },
      {
        label: 'Invoices',
        href: '/invoices',
        icon: Receipt,
        permission: 'invoices.view',
        shortcut: 'i',
        matchPrefix: true,
        description: 'Billing, payments and outstanding balance',
      },
      {
        label: 'Reports',
        href: '/reports',
        icon: BarChart3,
        permission: 'reports.view',
        shortcut: 'e',
        description: 'Income, expense, maintenance and mileage reports',
      },
      {
        label: 'AI Assistant',
        href: '/assistant',
        icon: BrainCircuit,
        permission: 'ai.view',
        shortcut: 'a',
        description: 'Summaries, predictions and recommendations',
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        label: 'Notifications',
        href: '/notifications',
        icon: Bell,
        permission: 'notifications.view',
        shortcut: 'n',
        description: 'Alerts for renewals, services and payments',
      },
      {
        label: 'Admin',
        href: '/admin',
        icon: ShieldCheck,
        permission: 'admin.access',
        matchPrefix: true,
        description: 'Users, permissions, audit and login history',
      },
      {
        label: 'Settings',
        href: '/settings',
        icon: Settings,
        permission: 'dashboard.view',
        matchPrefix: true,
        description: 'Profile, appearance and notification preferences',
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAVIGATION.flatMap((group) => group.items);

/** Human-readable title for a pathname — used by breadcrumbs and <title>. */
export function titleForPath(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  const match = ALL_NAV_ITEMS.filter((item) => item.href !== '/').find((item) =>
    pathname.startsWith(item.href),
  );
  return match?.label ?? 'FleetOps';
}
