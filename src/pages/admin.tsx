import { useState } from 'react';
import { Building2, History, LogIn, Mail, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DataTable, type Column } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { StatCard, StatCardGrid } from '@/components/common/stat-card';
import { useAdminMutations, useAuditLogs, useLoginHistory, useProfiles } from '@/features/admin/hooks';
import { useAppSettings } from '@/features/financials/hooks';
import { useAuthStore } from '@/features/auth/auth.store';
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES, type Role } from '@/lib/permissions';
import { formatDateTime, formatRelative } from '@/lib/format';
import { initials } from '@/lib/utils';
import type { AuditLogRow, LoginHistoryRow, Profile } from '@/types';

export default function AdminPage() {
  const profiles = useProfiles();
  const settings = useAppSettings();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { changeRole, toggleActive, invite, saveSettings } = useAdminMutations();

  const [auditEntity, setAuditEntity] = useState('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', fullName: '', role: 'viewer' as Role });
  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});

  const auditLogs = useAuditLogs({ entityType: auditEntity });
  const loginHistory = useLoginHistory();

  const users = profiles.data ?? [];
  const activeUsers = users.filter((user) => user.is_active).length;

  const userColumns: Column<Profile>[] = [
    {
      id: 'user',
      header: 'User',
      value: (row) => row.full_name ?? row.email,
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar>
            {row.avatar_url ? <AvatarImage src={row.avatar_url} alt="" /> : null}
            <AvatarFallback>{initials(row.full_name ?? row.email)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {row.full_name ?? '—'}
              {row.id === currentUserId ? (
                <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
              ) : null}
            </p>
            <p className="truncate text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      value: (row) => ROLE_LABELS[row.role],
      cell: (row) => (
        <NativeSelect
          className="w-40"
          aria-label={`Role for ${row.email}`}
          value={row.role}
          disabled={row.id === currentUserId}
          onChange={(event) => changeRole.mutate({ id: row.id, role: event.target.value as Role })}
          options={ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
        />
      ),
    },
    {
      id: 'status',
      header: 'Access',
      value: (row) => (row.is_active ? 'Active' : 'Paused'),
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={row.is_active}
            disabled={row.id === currentUserId}
            aria-label={`Toggle access for ${row.email}`}
            onCheckedChange={(checked: boolean) =>
              toggleActive.mutate({ id: row.id, isActive: checked })
            }
          />
          <Badge variant={row.is_active ? 'success' : 'neutral'}>
            {row.is_active ? 'Active' : 'Paused'}
          </Badge>
        </div>
      ),
    },
    {
      id: 'last_seen',
      header: 'Last active',
      value: (row) => row.last_seen_at,
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.last_seen_at ? formatRelative(row.last_seen_at) : 'Never'}
        </span>
      ),
    },
  ];

  const auditColumns: Column<AuditLogRow>[] = [
    {
      id: 'time',
      header: 'When',
      value: (row) => row.created_at,
      cell: (row) => <span className="whitespace-nowrap">{formatDateTime(row.created_at)}</span>,
    },
    {
      id: 'actor',
      header: 'Who',
      value: (row) => row.actor_email,
      cell: (row) => <span className="truncate">{row.actor_email ?? 'System'}</span>,
    },
    {
      id: 'action',
      header: 'Action',
      value: (row) => row.action,
      cell: (row) => (
        <Badge
          variant={
            row.action === 'delete' ? 'danger' : row.action === 'insert' ? 'success' : 'neutral'
          }
        >
          {row.action}
        </Badge>
      ),
    },
    {
      id: 'entity',
      header: 'Record',
      value: (row) => row.entity_type,
      cell: (row) => (
        <span className="font-mono text-xs">
          {row.entity_type}
          {row.entity_id ? `#${row.entity_id.slice(0, 8)}` : ''}
        </span>
      ),
    },
    {
      id: 'changes',
      header: 'Changed fields',
      sortable: false,
      cell: (row) => {
        const changes = row.changes as Record<string, unknown> | null;
        if (!changes) return <span className="text-muted-foreground">—</span>;
        const keys = Object.keys(changes).filter((key) => !['new', 'old'].includes(key));
        const label = keys.length > 0 ? keys.join(', ') : Object.keys(changes).join(', ');
        return <span className="truncate text-xs text-muted-foreground">{label}</span>;
      },
    },
  ];

  const loginColumns: Column<LoginHistoryRow>[] = [
    {
      id: 'time',
      header: 'When',
      value: (row) => row.created_at,
      cell: (row) => <span className="whitespace-nowrap">{formatDateTime(row.created_at)}</span>,
    },
    { id: 'email', header: 'Email', value: (row) => row.email, cell: (row) => row.email },
    {
      id: 'status',
      header: 'Result',
      value: (row) => (row.succeeded ? 'Success' : 'Failed'),
      cell: (row) => (
        <Badge variant={row.succeeded ? 'success' : 'danger'}>
          {row.succeeded ? 'Success' : 'Failed'}
        </Badge>
      ),
    },
    {
      id: 'agent',
      header: 'Device',
      value: (row) => row.user_agent,
      cell: (row) => (
        <span className="truncate text-xs text-muted-foreground">{row.user_agent ?? '—'}</span>
      ),
    },
  ];

  function settingValue(key: keyof typeof settings.data & string, fallback = '') {
    return settingsForm[key] ?? String(settings.data?.[key] ?? fallback);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description="Users, permissions, activity history and system settings."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus />
            Invite user
          </Button>
        }
      />

      <StatCardGrid className="xl:grid-cols-3">
        <StatCard label="Users" value={String(users.length)} icon={Users} tone="default" hint={`${activeUsers} active`} loading={profiles.isLoading} />
        <StatCard
          label="Audit entries"
          value={String(auditLogs.data?.length ?? 0)}
          icon={History}
          tone="info"
          hint="Most recent 200"
          loading={auditLogs.isLoading}
        />
        <StatCard
          label="Sign-ins recorded"
          value={String(loginHistory.data?.length ?? 0)}
          icon={LogIn}
          tone="default"
          hint="Most recent 100"
          loading={loginHistory.isLoading}
        />
      </StatCardGrid>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">
            <Users />
            Users
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History />
            Audit log
          </TabsTrigger>
          <TabsTrigger value="logins">
            <LogIn />
            Login history
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Building2 />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <DataTable
            data={users}
            columns={userColumns}
            getRowId={(row) => row.id}
            loading={profiles.isLoading}
            searchPlaceholder="Search users…"
            emptyTitle="No users yet"
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4" aria-hidden />
                What each role can do
              </CardTitle>
              <CardDescription>
                Enforced by PostgreSQL row-level security, not just the interface.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ROLES.map((role) => (
                  <div key={role} className="rounded-lg border border-border p-3">
                    <dt className="text-sm font-medium">{ROLE_LABELS[role]}</dt>
                    <dd className="mt-1 text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <DataTable
            data={auditLogs.data ?? []}
            columns={auditColumns}
            getRowId={(row) => String(row.id)}
            loading={auditLogs.isLoading}
            searchPlaceholder="Search the audit trail…"
            emptyTitle="No activity recorded yet"
            toolbar={
              <NativeSelect
                className="w-48"
                aria-label="Filter by record type"
                value={auditEntity}
                onChange={(event) => setAuditEntity(event.target.value)}
                options={[
                  { value: 'all', label: 'All record types' },
                  { value: 'trucks', label: 'Trucks' },
                  { value: 'maintenance_records', label: 'Maintenance' },
                  { value: 'invoices', label: 'Invoices' },
                  { value: 'payments', label: 'Payments' },
                  { value: 'expenses', label: 'Expenses' },
                  { value: 'documents', label: 'Documents' },
                  { value: 'profiles', label: 'Users' },
                ]}
              />
            }
          />
        </TabsContent>

        <TabsContent value="logins">
          <DataTable
            data={loginHistory.data ?? []}
            columns={loginColumns}
            getRowId={(row) => String(row.id)}
            loading={loginHistory.isLoading}
            searchPlaceholder="Search sign-ins…"
            emptyTitle="No sign-ins recorded yet"
          />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Company & invoicing</CardTitle>
              <CardDescription>
                These details appear on every invoice and exported report.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { key: 'company_name', label: 'Company name' },
                  { key: 'company_email', label: 'Billing email' },
                  { key: 'company_phone', label: 'Phone' },
                  { key: 'company_address', label: 'Address' },
                  { key: 'invoice_prefix', label: 'Invoice prefix' },
                  { key: 'timezone', label: 'Timezone' },
                ].map((field) => (
                  <FormField key={field.key} label={field.label} htmlFor={field.key}>
                    <Input
                      id={field.key}
                      value={settingValue(field.key as never)}
                      onChange={(event) =>
                        setSettingsForm({ ...settingsForm, [field.key]: event.target.value })
                      }
                    />
                  </FormField>
                ))}
                <FormField
                  label="Alert window (days)"
                  htmlFor="alert_days_before"
                  hint="How far ahead renewals are flagged."
                >
                  <Input
                    id="alert_days_before"
                    type="number"
                    value={settingValue('alert_days_before' as never, '30')}
                    onChange={(event) =>
                      setSettingsForm({ ...settingsForm, alert_days_before: event.target.value })
                    }
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setSettingsForm({})}>
                  Reset
                </Button>
                <Button
                  loading={saveSettings.isPending}
                  onClick={() =>
                    saveSettings.mutate({
                      ...Object.fromEntries(
                        Object.entries(settingsForm).filter(([key]) => key !== 'alert_days_before'),
                      ),
                      ...(settingsForm.alert_days_before
                        ? { alert_days_before: Number(settingsForm.alert_days_before) }
                        : {}),
                    })
                  }
                >
                  Save settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              They receive an email link, set their own password and land with the role you choose.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Full name" htmlFor="invite_name" required>
              <Input
                id="invite_name"
                value={inviteForm.fullName}
                onChange={(event) => setInviteForm({ ...inviteForm, fullName: event.target.value })}
              />
            </FormField>
            <FormField label="Email" htmlFor="invite_email" required>
              <Input
                id="invite_email"
                type="email"
                value={inviteForm.email}
                onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })}
              />
            </FormField>
            <FormField
              label="Role"
              htmlFor="invite_role"
              required
              hint={ROLE_DESCRIPTIONS[inviteForm.role]}
            >
              <NativeSelect
                id="invite_role"
                value={inviteForm.role}
                onChange={(event) => setInviteForm({ ...inviteForm, role: event.target.value as Role })}
                options={ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={invite.isPending}
              onClick={() =>
                invite.mutate(
                  { email: inviteForm.email, role: inviteForm.role, fullName: inviteForm.fullName },
                  {
                    onSuccess: () => {
                      setInviteOpen(false);
                      setInviteForm({ email: '', fullName: '', role: 'viewer' });
                    },
                  },
                )
              }
            >
              <Mail />
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
