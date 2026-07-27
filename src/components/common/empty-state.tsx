import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-muted/40 text-center',
        compact ? 'gap-2 p-6' : 'gap-3 p-10',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-xl bg-primary/10 text-primary',
          compact ? 'size-9' : 'size-12',
        )}
      >
        <Icon className={compact ? 'size-4' : 'size-6'} aria-hidden />
      </div>
      <div className="space-y-1">
        <h3 className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>{title}</h3>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground text-balance">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
