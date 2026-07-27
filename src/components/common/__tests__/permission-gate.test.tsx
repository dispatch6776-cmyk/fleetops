import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/auth.store';
import type { Profile } from '@/types';
import { PermissionGate } from '../permission-gate';

function setRole(role: Profile['role'] | null) {
  act(() => {
    useAuthStore.setState({
      profile: role ? ({ role } as Profile) : null,
    });
  });
}

afterEach(() => {
  setRole(null);
});

describe('PermissionGate', () => {
  it('renders children when the signed-in role holds the permission', () => {
    setRole('owner');
    render(
      <PermissionGate permission="financials.view">
        <p>Financial dashboard</p>
      </PermissionGate>,
    );
    expect(screen.getByText('Financial dashboard')).toBeInTheDocument();
  });

  it('hides children — and the DOM node — when the role lacks the permission', () => {
    setRole('viewer');
    render(
      <PermissionGate permission="financials.view">
        <p>Financial dashboard</p>
      </PermissionGate>,
    );
    // Not just visually hidden: this must not render at all, because it sits
    // alongside RLS as the second layer keeping money away from the wrong
    // roles — a `display: none` leak would still be readable in devtools.
    expect(screen.queryByText('Financial dashboard')).not.toBeInTheDocument();
  });

  it('falls back to the provided fallback element', () => {
    setRole('mechanic');
    render(
      <PermissionGate permission="financials.view" fallback={<p>Restricted</p>}>
        <p>Financial dashboard</p>
      </PermissionGate>,
    );
    expect(screen.getByText('Restricted')).toBeInTheDocument();
    expect(screen.queryByText('Financial dashboard')).not.toBeInTheDocument();
  });

  it('requireAll=true demands every listed permission, not just one', () => {
    setRole('maintenance');
    render(
      <PermissionGate permission={['maintenance.view', 'financials.view']} requireAll>
        <p>Both required</p>
      </PermissionGate>,
    );
    expect(screen.queryByText('Both required')).not.toBeInTheDocument();
  });

  it('without requireAll, any one matching permission is enough', () => {
    setRole('maintenance');
    render(
      <PermissionGate permission={['maintenance.view', 'financials.view']}>
        <p>Any is enough</p>
      </PermissionGate>,
    );
    expect(screen.getByText('Any is enough')).toBeInTheDocument();
  });
});
