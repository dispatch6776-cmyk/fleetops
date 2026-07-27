import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Shared tooltip shell so every chart in the app looks identical. */
export function ChartTooltip({
  label,
  children,
  className,
}: {
  label?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'min-w-40 rounded-lg border border-border bg-popover/95 p-3 text-xs shadow-pop backdrop-blur',
        className,
      )}
    >
      {label ? <p className="mb-2 font-medium text-foreground">{label}</p> : null}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function TooltipRow({
  color,
  name,
  value,
}: {
  color: string;
  name: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="size-2 rounded-full" style={{ background: color }} aria-hidden />
        {name}
      </span>
      <span className="font-mono font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export const AXIS_STYLE = {
  fontSize: 11,
  fill: 'hsl(var(--muted-foreground))',
} as const;

export const GRID_STYLE = {
  stroke: 'hsl(var(--border))',
  strokeDasharray: '3 3',
  vertical: false,
} as const;

/** Wrapper that gives every chart a consistent height and empty state. */
export function ChartFrame({
  height = 260,
  isEmpty,
  emptyLabel = 'No data for this period',
  children,
}: {
  height?: number;
  isEmpty?: boolean;
  emptyLabel?: string;
  children: ReactNode;
}) {
  if (isEmpty) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground"
      >
        {emptyLabel}
      </div>
    );
  }
  return <div style={{ height }}>{children}</div>;
}
