import { Link } from 'react-router-dom';
import { Banknote, Gauge, Receipt, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { formatCurrency, formatRelative } from '@/lib/format';
import type { ActivityItem } from '../api/dashboard.api';

const ICONS = {
  maintenance: Wrench,
  payment: Banknote,
  expense: Receipt,
  mileage: Gauge,
} as const;

const TONES = {
  maintenance: 'bg-warning-soft text-warning',
  payment: 'bg-success-soft text-success',
  expense: 'bg-danger-soft text-danger',
  mileage: 'bg-info-soft text-info',
} as const;

export function ActivityFeed({
  items,
  loading = false,
}: {
  items: ActivityItem[];
  loading?: boolean;
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            compact
            title="Nothing logged yet"
            description="Work orders, payments and odometer readings appear here as they happen."
          />
        ) : (
          <ol className="relative space-y-1">
            <span
              className="absolute bottom-3 left-[19px] top-3 w-px bg-border"
              aria-hidden
            />
            {items.map((item) => {
              const Icon = ICONS[item.kind];
              return (
                <li key={item.id}>
                  <Link
                    to={item.href}
                    className="relative flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/60"
                  >
                    <span
                      className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card ${TONES[item.kind]}`}
                    >
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{item.title}</span>
                        {item.amount != null ? (
                          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                            {formatCurrency(item.amount)}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-xs capitalize text-muted-foreground">
                          {item.detail}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatRelative(item.occurredAt)}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
