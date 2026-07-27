import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, SearchX } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { SEARCH_ENTITY_ICONS, SEARCH_ENTITY_LABELS, SEARCH_ENTITY_ORDER } from '@/features/search/constants';
import { useGlobalSearch } from '@/features/search/hooks';
import { useActiveTruck } from '@/features/trucks/hooks';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatDate } from '@/lib/format';
import type { GlobalSearchRow, SearchEntityType } from '@/types';

export default function SearchPage() {
  const { truckId } = useActiveTruck();
  const [searchParams, setSearchParams] = useSearchParams();
  const [term, setTerm] = useState(searchParams.get('q') ?? '');
  const debouncedTerm = useDebouncedValue(term, 250);

  // Keep the URL in sync so results are shareable/bookmarkable, without
  // spamming browser history on every keystroke.
  useEffect(() => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (debouncedTerm) next.set('q', debouncedTerm);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm]);

  const results = useGlobalSearch(term, truckId, 12);

  const grouped = useMemo(() => {
    const map = new Map<SearchEntityType, GlobalSearchRow[]>();
    for (const row of results.data ?? []) {
      const list = map.get(row.entity_type) ?? [];
      list.push(row);
      map.set(row.entity_type, list);
    }
    return SEARCH_ENTITY_ORDER.map((type) => [type, map.get(type) ?? []] as const).filter(
      ([, list]) => list.length > 0,
    );
  }, [results.data]);

  const trimmed = term.trim();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Search"
        description="Find any truck, invoice, repair, maintenance record, mileage log, document or service shop."
      />

      <div className="relative max-w-xl">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          autoFocus
          className="pl-9"
          placeholder="Search everything…"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          aria-label="Search"
        />
      </div>

      {trimmed.length > 0 && trimmed.length < 2 ? (
        <p className="text-sm text-muted-foreground">Keep typing — at least 2 characters.</p>
      ) : null}

      {results.isLoading && trimmed.length >= 2 ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonCard key={index} className="h-20" />
          ))}
        </div>
      ) : trimmed.length < 2 ? (
        <EmptyState
          icon={SearchIcon}
          title="Search across your entire fleet"
          description="Truck details, invoices, repairs, maintenance history, mileage & fuel logs, documents and service shops — all in one place."
        />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={`No results for “${trimmed}”`}
          description="Try a different term, or check the spelling of a truck number, invoice number or shop name."
        />
      ) : (
        <div className="space-y-8">
          {grouped.map(([type, list]) => {
            const Icon = SEARCH_ENTITY_ICONS[type];
            return (
              <section key={type} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {SEARCH_ENTITY_LABELS[type]}
                  </h2>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {list.map((row) => (
                    <Link
                      key={`${row.entity_type}-${row.entity_id}`}
                      to={row.href}
                      className="block rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.title}</p>
                          {row.subtitle ? (
                            <p className="truncate text-xs text-muted-foreground">{row.subtitle}</p>
                          ) : null}
                          {row.occurred_on ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatDate(row.occurred_on)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {results.isError ? (
        <Card className="border-danger/40 bg-danger-soft/40 p-4 text-sm text-danger">
          Search failed. Try again in a moment.
        </Card>
      ) : null}
    </div>
  );
}
