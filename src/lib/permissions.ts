/**
 * Role-Based Access Control.
 *
 * The matrix below is the single source of truth for what the UI renders.
 * It is mirrored by PostgreSQL Row-Level-Security policies (Phase 2) so a
 * hostile client cannot read data by bypassing the interface — the UI check
 * is for ergonomics, the database check is for security.
 */

export const ROLES = ['owner', 'admin', 'maintenance', 'mechanic', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  maintenance: 'Maintenance Team',
  mechanic: 'Mechanic',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: 'Full unrestricted access to every module, including financials and admin.',
  admin: 'Same unrestricted access as the Owner. Intended for a trusted co-owner.',
  maintenance:
    'Truck details, maintenance, repair history, mileage and documents. No financial data.',
  mechanic: 'Maintenance and repair work orders only.',
  viewer: 'Read-only access to non-financial modules.',
};

export const PERMISSIONS = [
  'dashboard.view',
  'truck.view',
  'truck.edit',
  'truck.delete',
  'financials.view',
  'financials.edit',
  'invoices.view',
  'invoices.edit',
  'maintenance.view',
  'maintenance.edit',
  'maintenance.delete',
  'maintenance.viewCost',
  'mileage.view',
  'mileage.edit',
  'documents.view',
  'documents.upload',
  'documents.delete',
  'documents.viewFinancial',
  'map.view',
  'calendar.view',
  'reports.view',
  'reports.financial',
  'notifications.view',
  'notes.private.view',
  'ai.view',
  'ai.financial',
  'admin.access',
  'admin.users',
  'admin.audit',
  'admin.settings',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

const MAINTENANCE_TEAM: Permission[] = [
  'dashboard.view',
  'truck.view',
  'maintenance.view',
  'maintenance.edit',
  'maintenance.viewCost',
  'mileage.view',
  'mileage.edit',
  'documents.view',
  'documents.upload',
  'map.view',
  'calendar.view',
  'notifications.view',
  'reports.view',
  'ai.view',
];

const MECHANIC: Permission[] = [
  'maintenance.view',
  'maintenance.edit',
  'maintenance.viewCost',
  'documents.view',
  'documents.upload',
  'map.view',
  'notifications.view',
];

const VIEWER: Permission[] = [
  'dashboard.view',
  'truck.view',
  'maintenance.view',
  'mileage.view',
  'documents.view',
  'map.view',
  'calendar.view',
  'notifications.view',
  'reports.view',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: ALL,
  admin: ALL,
  maintenance: MAINTENANCE_TEAM,
  mechanic: MECHANIC,
  viewer: VIEWER,
};

/** Does the given role hold the permission? */
export function roleHas(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Does the role hold every permission in the list? */
export function roleHasAll(role: Role | null | undefined, permissions: Permission[]): boolean {
  return permissions.every((permission) => roleHas(role, permission));
}

/** Does the role hold at least one of the permissions? */
export function roleHasAny(role: Role | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((permission) => roleHas(role, permission));
}

/** Roles allowed to see money. Used for defence-in-depth checks in queries. */
export const FINANCIAL_ROLES: Role[] = ['owner', 'admin'];

export const isFinancialRole = (role: Role | null | undefined) =>
  Boolean(role && FINANCIAL_ROLES.includes(role));

/** Landing route after login — mechanics have no dashboard. */
export function defaultRouteForRole(role: Role | null | undefined): string {
  if (role === 'mechanic') return '/maintenance';
  return '/';
}
