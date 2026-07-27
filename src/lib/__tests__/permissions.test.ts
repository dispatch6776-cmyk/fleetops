import { describe, expect, it } from 'vitest';
import {
  FINANCIAL_ROLES,
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
  defaultRouteForRole,
  isFinancialRole,
  roleHas,
  roleHasAll,
  roleHasAny,
  type Permission,
} from '../permissions';

// This matrix is the client-side mirror of the RLS policies in
// supabase/migrations/20260101000800_rls_policies.sql. If a test here goes
// red, the UI and the database have drifted — treat that as a security bug,
// not a test to loosen.

// Deliberately excludes `maintenance.viewCost`: the Maintenance Team and
// Mechanic roles are allowed to see what a repair cost (per spec) even
// though they can never see rent, invoices, profit or financial reports.
// That distinction gets its own test below.
const FINANCIAL_PERMISSIONS: Permission[] = [
  'financials.view',
  'financials.edit',
  'invoices.view',
  'invoices.edit',
  'reports.financial',
  'ai.financial',
  'documents.viewFinancial',
];

describe('roleHas / roleHasAll / roleHasAny', () => {
  it('returns false for a null or undefined role', () => {
    expect(roleHas(null, 'dashboard.view')).toBe(false);
    expect(roleHas(undefined, 'dashboard.view')).toBe(false);
  });

  it('checks a single permission against the matrix', () => {
    expect(roleHas('owner', 'admin.access')).toBe(true);
    expect(roleHas('viewer', 'admin.access')).toBe(false);
  });

  it('roleHasAll requires every permission', () => {
    expect(roleHasAll('owner', ['truck.view', 'admin.access'])).toBe(true);
    expect(roleHasAll('maintenance', ['truck.view', 'admin.access'])).toBe(false);
  });

  it('roleHasAny requires at least one permission', () => {
    expect(roleHasAny('mechanic', ['admin.access', 'maintenance.view'])).toBe(true);
    expect(roleHasAny('mechanic', ['admin.access', 'financials.view'])).toBe(false);
  });
});

describe('owner and admin', () => {
  it('hold identical, unrestricted permission sets', () => {
    expect(ROLE_PERMISSIONS.owner).toEqual(ROLE_PERMISSIONS.admin);
    expect(ROLE_PERMISSIONS.owner).toEqual([...PERMISSIONS]);
  });
});

describe('financial data never reaches non-financial roles', () => {
  const NON_FINANCIAL_ROLES = ROLES.filter((role) => !FINANCIAL_ROLES.includes(role));

  it.each(NON_FINANCIAL_ROLES)('%s holds none of the financial permissions', (role) => {
    for (const permission of FINANCIAL_PERMISSIONS) {
      expect(roleHas(role, permission)).toBe(false);
    }
  });

  it.each(FINANCIAL_ROLES)('%s holds every financial permission', (role) => {
    for (const permission of FINANCIAL_PERMISSIONS) {
      expect(roleHas(role, permission)).toBe(true);
    }
  });

  it('isFinancialRole agrees with FINANCIAL_ROLES', () => {
    for (const role of ROLES) {
      expect(isFinancialRole(role)).toBe(FINANCIAL_ROLES.includes(role));
    }
  });

  it('maintenance.viewCost is the one line-item exception — hands-on roles keep it, Viewer does not', () => {
    expect(roleHas('owner', 'maintenance.viewCost')).toBe(true);
    expect(roleHas('admin', 'maintenance.viewCost')).toBe(true);
    expect(roleHas('maintenance', 'maintenance.viewCost')).toBe(true);
    expect(roleHas('mechanic', 'maintenance.viewCost')).toBe(true);
    expect(roleHas('viewer', 'maintenance.viewCost')).toBe(false);
  });
});

describe('mechanic — the narrowest role', () => {
  it('can only reach the maintenance module and its immediate neighbours', () => {
    expect(roleHas('mechanic', 'maintenance.view')).toBe(true);
    expect(roleHas('mechanic', 'maintenance.edit')).toBe(true);
    expect(roleHas('mechanic', 'documents.view')).toBe(true);
    expect(roleHas('mechanic', 'map.view')).toBe(true);
  });

  it('has no dashboard, mileage, or admin access', () => {
    expect(roleHas('mechanic', 'dashboard.view')).toBe(false);
    expect(roleHas('mechanic', 'mileage.view')).toBe(false);
    expect(roleHas('mechanic', 'admin.access')).toBe(false);
    expect(roleHas('mechanic', 'truck.view')).toBe(false);
  });

  it('lands on /maintenance instead of the dashboard after login', () => {
    expect(defaultRouteForRole('mechanic')).toBe('/maintenance');
  });
});

describe('viewer — read-only, non-financial', () => {
  it('can view but never edit or delete', () => {
    expect(roleHas('viewer', 'truck.view')).toBe(true);
    expect(roleHas('viewer', 'truck.edit')).toBe(false);
    expect(roleHas('viewer', 'truck.delete')).toBe(false);
    expect(roleHas('viewer', 'maintenance.edit')).toBe(false);
    expect(roleHas('viewer', 'documents.upload')).toBe(false);
  });
});

describe('maintenance team', () => {
  it('sees maintenance cost but never rent, invoices or financial reports', () => {
    expect(roleHas('maintenance', 'maintenance.viewCost')).toBe(true);
    expect(roleHas('maintenance', 'financials.view')).toBe(false);
    expect(roleHas('maintenance', 'invoices.view')).toBe(false);
    expect(roleHas('maintenance', 'reports.financial')).toBe(false);
    expect(roleHas('maintenance', 'notes.private.view')).toBe(false);
  });
});

describe('every role', () => {
  it('lands on the dashboard by default, except the mechanic', () => {
    for (const role of ROLES) {
      expect(defaultRouteForRole(role)).toBe(role === 'mechanic' ? '/maintenance' : '/');
    }
  });

  it('only holds permissions declared in PERMISSIONS', () => {
    const known = new Set<string>(PERMISSIONS);
    for (const role of ROLES) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        expect(known.has(permission)).toBe(true);
      }
    }
  });
});
