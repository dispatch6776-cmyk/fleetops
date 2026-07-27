import { Link } from 'react-router-dom';
import { AlertTriangle, BellRing, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCountdown } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AlertItem, AlertSeverity } from '@/types';

const SEVERITY_ICON = {
  critical: AlertTriangle,
  warning: BellRing,
  info: Info,
} as const;

const SEVERITY_CLASS: Record<AlertSeverity, string> = {
  critical: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  info: 'bg-info-soft text-info',
};

export function AlertsPanel({
  alerts,
  loading = false,
  limit = 6,
}: {
  alerts: AlertItem[];
  loading?: boolean;
  limit?: number;
}) {
  const visible = alerts.slice(0, limit);
  const criticalCount = alerts.filter((alert) => alert.severity === 'critical').length;

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          Alerts
          {criticalCount > 0 ? (
            <Badge variant="danger">{criticalCount} critical</Badge>
          ) : alerts.length > 0 ? (
            <Badge variant="warning">{alerts.length}</Badge>
          ) : null}
        </CardTitle>
        <Link
          to="/notifications"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="flex size-10 items-center justify-center rounded-xl bg-success-soft text-success">
              <CheckCircle2 className="size-5" aria-hidden />
            </span>
            <p className="text-sm font-medium">Everything is current</p>
            <p className="text-xs text-muted-foreground">
              No expiring documents and no services due in the next 30 days.
            </p>
          </div>
        ) : (
          visible.map((alert) => {
            const Icon = SEVERITY_ICON[alert.severity];
            return (
              <Link
                key={alert.id}
                to={alert.href}
                className="flex items-start gap-3 rounded-lg border border-transparent p-2.5 transition-colors hover:border-border hover:bg-secondary/60"
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                    SEVERITY_CLASS[alert.severity],
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{alert.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {alert.description}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 pt-1 text-xs text-muted-foreground">
                  {alert.dueDate ? formatCountdown(alert.dueDate) : null}
                  <ChevronRight className="size-3.5" aria-hidden />
                </span>
              </Link>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
