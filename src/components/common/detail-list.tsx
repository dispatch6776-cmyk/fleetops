import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DetailItem {
  label: string;
  value: ReactNode;
  mono?: boolean;
  /** Highlights the row (e.g. an expiring document). */
  tone?: 'default' | 'warning' | 'danger' | 'success';
}

const TONES = {
  default: '',
  warning: 'text-warning',
  danger: 'text-danger',
  success: 'text-success',
} as const;

export function DetailList({
  items,
  columns = 2,
  className,
}: {
  items: DetailItem[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0 space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {item.label}
          </dt>
          <dd
            className={cn(
              'truncate text-sm',
              item.mono && 'font-mono',
              TONES[item.tone ?? 'default'],
              item.tone && item.tone !== 'default' && 'font-medium',
            )}
          >
            {item.value ?? <span className="text-muted-foreground">—</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
