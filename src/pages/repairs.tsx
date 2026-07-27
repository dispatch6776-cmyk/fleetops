import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, List, Rows3, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, type Column } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { WorkOrderDialog } from '@/features/maintenance/components/work-order-dialog';
import { useMaintenanceRecord, useMaintenanceRecords } from '@/features/maintenance/hooks';
import { useActiveTruck } from '@/features/trucks/hooks';
import { usePermissions } from '@/hooks/use-permissions';
import {
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_TONE,
  MAINTENANCE_TYPE_LABELS,
  toOptions,
} from '@/lib/constants';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { MaintenanceRecord } from '@/types';

export default function RepairsPage() {
  const { truck, truckId } = useActiveTruck();
  const { can } = usePermissions();
  const records = useMaintenanceRecords(truckId);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('open'));
  const selected = useMaintenanceRecord(selectedId);

  // Deep link from global search (`/repairs?open=<id>`).
  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId) setSelectedId(openId);
  }, [searchParams]);

  function closeSelected() {
    setSelectedId(null);
    if (searchParams.has('open')) {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.delete('open');
          return next;
        },
        { replace: true },
      );
    }
  }

  // Memoized because it's also a useMemo dependency below.
  const all = useMemo(() => records.data ?? [], [records.data]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return all.filter((record) => {
      if (typeFilter !== 'all' && record.type !== typeFilter) return false;
      if (!needle) return true;
      return [
        record.title,
        record.description,
        record.shop_name,
        record.mechanic_name,
        record.invoice_number,
        MAINTENANCE_CATEGORY_LABELS[record.category],
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle));
    });
  }, [all, search, typeFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, MaintenanceRecord[]>();
    for (const record of filtered) {
      const key = format(parseISO(record.service_date), 'yyyy-MM');
      const list = map.get(key) ?? [];
      list.push(record);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const columns: Column<MaintenanceRecord>[] = [
    {
      id: 'date',
      header: 'Date',
      value: (row) => row.service_date,
      cell: (row) => <span className="whitespace-nowrap">{formatDate(row.service_date)}</span>,
    },
    {
      id: 'title',
      header: 'Repair',
      value: (row) => row.title,
      cell: (row) => <span className="font-medium">{row.title}</span>,
    },
    {
      id: 'category',
      header: 'Category',
      value: (row) => MAINTENANCE_CATEGORY_LABELS[row.category],
      cell: (row) => <Badge variant="neutral">{MAINTENANCE_CATEGORY_LABELS[row.category]}</Badge>,
    },
    {
      id: 'shop',
      header: 'Shop',
      value: (row) => row.shop_name,
      cell: (row) => <span className="text-muted-foreground">{row.shop_name ?? '—'}</span>,
    },
    {
      id: 'odometer',
      header: 'Odometer',
      align: 'right',
      value: (row) => row.odometer ?? 0,
      cell: (row) => (
        <span className="font-mono tabular-nums">{row.odometer ? formatNumber(row.odometer) : '—'}</span>
      ),
    },
    ...(can('maintenance.viewCost')
      ? [
          {
            id: 'cost',
            header: 'Cost',
            align: 'right' as const,
            value: (row: MaintenanceRecord) => Number(row.cost_total),
            cell: (row: MaintenanceRecord) => (
              <span className="font-mono tabular-nums">{formatCurrency(row.cost_total)}</span>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repair history"
        description={
          truck
            ? `Every service and repair on ${truck.truck_number}, in three views.`
            : 'Every service and repair, in three views.'
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs"
          placeholder="Search repairs, shops, parts…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search repairs"
        />
        <NativeSelect
          className="w-44"
          aria-label="Filter by type"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          options={[{ value: 'all', label: 'All types' }, ...toOptions(MAINTENANCE_TYPE_LABELS)]}
        />
        <span className="text-sm text-muted-foreground">
          {filtered.length} of {all.length} records
        </span>
      </div>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">
            <Rows3 />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarDays />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="list">
            <List />
            List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          {records.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonCard key={index} className="h-24" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No repairs match your filters"
              description="Adjust the search or type filter to see more of the history."
            />
          ) : (
            <div className="space-y-8">
              {grouped.map(([key, monthRecords]) => (
                <section key={key} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {format(parseISO(`${key}-01`), 'MMMM yyyy')}
                    </h2>
                    <span className="h-px flex-1 bg-border" />
                    {can('maintenance.viewCost') ? (
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {formatCurrency(
                          monthRecords.reduce((sum, record) => sum + Number(record.cost_total), 0),
                        )}
                      </span>
                    ) : null}
                  </div>

                  <ol className="relative space-y-3 border-l border-border pl-6">
                    {monthRecords.map((record) => (
                      <li key={record.id} className="relative">
                        <span
                          className={cn(
                            'absolute -left-[1.6rem] top-4 size-3 rounded-full ring-4 ring-background',
                            record.type === 'repair'
                              ? 'bg-danger'
                              : record.type === 'warranty'
                                ? 'bg-info'
                                : 'bg-primary',
                          )}
                          aria-hidden
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedId(record.id)}
                          className="w-full rounded-xl border border-border bg-card p-4 text-left transition-shadow hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium">{record.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(record.service_date)} ·{' '}
                                {MAINTENANCE_CATEGORY_LABELS[record.category]}
                                {record.odometer ? ` · ${formatNumber(record.odometer)} mi` : ''}
                                {record.shop_name ? ` · ${record.shop_name}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={MAINTENANCE_STATUS_TONE[record.status]}>
                                {MAINTENANCE_STATUS_LABELS[record.status]}
                              </Badge>
                              {can('maintenance.viewCost') ? (
                                <span className="font-mono text-sm font-medium tabular-nums">
                                  {record.is_warranty ? 'Warranty' : formatCurrency(record.cost_total)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {record.description ? (
                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                              {record.description}
                            </p>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>{format(month, 'MMMM yyyy')}</CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setMonth((value) => subMonths(value, 1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setMonth((value) => addMonths(value, 1))}
                  aria-label="Next month"
                >
                  <ChevronRight />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div
                    key={day}
                    className="bg-surface-muted px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {day}
                  </div>
                ))}
                {calendarDays.map((day) => {
                  const dayRecords = filtered.filter((record) =>
                    isSameDay(parseISO(record.service_date), day),
                  );
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'min-h-24 bg-card p-1.5',
                        !isSameMonth(day, month) && 'bg-surface-muted/40 text-muted-foreground',
                      )}
                    >
                      <p
                        className={cn(
                          'mb-1 text-right text-xs',
                          isSameDay(day, new Date()) &&
                            'inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground',
                        )}
                      >
                        {format(day, 'd')}
                      </p>
                      <div className="space-y-1">
                        {dayRecords.slice(0, 2).map((record) => (
                          <button
                            key={record.id}
                            type="button"
                            onClick={() => setSelectedId(record.id)}
                            className={cn(
                              'block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-colors',
                              record.type === 'repair'
                                ? 'bg-danger-soft text-danger hover:bg-danger/20'
                                : 'bg-primary/12 text-primary hover:bg-primary/20',
                            )}
                          >
                            {record.title}
                          </button>
                        ))}
                        {dayRecords.length > 2 ? (
                          <p className="px-1.5 text-[10px] text-muted-foreground">
                            +{dayRecords.length - 2} more
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          <DataTable
            data={filtered}
            columns={columns}
            getRowId={(row) => row.id}
            loading={records.isLoading}
            searchable={false}
            onRowClick={(row) => setSelectedId(row.id)}
            emptyTitle="No repairs recorded"
            initialSort={{ columnId: 'date', direction: 'desc' }}
          />
        </TabsContent>
      </Tabs>

      {truckId ? (
        <WorkOrderDialog
          truckId={truckId}
          record={selected.data ?? null}
          open={Boolean(selectedId)}
          onOpenChange={(open) => {
            if (!open) closeSelected();
          }}
        />
      ) : null}
    </div>
  );
}
