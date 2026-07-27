import { Link } from 'react-router-dom';
import { CalendarClock, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { MAINTENANCE_CATEGORY_LABELS } from '@/lib/constants';
import { formatNumber } from '@/lib/format';
import type { UpcomingService } from '@/types';

function progressFor(service: UpcomingService): number | null {
  if (service.interval_type === 'miles' && service.next_due_odometer != null) {
    const remaining = service.miles_remaining ?? 0;
    const window = 25000;
    return Math.max(0, Math.min(100, ((window - remaining) / window) * 100));
  }
  if (service.days_remaining != null) {
    const window = 90;
    return Math.max(0, Math.min(100, ((window - service.days_remaining) / window) * 100));
  }
  return null;
}

export function UpcomingServices({
  services,
  loading = false,
  limit = 5,
}: {
  services: UpcomingService[];
  loading?: boolean;
  limit?: number;
}) {
  const visible = services.slice(0, limit);

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Upcoming services</CardTitle>
        <Link
          to="/maintenance"
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          Manage schedules
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)
        ) : visible.length === 0 ? (
          <EmptyState
            compact
            icon={Wrench}
            title="No preventive schedules yet"
            description="Add mileage or date-based intervals to get reminders before a service comes due."
          />
        ) : (
          visible.map((service) => {
            const percent = progressFor(service);
            return (
              <div key={service.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{service.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {MAINTENANCE_CATEGORY_LABELS[service.category]}
                      {service.next_due_odometer
                        ? ` · due at ${formatNumber(service.next_due_odometer)} mi`
                        : ''}
                    </p>
                  </div>
                  <Badge
                    variant={
                      service.urgency === 'overdue'
                        ? 'danger'
                        : service.urgency === 'due_soon'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {service.urgency === 'overdue'
                      ? 'Overdue'
                      : service.miles_remaining != null
                        ? `${formatNumber(Math.max(0, service.miles_remaining))} mi`
                        : service.days_remaining != null
                          ? `${Math.max(0, service.days_remaining)} days`
                          : 'Scheduled'}
                  </Badge>
                </div>
                {percent != null ? (
                  <Progress
                    value={percent}
                    indicatorClassName={
                      service.urgency === 'overdue'
                        ? 'bg-danger'
                        : service.urgency === 'due_soon'
                          ? 'bg-warning'
                          : 'bg-primary'
                    }
                  />
                ) : (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="size-3.5" aria-hidden />
                    Interval based on calendar days
                  </p>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
