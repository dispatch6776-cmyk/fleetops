import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { ALL_NAV_ITEMS } from '@/app/navigation';

function labelFor(segment: string, index: number, segments: string[]): string {
  const href = `/${segments.slice(0, index + 1).join('/')}`;
  const nav = ALL_NAV_ITEMS.find((item) => item.href === href);
  if (nav) return nav.label;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment)) return 'Details';
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
      <Link
        to="/"
        className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Home className="size-3.5" aria-hidden />
        <span className="sr-only">Dashboard</span>
      </Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        return (
          <Fragment key={href}>
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
            {isLast ? (
              <span className="truncate font-medium" aria-current="page">
                {labelFor(segment, index, segments)}
              </span>
            ) : (
              <Link
                to={href}
                className="truncate text-muted-foreground transition-colors hover:text-foreground"
              >
                {labelFor(segment, index, segments)}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
