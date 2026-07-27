import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type StatTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASSES: Record<StatTone, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
};

export interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: StatTone;
  /** Secondary line under the value. */
  hint?: string;
  /** Percentage change against the previous period. */
  change?: number | null;
  changeLabel?: string;
  /** Higher is better (default). Set false for expenses. */
  positiveIsGood?: boolean;
  href?: string;
  loading?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  hint,
  change,
  changeLabel = 'vs last month',
  positiveIsGood = true,
  href,
  loading = false,
  footer,
  className,
}: StatCardProps) {
  const hasChange = change != null && Number.isFinite(change);
  const isUp = hasChange && change > 0.05;
  const isDown = hasChange && change < -0.05;
  const good = isUp ? positiveIsGood : isDown ? !positiveIsGood : null;

  const body = (
    <Card
      className={cn(
        'group relative h-full overflow-hidden p-5 transition-shadow duration-200',
        href && 'hover:shadow-pop',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <p className="stat-value truncate">{value}</p>
          )}
        </div>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            TONE_CLASSES[tone],
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>

      {(hint || hasChange) && !loading ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {hasChange ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium',
                good === true && 'bg-success-soft text-success',
                good === false && 'bg-danger-soft text-danger',
                good === null && 'bg-muted text-muted-foreground',
              )}
            >
              {isUp ? (
                <ArrowUpRight className="size-3" aria-hidden />
              ) : isDown ? (
                <ArrowDownRight className="size-3" aria-hidden />
              ) : (
                <Minus className="size-3" aria-hidden />
              )}
              {Math.abs(change).toFixed(1)}%
            </span>
          ) : null}
          {hasChange ? <span className="text-muted-foreground">{changeLabel}</span> : null}
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </div>
      ) : null}

      {footer ? <div className="mt-3">{footer}</div> : null}
    </Card>
  );

  if (!href) return body;

  return (
    <Link to={href} className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {body}
    </Link>
  );
}

export function StatCardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 xl:grid-cols-4', className)}>{children}</div>
  );
}
