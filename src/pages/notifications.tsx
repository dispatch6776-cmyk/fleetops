import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BellRing,
  CheckCheck,
  Info,
  Mail,
  MonitorSmartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { useAlerts, useTruckKpis } from '@/features/dashboard/hooks';
import {
  useCriticalAlertBridge,
  useNotificationMutations,
  useNotificationPreferences,
  useNotifications,
} from '@/features/notifications/hooks';
import { enableBrowserNotifications } from '@/features/notifications/api/notifications.api';
import { useActiveTruck } from '@/features/trucks/hooks';
import { formatCountdown, formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AlertSeverity } from '@/types';

const SEVERITY_ICON = { critical: AlertTriangle, warning: BellRing, info: Info } as const;
const SEVERITY_CLASS: Record<AlertSeverity, string> = {
  critical: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
};

const PREFERENCE_FIELDS = [
  { key: 'maintenance_alerts', label: 'Maintenance due & overdue', description: 'Preventive schedules and open work orders.' },
  { key: 'compliance_alerts', label: 'Insurance, registration & DOT', description: 'Renewal countdowns starting 30 days out.' },
  { key: 'payment_alerts', label: 'Payments & invoices', description: 'Due dates, late rent and outstanding balances.' },
  { key: 'document_alerts', label: 'Documents', description: 'Expiring or missing paperwork.' },
  { key: 'weekly_digest', label: 'Weekly digest', description: 'A Monday summary of the week ahead.' },
] as const;

export default function NotificationsPage() {
  const { truckId } = useActiveTruck();
  const kpis = useTruckKpis(truckId);
  const { alerts, isLoading } = useAlerts(truckId, kpis.data?.outstanding_balance);
  const stored = useNotifications();
  const preferences = useNotificationPreferences();
  const { read, readAll, savePreferences } = useNotificationMutations();
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );

  useCriticalAlertBridge(alerts, preferences.data?.browser_enabled ?? false);

  const unread = (stored.data ?? []).filter((item) => !item.read_at);

  async function requestBrowser() {
    const permission = await enableBrowserNotifications();
    setBrowserPermission(permission);
    if (permission === 'granted') {
      savePreferences.mutate({ browser_enabled: true });
    } else {
      toast.error('Browser notifications were blocked. Enable them in your browser settings.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Live alerts from your truck plus anything the system has sent you."
        actions={
          unread.length > 0 ? (
            <Button variant="outline" onClick={() => readAll.mutate()} loading={readAll.isPending}>
              <CheckCheck />
              Mark all read
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Active alerts</CardTitle>
                <CardDescription>Derived live from compliance dates and schedules.</CardDescription>
              </div>
              {alerts.length > 0 ? <Badge variant="warning">{alerts.length}</Badge> : null}
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))
              ) : alerts.length === 0 ? (
                <EmptyState
                  compact
                  title="Nothing needs your attention"
                  description="No expiring documents, overdue services or unpaid invoices."
                />
              ) : (
                alerts.map((alert) => {
                  const Icon = SEVERITY_ICON[alert.severity];
                  return (
                    <Link
                      key={alert.id}
                      to={alert.href}
                      className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/60"
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg',
                          SEVERITY_CLASS[alert.severity],
                        )}
                      >
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{alert.title}</span>
                        <span className="block text-xs text-muted-foreground">{alert.description}</span>
                      </span>
                      {alert.dueDate ? (
                        <Badge variant={alert.severity === 'critical' ? 'danger' : 'neutral'}>
                          {formatCountdown(alert.dueDate)}
                        </Badge>
                      ) : null}
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification history</CardTitle>
              <CardDescription>Messages generated by scheduled checks and the system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {stored.isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))
              ) : (stored.data ?? []).length === 0 ? (
                <EmptyState
                  compact
                  title="No messages yet"
                  description="Scheduled alerts will appear here once the daily check runs."
                />
              ) : (
                (stored.data ?? []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => !item.read_at && read.mutate(item.id)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                      item.read_at ? 'border-border' : 'border-primary/40 bg-primary/5',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{item.title}</span>
                        {!item.read_at ? <span className="size-1.5 rounded-full bg-primary" aria-label="Unread" /> : null}
                      </span>
                      {item.body ? (
                        <span className="block truncate text-xs text-muted-foreground">{item.body}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelative(item.created_at)}
                    </span>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Delivery preferences</CardTitle>
            <CardDescription>Choose how and what you are told about.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <Label htmlFor="email_enabled" className="flex items-center gap-1.5">
                    <Mail className="size-3.5" aria-hidden />
                    Email
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Daily digest of anything due in the next 30 days.
                  </p>
                </div>
                <Switch
                  id="email_enabled"
                  checked={preferences.data?.email_enabled ?? true}
                  onCheckedChange={(checked: boolean) =>
                    savePreferences.mutate({ email_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <Label htmlFor="browser_enabled" className="flex items-center gap-1.5">
                    <MonitorSmartphone className="size-3.5" aria-hidden />
                    Browser
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {browserPermission === 'granted'
                      ? 'Critical alerts appear as desktop notifications.'
                      : 'Grant permission to receive desktop alerts.'}
                  </p>
                </div>
                {browserPermission === 'granted' ? (
                  <Switch
                    id="browser_enabled"
                    checked={preferences.data?.browser_enabled ?? false}
                    onCheckedChange={(checked: boolean) =>
                      savePreferences.mutate({ browser_enabled: checked })
                    }
                  />
                ) : (
                  <Button size="sm" variant="outline" onClick={() => void requestBrowser()}>
                    Enable
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              {PREFERENCE_FIELDS.map((field) => (
                <div key={field.key} className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label htmlFor={field.key}>{field.label}</Label>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  </div>
                  <Switch
                    id={field.key}
                    checked={Boolean(preferences.data?.[field.key] ?? true)}
                    onCheckedChange={(checked: boolean) =>
                      savePreferences.mutate({ [field.key]: checked })
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
