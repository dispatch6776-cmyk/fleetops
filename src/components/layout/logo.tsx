import { cn } from '@/lib/utils';

export function Logo({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      role="img"
      aria-label="FleetOps"
    >
      <defs>
        <linearGradient id="fleetops-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(217 91% 60%)" />
          <stop offset="100%" stopColor="hsl(221 83% 45%)" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#fleetops-logo)" />
      <path
        d="M12 38V22a3 3 0 0 1 3-3h17a3 3 0 0 1 3 3v16"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M35 27h8.2a3 3 0 0 1 2.5 1.35L51 36.2V38"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 38h5m6 0h13m6 0h5" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="20" cy="42" r="4.6" fill="hsl(222 47% 8%)" stroke="#fff" strokeWidth="3" />
      <circle cx="43" cy="42" r="4.6" fill="hsl(222 47% 8%)" stroke="#fff" strokeWidth="3" />
    </svg>
  );
}

export function Wordmark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <Logo size={28} />
      {!collapsed ? (
        <div className="flex min-w-0 flex-col leading-none">
          <span className="truncate text-sm font-semibold tracking-tight">FleetOps</span>
          <span className="truncate text-[11px] text-muted-foreground">Fleet Management</span>
        </div>
      ) : null}
    </div>
  );
}
