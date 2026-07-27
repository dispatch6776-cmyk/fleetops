import { useMemo, useRef, useState } from 'react';
import { Download, Fuel, Gauge, Plus, TrendingUp, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable, type Column } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { PermissionGate } from '@/components/common/permission-gate';
import { StatCard, StatCardGrid } from '@/components/common/stat-card';
import { MileageChart } from '@/components/charts/mileage-chart';
import {
  useFuelEconomy,
  useMileageLogs,
  useMileageMutations,
  useMonthlyMileage,
} from '@/features/mileage/hooks';
import { useActiveTruck } from '@/features/trucks/hooks';
import { US_STATES } from '@/lib/constants';
import { formatDate, formatDecimal, formatMiles, formatMpg, formatNumber, toDateInput } from '@/lib/format';
import { exportCsv, parseCsv, type ExportColumn } from '@/lib/export';
import { sumBy } from '@/lib/utils';
import type { FuelEconomy, MileageLog } from '@/types';

export default function MileagePage() {
  const { truck, truckId } = useActiveTruck();
  const logs = useMileageLogs(truckId);
  const monthly = useMonthlyMileage(truckId);
  const economy = useFuelEconomy(truckId);
  const mutations = useMileageMutations(truckId);
  const fileInput = useRef<HTMLInputElement>(null);

  const [logOpen, setLogOpen] = useState(false);
  const [fuelOpen, setFuelOpen] = useState(false);
  const [form, setForm] = useState({ log_date: toDateInput(new Date()), odometer: '', notes: '' });
  const [fuelForm, setFuelForm] = useState({
    fuel_date: toDateInput(new Date()),
    odometer: '',
    gallons: '',
    price_per_gallon: '',
    station: '',
    state: '',
    is_def: 'false',
  });

  const rows = logs.data ?? [];
  // Memoized because both feed the `stats` useMemo below — otherwise the
  // `?? []` fallback creates a new array reference every render, and `stats`
  // (and its avgMpg/ytd math) would recompute on every render regardless.
  const monthlyRows = useMemo(() => monthly.data ?? [], [monthly.data]);
  const economyRows = useMemo(() => economy.data ?? [], [economy.data]);

  const thisMonth = monthlyRows.at(-1);
  const lastMonth = monthlyRows.at(-2);

  const stats = useMemo(() => {
    const last12 = monthlyRows.slice(-12);
    const totalMiles = sumBy(last12, (row) => Number(row.miles_driven));
    const monthsWithData = last12.filter((row) => Number(row.miles_driven) > 0).length || 1;
    const mpgValues = economyRows
      .filter((row) => row.mpg != null)
      .slice(0, 20)
      .map((row) => Number(row.mpg));
    const avgMpg = mpgValues.length
      ? mpgValues.reduce((sum, value) => sum + value, 0) / mpgValues.length
      : null;
    return {
      totalMiles,
      avgMonthly: totalMiles / monthsWithData,
      avgDaily: totalMiles / (monthsWithData * 30),
      avgMpg,
      ytd: sumBy(
        monthlyRows.filter((row) => new Date(row.month).getFullYear() === new Date().getFullYear()),
        (row) => Number(row.miles_driven),
      ),
    };
  }, [monthlyRows, economyRows]);

  function submitLog() {
    if (!truckId) return;
    const odometer = Number(form.odometer);
    if (!Number.isFinite(odometer) || odometer <= 0) {
      toast.error('Enter a valid odometer reading');
      return;
    }
    mutations.create.mutate(
      {
        truck_id: truckId,
        log_date: form.log_date,
        odometer,
        source: 'manual',
        notes: form.notes || null,
      },
      {
        onSuccess: () => {
          setLogOpen(false);
          setForm({ log_date: toDateInput(new Date()), odometer: '', notes: '' });
        },
      },
    );
  }

  function submitFuel() {
    if (!truckId) return;
    const odometer = Number(fuelForm.odometer);
    const gallons = Number(fuelForm.gallons);
    const price = Number(fuelForm.price_per_gallon);
    if (!Number.isFinite(odometer) || !Number.isFinite(gallons) || gallons <= 0) {
      toast.error('Enter the odometer and gallons');
      return;
    }
    mutations.addFuel.mutate(
      {
        truck_id: truckId,
        fuel_date: fuelForm.fuel_date,
        odometer,
        gallons,
        price_per_gallon: Number.isFinite(price) ? price : 0,
        station: fuelForm.station || null,
        state: fuelForm.state || null,
        is_def: fuelForm.is_def === 'true',
      },
      { onSuccess: () => setFuelOpen(false) },
    );
  }

  async function handleImport(file: File) {
    if (!truckId) return;
    try {
      const parsed = await parseCsv<{ date?: string; log_date?: string; odometer?: string }>(file);
      const payload = parsed
        .map((row) => ({
          truck_id: truckId,
          log_date: (row.log_date ?? row.date ?? '').slice(0, 10),
          odometer: Number(row.odometer),
          source: 'import' as const,
        }))
        .filter((row) => row.log_date && Number.isFinite(row.odometer) && row.odometer > 0);

      if (payload.length === 0) {
        toast.error('No valid rows found. Expected columns: date, odometer.');
        return;
      }
      mutations.importCsv.mutate(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read the CSV');
    }
  }

  const exportColumns: ExportColumn<MileageLog>[] = [
    { header: 'Date', value: (row) => row.log_date, type: 'date' },
    { header: 'Odometer', value: (row) => row.odometer, type: 'number' },
    { header: 'Miles driven', value: (row) => row.miles_driven, type: 'number' },
    { header: 'Source', value: (row) => row.source },
    { header: 'Notes', value: (row) => row.notes, width: 40 },
  ];

  const logColumns: Column<MileageLog>[] = [
    {
      id: 'date',
      header: 'Date',
      value: (row) => row.log_date,
      cell: (row) => <span className="whitespace-nowrap">{formatDate(row.log_date)}</span>,
    },
    {
      id: 'odometer',
      header: 'Odometer',
      align: 'right',
      value: (row) => row.odometer,
      cell: (row) => <span className="font-mono tabular-nums">{formatNumber(row.odometer)}</span>,
    },
    {
      id: 'driven',
      header: 'Miles since last',
      align: 'right',
      value: (row) => row.miles_driven ?? 0,
      cell: (row) => (
        <span className="font-mono tabular-nums text-muted-foreground">
          {row.miles_driven != null ? `+${formatNumber(row.miles_driven)}` : '—'}
        </span>
      ),
    },
    {
      id: 'source',
      header: 'Source',
      value: (row) => row.source,
      cell: (row) => <Badge variant="neutral">{row.source.toUpperCase()}</Badge>,
    },
    {
      id: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      cell: (row) => (
        <PermissionGate permission="mileage.edit">
          <ConfirmDialog
            destructive
            title="Delete this reading?"
            description="Monthly totals and the miles-since-last calculation will be recomputed."
            confirmLabel="Delete"
            onConfirm={() => mutations.remove.mutateAsync(row.id)}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Delete reading">
                <Trash2 />
              </Button>
            }
          />
        </PermissionGate>
      ),
    },
  ];

  const economyColumns: Column<FuelEconomy>[] = [
    {
      id: 'date',
      header: 'Date',
      value: (row) => row.fuel_date,
      cell: (row) => <span className="whitespace-nowrap">{formatDate(row.fuel_date)}</span>,
    },
    {
      id: 'odometer',
      header: 'Odometer',
      align: 'right',
      value: (row) => row.odometer,
      cell: (row) => <span className="font-mono tabular-nums">{formatNumber(row.odometer)}</span>,
    },
    {
      id: 'gallons',
      header: 'Gallons',
      align: 'right',
      value: (row) => Number(row.gallons),
      cell: (row) => <span className="font-mono tabular-nums">{formatDecimal(row.gallons)}</span>,
    },
    {
      id: 'miles',
      header: 'Miles',
      align: 'right',
      value: (row) => row.miles_since_last ?? 0,
      cell: (row) =>
        row.miles_since_last ? (
          <span className="font-mono tabular-nums">{formatNumber(row.miles_since_last)}</span>
        ) : (
          '—'
        ),
    },
    {
      id: 'mpg',
      header: 'MPG',
      align: 'right',
      value: (row) => Number(row.mpg ?? 0),
      cell: (row) => (
        <span
          className={`font-mono font-medium tabular-nums ${
            row.mpg != null && Number(row.mpg) < 6 ? 'text-warning' : ''
          }`}
        >
          {formatMpg(row.mpg)}
        </span>
      ),
    },
    {
      id: 'station',
      header: 'Station',
      value: (row) => row.station,
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.station ?? '—'}
          {row.state ? ` · ${row.state}` : ''}
          {row.is_def ? <Badge variant="info" className="ml-2">DEF</Badge> : null}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mileage"
        description={
          truck ? `Odometer history and fuel economy for ${truck.truck_number}.` : 'Odometer history and fuel economy.'
        }
        actions={
          <PermissionGate permission="mileage.edit">
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImport(file);
                event.target.value = '';
              }}
            />
            <Button variant="outline" onClick={() => fileInput.current?.click()}>
              <Upload />
              Import CSV
            </Button>
            {/* Fuel rows carry prices, so only financial roles may write them. */}
            <PermissionGate permission="financials.edit">
              <Button variant="outline" onClick={() => setFuelOpen(true)}>
                <Fuel />
                Log fuel
              </Button>
            </PermissionGate>
            <Button onClick={() => setLogOpen(true)}>
              <Plus />
              Log odometer
            </Button>
          </PermissionGate>
        }
      />

      <StatCardGrid>
        <StatCard
          label="Current odometer"
          value={formatMiles(truck?.odometer ?? 0)}
          icon={Gauge}
          tone="info"
          hint={
            truck?.odometer_updated_at ? `Updated ${formatDate(truck.odometer_updated_at)}` : undefined
          }
          loading={logs.isLoading}
        />
        <StatCard
          label="Miles this month"
          value={formatNumber(thisMonth?.miles_driven ?? 0)}
          icon={TrendingUp}
          tone="default"
          change={
            lastMonth && Number(lastMonth.miles_driven) > 0
              ? ((Number(thisMonth?.miles_driven ?? 0) - Number(lastMonth.miles_driven)) /
                  Number(lastMonth.miles_driven)) *
                100
              : null
          }
        />
        <StatCard
          label="Average per month"
          value={formatNumber(Math.round(stats.avgMonthly))}
          icon={Gauge}
          tone="default"
          hint={`${formatNumber(Math.round(stats.avgDaily))} mi/day · ${formatNumber(stats.ytd)} YTD`}
        />
        <StatCard
          label="Fuel economy"
          value={formatMpg(stats.avgMpg)}
          icon={Fuel}
          tone={stats.avgMpg != null && stats.avgMpg < 6 ? 'warning' : 'success'}
          hint="Average of the last 20 fill-ups"
          loading={economy.isLoading}
        />
      </StatCardGrid>

      <Card>
        <CardHeader>
          <CardTitle>Monthly mileage</CardTitle>
          <CardDescription>Miles driven per month with average fuel economy.</CardDescription>
        </CardHeader>
        <CardContent>
          <MileageChart data={monthlyRows} height={280} />
        </CardContent>
      </Card>

      <Tabs defaultValue="readings">
        <TabsList>
          <TabsTrigger value="readings">Odometer readings</TabsTrigger>
          <TabsTrigger value="fuel">Fuel economy</TabsTrigger>
          <TabsTrigger value="monthly">Monthly totals</TabsTrigger>
        </TabsList>

        <TabsContent value="readings">
          <DataTable
            data={rows}
            columns={logColumns}
            getRowId={(row) => row.id}
            loading={logs.isLoading}
            searchPlaceholder="Search readings…"
            emptyTitle="No odometer readings yet"
            emptyDescription="Log readings weekly to track utilisation and cost per mile."
            toolbar={
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCsv(rows, exportColumns, 'fleetops-mileage')}
              >
                <Download />
                CSV
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="fuel">
          <DataTable
            data={economyRows}
            columns={economyColumns}
            getRowId={(row) => row.id}
            loading={economy.isLoading}
            searchPlaceholder="Search fill-ups…"
            emptyTitle="No fuel purchases logged"
            emptyDescription="Log fill-ups to calculate MPG and cost per mile."
          />
        </TabsContent>

        <TabsContent value="monthly">
          <DataTable
            data={monthlyRows}
            getRowId={(row) => row.month}
            loading={monthly.isLoading}
            searchable={false}
            emptyTitle="No mileage history"
            columns={[
              {
                id: 'month',
                header: 'Month',
                value: (row) => row.month,
                cell: (row) => formatDate(row.month, 'MMMM yyyy'),
              },
              {
                id: 'miles',
                header: 'Miles driven',
                align: 'right',
                value: (row) => Number(row.miles_driven),
                cell: (row) => (
                  <span className="font-mono tabular-nums">{formatNumber(row.miles_driven)}</span>
                ),
              },
              {
                id: 'daily',
                header: 'Avg per reading',
                align: 'right',
                value: (row) => Number(row.avg_daily_miles ?? 0),
                cell: (row) =>
                  row.avg_daily_miles ? formatNumber(Math.round(Number(row.avg_daily_miles))) : '—',
              },
              {
                id: 'mpg',
                header: 'Avg MPG',
                align: 'right',
                value: (row) => Number(row.avg_mpg ?? 0),
                cell: (row) => formatMpg(row.avg_mpg),
              },
              {
                id: 'gallons',
                header: 'Gallons',
                align: 'right',
                value: (row) => Number(row.gallons_purchased),
                cell: (row) => (
                  <span className="font-mono tabular-nums">{formatDecimal(row.gallons_purchased)}</span>
                ),
              },
              {
                id: 'ending',
                header: 'Ending odometer',
                align: 'right',
                value: (row) => Number(row.ending_odometer),
                cell: (row) => (
                  <span className="font-mono tabular-nums">{formatNumber(row.ending_odometer)}</span>
                ),
              },
            ]}
          />
        </TabsContent>
      </Tabs>

      {/* Log odometer */}
      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Log an odometer reading</DialogTitle>
            <DialogDescription>
              One reading per day. The truck odometer updates automatically when the value is higher.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Date" htmlFor="log_date" required>
              <Input
                id="log_date"
                type="date"
                value={form.log_date}
                onChange={(event) => setForm({ ...form, log_date: event.target.value })}
              />
            </FormField>
            <FormField label="Odometer" htmlFor="odometer" required>
              <Input
                id="odometer"
                type="number"
                inputMode="numeric"
                placeholder={String(truck?.odometer ?? '')}
                value={form.odometer}
                onChange={(event) => setForm({ ...form, odometer: event.target.value })}
              />
            </FormField>
            <FormField label="Notes" htmlFor="mileage_notes">
              <Textarea
                id="mileage_notes"
                rows={2}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitLog} loading={mutations.create.isPending}>
              Save reading
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log fuel */}
      <Dialog open={fuelOpen} onOpenChange={setFuelOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Log a fuel purchase</DialogTitle>
            <DialogDescription>
              MPG is calculated from the previous full-tank fill-up, and the cost is added to your
              expense ledger.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Date" htmlFor="fuel_date" required>
              <Input
                id="fuel_date"
                type="date"
                value={fuelForm.fuel_date}
                onChange={(event) => setFuelForm({ ...fuelForm, fuel_date: event.target.value })}
              />
            </FormField>
            <FormField label="Odometer" htmlFor="fuel_odometer" required>
              <Input
                id="fuel_odometer"
                type="number"
                value={fuelForm.odometer}
                onChange={(event) => setFuelForm({ ...fuelForm, odometer: event.target.value })}
              />
            </FormField>
            <FormField label="Gallons" htmlFor="gallons" required>
              <Input
                id="gallons"
                type="number"
                step="0.001"
                value={fuelForm.gallons}
                onChange={(event) => setFuelForm({ ...fuelForm, gallons: event.target.value })}
              />
            </FormField>
            <FormField label="Price per gallon" htmlFor="price_per_gallon">
              <Input
                id="price_per_gallon"
                type="number"
                step="0.001"
                value={fuelForm.price_per_gallon}
                onChange={(event) =>
                  setFuelForm({ ...fuelForm, price_per_gallon: event.target.value })
                }
              />
            </FormField>
            <FormField label="Station" htmlFor="station">
              <Input
                id="station"
                value={fuelForm.station}
                onChange={(event) => setFuelForm({ ...fuelForm, station: event.target.value })}
              />
            </FormField>
            <FormField label="State" htmlFor="fuel_state" hint="Used for IFTA reporting.">
              <NativeSelect
                id="fuel_state"
                placeholder="Select"
                value={fuelForm.state}
                onChange={(event) => setFuelForm({ ...fuelForm, state: event.target.value })}
                options={US_STATES.map((state) => ({ value: state, label: state }))}
              />
            </FormField>
            <FormField label="Purchase type" htmlFor="is_def">
              <NativeSelect
                id="is_def"
                value={fuelForm.is_def}
                onChange={(event) => setFuelForm({ ...fuelForm, is_def: event.target.value })}
                options={[
                  { value: 'false', label: 'Diesel' },
                  { value: 'true', label: 'DEF' },
                ]}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFuelOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitFuel} loading={mutations.addFuel.isPending}>
              Save purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
