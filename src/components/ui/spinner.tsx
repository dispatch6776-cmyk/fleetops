import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2">
      <Loader2 className={cn('size-4 animate-spin text-muted-foreground', className)} aria-hidden />
      <span className={label ? 'text-sm text-muted-foreground' : 'sr-only'}>{label ?? 'Loading'}</span>
    </span>
  );
}

export function FullPageSpinner({ label = 'Loading FleetOps' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3">
      <div className="relative">
        <div className="size-10 rounded-xl bg-primary/15" />
        <Loader2 className="absolute inset-0 m-auto size-5 animate-spin text-primary" aria-hidden />
      </div>
      <p className="text-sm text-muted-foreground">{label}…</p>
    </div>
  );
}
