import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarClock,
  CircleDollarSign,
  Download,
  Pencil,
  Plus,
  Trash2,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NativeSelect } from '@/components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable, type Column } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { PermissionGate } from '@/components/common/permission-gate';
import { StatCard, StatCardGrid } from '@/components/common/stat-card';
import { CategoryDonut, DonutLegend } from '@/components/charts/category-donut';
import { ScheduleDialog } from '@/features/maintenance/components/schedule-dialog';
import { WorkOrderDialog } from '@/features/maintenance/components/work-order-dialog';
import {
  useMaintenanceCosts,
  useMaintenanceMutations,
  useMaintenanceRecord,
  useMaintenanceRecords,
  useScheduleMutations,
  useSchedules,
} from '@/features/maintenance/hooks';
import { useUpcomingServices } from '@/features/dashboard/hooks';
import { useActiveTruck } from '@/features/trucks/hooks';
import { usePermissions } from '@/hooks/use-permissions';
import {
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_TONE,
  MAINTENANCE_TYPE_LABELS,
  toOptions,
} from '@/lib/constants';
import { formatCountdown, formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { exportCsv, type ExportColumn } from '@/lib/export';
import { sumBy } from '@/lib/utils';
import type { MaintenanceRecord, MaintenanceSchedule, MaintenanceStatus } from '@/types';

export default function MaintenancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { truck, truckId } = useActiveTruck();
  const { can } = usePermissions();

  const [status, setStatus] = useState<MaintenanceStatus | 'all'>('all');
  const [category, setCategory] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [workOrderOpen, setWorkOrderOpen] = useState(searchParams.get('new') === '1');
  const [scheduleTarget, setScheduleTarget] = useState<MaintenanceSchedule | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const filters = useMemo(
    () => ({
      status,
      category: category as never,
    }),
    [status, category],
  );

  const records = useMaintenanceRecords(truckId, filters);
  const schedules = useSchedules(truckId);
  const upcoming = useUpcomingServices(truckId);
  const costs = useMaintenanceCosts(truckId);
  const editing = useMaintenanceRecord(editingId);
  const mutations = useMaintenanceMutations(truckId);
  const scheduleMutations = useScheduleMutations(truckId);

  const rows = records.data ?? [];
  const completed = rows.filter((row) => row.status === 'completed');
  const totalCost = sumBy(completed, (row) => Number(row.cost_total));
  const openWorkOrders = rows.filter((row) =>
    ['scheduled', 'in_progress'].includes(row.status),
  ).length;
  const overdueServices = (upcoming.data ?? []).filter((item) => item.urgency === 'overdue').length;

  const costByCategory = useMemo(
    () =>
      (costs.data ?? []).map((row) => ({
        name: MAINTENANCE_CATEGORY_LABELS[row.category] ?? row.category,
        value: Number(row.total_cost),
      })),
    [costs.data],
  );

  function openWorkOrder(id: string | null) {
    setEditingId(id);
    setWorkOrderOpen(true);
    if (searchParams.get('new')) {
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }

  const columns: Column<MaintenanceRecord>[] = [
    {
      id: 'date',
      header: 'Date',
      value: (row) => row.service_date,
      cell: (row) => <span className="whitespace-nowrap">{formatDate(row.service_date)}</span>,
    },
    {
      id: 'title',
      header: 'Work order',
      value: (row) => row.title,
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {MAINTENANCE_CATEGORY_LABELS[row.category]} · {MAINTENANCE_TYPE_LABELS[row.type]}
            {row.shop_name ? ` · ${row.shop_name}` : ''}
          </p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      value: (row) => row.status,
      cell: (row) => (
        <Badge variant={MAINTENANCE_STATUS_TONE[row.status]}>
          {MAINTENANCE_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      id: 'odometer',
      header: 'Odometer',
      align: 'right',
      value: (row) => row.odometer ?? 0,
      cell: (row) => (
        <span className="font-mono tabular-nums">
          {row.odometer ? formatNumber(row.odometer) : '—'}
        </span>
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
              <span className="font-mono font-medium tabular-nums">
                {row.is_warranty ? (
                  <Badge variant="info">Warranty</Badge>
                ) : (
                  formatCurrency(row.cost_total)
                )}
              </span>
            ),
          },
        ]
      : []),
    {
      id: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <PermissionGate permission="maintenance.edit">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit work order"
              onClick={(event) => {
                event.stopPropagation();
                openWorkOrder(row.id);
              }}
            >
              <Pencil />
            </Button>
          </PermissionGate>
          <PermissionGate permission="maintenance.delete">
            <ConfirmDialog
              destructive
              title="Delete this work order?"
              description="The linked expense entry is removed as well."
              confirmLabel="Delete"
              onConfirm={() => mutations.remove.mutateAsync(row.id)}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label="Delete work order">
                  <Trash2 />
                </Button>
              }
            />
          </PermissionGate>
        </div>
      ),
    },
  ];

  const exportColumns: ExportColumn<MaintenanceRecord>[] = [
    { header: 'Date', value: (row) => row.service_date, type: 'date' },
    { header: 'Title', value: (row) => row.title, width: 32 },
    { header: 'Category', value: (row) => MAINTENANCE_CATEGORY_LABELS[row.category] },
    { header: 'Type', value: (row) => MAINTENANCE_TYPE_LABELS[row.type] },
    { header: 'Status', value: (row) => MAINTENANCE_STATUS_LABELS[row.status] },
    { header: 'Odometer', value: (row) => row.odometer, type: 'number' },
    { header: 'Shop', value: (row) => row.shop_name },
    { header: 'Cost', value: (row) => Number(row.cost_total), type: 'currency' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        description={
          truck
            ? `Work orders and preventive schedules for ${truck.truck_number}.`
            : 'Work orders and preventive schedules.'
        }
        actions={
          <PermissionGate permission="maintenance.edit">
            <Button onClick={() => openWorkOrder(null)}>
              <Plus />
              New work order
            </Button>
          </PermissionGate>
        }
      />

      <StatCardGrid>
        <StatCard
          label="Open work orders"
          value={String(openWorkOrders)}
          icon={Wrench}
          tone={openWorkOrders > 0 ? 'warning' : 'success'}
          hint={openWorkOrders > 0 ? 'Scheduled or in progress' : 'Nothing outstanding'}
          loading={records.isLoading}
        />
        <StatCard
          label="Services overdue"
          value={String(overdueServices)}
          icon={CalendarClock}
          tone={overdueServices > 0 ? 'danger' : 'success'}
          hint={`${schedules.data?.length ?? 0} schedules configured`}
          loading={upcoming.isLoading}
        />
        <StatCard
          label="Completed services"
          value={String(completed.length)}
          icon={Wrench}
          tone="info"
          hint="In the selected filter"
        />
        {can('maintenance.viewCost') ? (
          <StatCard
            label="Maintenance spend"
            value={formatCurrency(totalCost)}
            icon={CircleDollarSign}
            tone="default"
            hint="Completed work orders"
          />
        ) : null}
      </StatCardGrid>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Work orders</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          {can('maintenance.viewCost') ? <TabsTrigger value="costs">Cost analysis</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="orders">
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(row) => row.id}
            loading={records.isLoading}
            onRowClick={(row) => openWorkOrder(row.id)}
            searchPlaceholder="Search work orders, shops, notes…"
            emptyTitle="No work orders yet"
            emptyDescription="Log every service and repair to build a maintenance history that supports resale value."
            emptyAction={
              <PermissionGate permission="maintenance.edit">
                <Button onClick={() => openWorkOrder(null)}>
                  <Plus />
                  New work order
                </Button>
              </PermissionGate>
            }
            toolbar={
              <>
                <NativeSelect
                  className="w-36"
                  aria-label="Filter by status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as MaintenanceStatus | 'all')}
                  options={[
                    { value: 'all', label: 'All statuses' },
                    ...toOptions(MAINTENANCE_STATUS_LABELS),
                  ]}
                />
                <NativeSelect
                  className="w-40"
                  aria-label="Filter by category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  options={[
                    { value: 'all', label: 'All categories' },
                    ...toOptions(MAINTENANCE_CATEGORY_LABELS),
                  ]}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportCsv(rows, exportColumns, 'fleetops-maintenance')}
                >
                  <Download />
                  CSV
                </Button>
              </>
            }
          />
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <div className="flex justify-end">
            <PermissionGate permission="maintenance.edit">
              <Button
                onClick={() => {
                  setScheduleTarget(null);
                  setScheduleOpen(true);
                }}
              >
                <Plus />
                New schedule
              </Button>
            </PermissionGate>
          </div>

          <DataTable
            data={schedules.data ?? []}
            getRowId={(row) => row.id}
            loading={schedules.isLoading}
            searchable={false}
            emptyTitle="No preventive schedules"
            emptyDescription="Add mileage or calendar intervals so services never slip."
            columns={[
              {
                id: 'name',
                header: 'Schedule',
                value: (row) => row.name,
                cell: (row) => (
                  <div>
                    <p className="font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {MAINTENANCE_CATEGORY_LABELS[row.category]}
                    </p>
                  </div>
                ),
              },
              {
                id: 'interval',
                header: 'Interval',
                value: (row) => row.interval_miles ?? row.interval_days ?? 0,
                cell: (row) =>
                  row.interval_type === 'miles'
                    ? `Every ${formatNumber(row.interval_miles ?? 0)} mi`
                    : row.interval_type === 'days'
                      ? `Every ${row.interval_days} days`
                      : `Every ${row.interval_engine_hours} hours`,
              },
              {
                id: 'last',
                header: 'Last service',
                value: (row) => row.last_service_date,
                cell: (row) => (
                  <span className="whitespace-nowrap text-muted-foreground">
                    {row.last_service_date ? formatDate(row.last_service_date) : '—'}
                    {row.last_service_odometer
                      ? ` · ${formatNumber(row.last_service_odometer)} mi`
                      : ''}
                  </span>
                ),
              },
              {
                id: 'next',
                header: 'Next due',
                value: (row) => row.next_due_odometer ?? 0,
                cell: (row) => {
                  const service = (upcoming.data ?? []).find((item) => item.id === row.id);
                  return (
                    <span className="flex items-center gap-2">
                      <span className="font-mono">
                        {row.next_due_odometer
                          ? `${formatNumber(row.next_due_odometer)} mi`
                          : row.next_due_date
                            ? formatDate(row.next_due_date)
                            : '—'}
                      </span>
                      {service ? (
                        <Badge
                          variant={
                            service.urgency === 'overdue'
                              ? 'danger'
                              : service.urgency === 'due_soon'
                                ? 'warning'
                                : 'neutral'
                          }
                        >
                          {service.urgency === 'overdue'
                            ? 'Overdue'
                            : service.miles_remaining != null
                              ? `${formatNumber(Math.max(0, service.miles_remaining))} mi`
                              : service.next_due_date
                                ? formatCountdown(service.next_due_date)
                                : 'Scheduled'}
                        </Badge>
                      ) : null}
                    </span>
                  );
                },
              },
              {
                id: 'actions',
                header: '',
                sortable: false,
                align: 'right',
                cell: (row) => (
                  <div className="flex justify-end gap-1">
                    <PermissionGate permission="maintenance.edit">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit schedule"
                        onClick={() => {
                          setScheduleTarget(row);
                          setScheduleOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <ConfirmDialog
                        destructive
                        title={`Delete “${row.name}”?`}
                        description="You will stop receiving reminders for this service."
                        confirmLabel="Delete schedule"
                        onConfirm={() => scheduleMutations.remove.mutateAsync(row.id)}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label="Delete schedule">
                            <Trash2 />
                          </Button>
                        }
                      />
                    </PermissionGate>
                  </div>
                ),
              },
            ]}
          />
        </TabsContent>

        {can('maintenance.viewCost') ? (
          <TabsContent value="costs">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Cost by category</CardTitle>
                  <CardDescription>All completed work orders.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CategoryDonut
                    data={costByCategory}
                    centerValue={formatCurrency(sumBy(costByCategory, (slice) => slice.value))}
                    centerLabel="Lifetime"
                    height={200}
                  />
                  <DonutLegend data={costByCategory.slice(0, 6)} />
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Category detail</CardTitle>
                  <CardDescription>
                    Average and peak cost per category — outliers are worth investigating.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable
                    data={costs.data ?? []}
                    getRowId={(row) => row.category}
                    searchable={false}
                    loading={costs.isLoading}
                    emptyTitle="No completed work orders yet"
                    columns={[
                      {
                        id: 'category',
                        header: 'Category',
                        value: (row) => MAINTENANCE_CATEGORY_LABELS[row.category],
                        cell: (row) => MAINTENANCE_CATEGORY_LABELS[row.category],
                      },
                      {
                        id: 'count',
                        header: 'Services',
                        align: 'right',
                        value: (row) => Number(row.service_count),
                        cell: (row) => row.service_count,
                      },
                      {
                        id: 'total',
                        header: 'Total',
                        align: 'right',
                        value: (row) => Number(row.total_cost),
                        cell: (row) => (
                          <span className="font-mono tabular-nums">{formatCurrency(row.total_cost)}</span>
                        ),
                      },
                      {
                        id: 'average',
                        header: 'Average',
                        align: 'right',
                        value: (row) => Number(row.average_cost),
                        cell: (row) => (
                          <span className="font-mono tabular-nums">
                            {formatCurrency(row.average_cost)}
                          </span>
                        ),
                      },
                      {
                        id: 'max',
                        header: 'Highest',
                        align: 'right',
                        value: (row) => Number(row.max_cost),
                        cell: (row) => (
                          <span className="font-mono tabular-nums">{formatCurrency(row.max_cost)}</span>
                        ),
                      },
                      {
                        id: 'last',
                        header: 'Last service',
                        value: (row) => row.last_service_on,
                        cell: (row) => formatDate(row.last_service_on),
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ) : null}
      </Tabs>

      {truckId ? (
        <>
          <WorkOrderDialog
            truckId={truckId}
            record={editingId ? (editing.data ?? null) : null}
            defaultOdometer={truck?.odometer ?? null}
            open={workOrderOpen}
            onOpenChange={(open) => {
              setWorkOrderOpen(open);
              if (!open) setEditingId(null);
            }}
          />
          <ScheduleDialog
            truckId={truckId}
            schedule={scheduleTarget}
            open={scheduleOpen}
            onOpenChange={(open) => {
              setScheduleOpen(open);
              if (!open) setScheduleTarget(null);
            }}
          />
        </>
      ) : null}
    </div>
  );
}
