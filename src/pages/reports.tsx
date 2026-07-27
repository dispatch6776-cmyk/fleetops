import { useMemo, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { DataTable } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { StatCard, StatCardGrid } from '@/components/common/stat-card';
import { MileageChart } from '@/components/charts/mileage-chart';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { useMonthlyFinancials } from '@/features/dashboard/hooks';
import { useAppSettings, useExpenses, usePayments } from '@/features/financials/hooks';
import { useMaintenanceRecords } from '@/features/maintenance/hooks';
import { useMileageLogs, useMonthlyMileage } from '@/features/mileage/hooks';
import { downloadReportPdf, type ReportSpec } from '@/features/reports/pdf/report-pdf';
import { useActiveTruck } from '@/features/trucks/hooks';
import { usePermissions } from '@/hooks/use-permissions';
import {
  EXPENSE_CATEGORY_LABELS,
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
} from '@/lib/constants';
import { exportCsv, exportExcel, type ExportColumn } from '@/lib/export';
import { formatCurrency, formatDate, formatNumber, formatPercent, toDateInput } from '@/lib/format';
import { sumBy } from '@/lib/utils';

type ReportType = 'income' | 'expense' | 'profit' | 'maintenance' | 'mileage' | 'rental';

interface ReportRow {
  id: string;
  cells: (string | number)[];
}

const REPORT_TYPES: { value: ReportType; label: string; financial: boolean; description: string }[] = [
  { value: 'profit', label: 'Profit & loss', financial: true, description: 'Income, expenses and margin by month.' },
  { value: 'income', label: 'Income', financial: true, description: 'Every payment received in the period.' },
  { value: 'expense', label: 'Expenses', financial: true, description: 'Every cost, grouped by category.' },
  { value: 'maintenance', label: 'Maintenance', financial: false, description: 'Work orders, shops and downtime.' },
  { value: 'mileage', label: 'Mileage', financial: false, description: 'Odometer history and monthly totals.' },
  { value: 'rental', label: 'Rental activity', financial: true, description: 'Rent collected against expected rate.' },
];

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - 11, 1);
  return { from: toDateInput(from), to: toDateInput(to) };
}

export default function ReportsPage() {
  const { truck, truckId } = useActiveTruck();
  const { canSeeMoney } = usePermissions();
  const settings = useAppSettings();

  const [type, setType] = useState<ReportType>(canSeeMoney ? 'profit' : 'maintenance');
  const [range, setRange] = useState(defaultRange);
  const [busy, setBusy] = useState(false);

  const filter = useMemo(() => ({ from: range.from, to: range.to }), [range]);

  const payments = usePayments(truckId, filter);
  const expenses = useExpenses(truckId, filter);
  const months = useMonthlyFinancials(truckId, 24);
  const maintenance = useMaintenanceRecords(truckId, { from: range.from, to: range.to });
  const mileage = useMileageLogs(truckId);
  const monthlyMileage = useMonthlyMileage(truckId);

  const availableTypes = REPORT_TYPES.filter((item) => canSeeMoney || !item.financial);
  const activeType = REPORT_TYPES.find((item) => item.value === type) ?? availableTypes[0];

  const monthsInRange = useMemo(
    () => (months.data ?? []).filter((row) => row.month >= range.from && row.month <= range.to),
    [months.data, range],
  );

  const mileageInRange = useMemo(
    () => (mileage.data ?? []).filter((row) => row.log_date >= range.from && row.log_date <= range.to),
    [mileage.data, range],
  );

  const report = useMemo(() => {
    switch (type) {
      case 'profit': {
        const rows: ReportRow[] = monthsInRange.map((row) => ({
          id: row.month,
          cells: [
            formatDate(row.month, 'MMMM yyyy'),
            Number(row.income),
            Number(row.expenses),
            Number(row.profit),
            row.margin_percent != null ? Number(row.margin_percent) : 0,
            Number(row.miles_driven),
            row.cost_per_mile != null ? Number(row.cost_per_mile) : 0,
          ],
        }));
        return {
          headers: ['Month', 'Income', 'Expenses', 'Profit', 'Margin', 'Miles', 'Cost / mile'],
          rows,
          summary: [
            { label: 'Income', value: formatCurrency(sumBy(monthsInRange, (row) => Number(row.income))) },
            { label: 'Expenses', value: formatCurrency(sumBy(monthsInRange, (row) => Number(row.expenses))) },
            { label: 'Profit', value: formatCurrency(sumBy(monthsInRange, (row) => Number(row.profit))) },
            { label: 'Miles', value: formatNumber(sumBy(monthsInRange, (row) => Number(row.miles_driven))) },
          ],
        };
      }
      case 'income': {
        const rows: ReportRow[] = (payments.data ?? []).map((row) => ({
          id: row.id,
          cells: [
            formatDate(row.payment_date),
            PAYMENT_TYPE_LABELS[row.type],
            row.method.toUpperCase(),
            row.reference ?? '—',
            row.is_late ? 'Yes' : 'No',
            Number(row.amount),
          ],
        }));
        return {
          headers: ['Date', 'Type', 'Method', 'Reference', 'Late', 'Amount'],
          rows,
          summary: [
            { label: 'Payments', value: String(rows.length) },
            { label: 'Total received', value: formatCurrency(sumBy(payments.data ?? [], (row) => Number(row.amount))) },
            {
              label: 'Late payments',
              value: String((payments.data ?? []).filter((row) => row.is_late).length),
            },
          ],
        };
      }
      case 'expense': {
        const rows: ReportRow[] = (expenses.data ?? []).map((row) => ({
          id: row.id,
          cells: [
            formatDate(row.expense_date),
            EXPENSE_CATEGORY_LABELS[row.category],
            row.vendor ?? '—',
            row.description ?? '—',
            row.is_tax_deductible ? 'Yes' : 'No',
            Number(row.amount),
          ],
        }));
        return {
          headers: ['Date', 'Category', 'Vendor', 'Description', 'Deductible', 'Amount'],
          rows,
          summary: [
            { label: 'Entries', value: String(rows.length) },
            { label: 'Total spend', value: formatCurrency(sumBy(expenses.data ?? [], (row) => Number(row.amount))) },
            {
              label: 'Deductible',
              value: formatCurrency(
                sumBy(
                  (expenses.data ?? []).filter((row) => row.is_tax_deductible),
                  (row) => Number(row.amount),
                ),
              ),
            },
          ],
        };
      }
      case 'maintenance': {
        const rows: ReportRow[] = (maintenance.data ?? []).map((row) => ({
          id: row.id,
          cells: [
            formatDate(row.service_date),
            row.title,
            MAINTENANCE_CATEGORY_LABELS[row.category],
            MAINTENANCE_STATUS_LABELS[row.status],
            row.shop_name ?? '—',
            row.odometer ?? 0,
            canSeeMoney ? Number(row.cost_total) : 0,
          ],
        }));
        return {
          headers: ['Date', 'Work order', 'Category', 'Status', 'Shop', 'Odometer', 'Cost'],
          rows,
          summary: [
            { label: 'Work orders', value: String(rows.length) },
            {
              label: 'Completed',
              value: String((maintenance.data ?? []).filter((row) => row.status === 'completed').length),
            },
            ...(canSeeMoney
              ? [
                  {
                    label: 'Total cost',
                    value: formatCurrency(sumBy(maintenance.data ?? [], (row) => Number(row.cost_total))),
                  },
                ]
              : []),
            {
              label: 'Downtime days',
              value: String(sumBy(maintenance.data ?? [], (row) => Number(row.downtime_days ?? 0))),
            },
          ],
        };
      }
      case 'mileage': {
        const rows: ReportRow[] = mileageInRange.map((row) => ({
          id: row.id,
          cells: [
            formatDate(row.log_date),
            row.odometer,
            row.miles_driven ?? 0,
            row.source.toUpperCase(),
          ],
        }));
        return {
          headers: ['Date', 'Odometer', 'Miles driven', 'Source'],
          rows,
          summary: [
            { label: 'Readings', value: String(rows.length) },
            {
              label: 'Miles driven',
              value: formatNumber(sumBy(mileageInRange, (row) => Number(row.miles_driven ?? 0))),
            },
            {
              label: 'Ending odometer',
              value: formatNumber(mileageInRange[0]?.odometer ?? truck?.odometer ?? 0),
            },
          ],
        };
      }
      case 'rental':
      default: {
        const rentPayments = (payments.data ?? []).filter((row) => row.type.startsWith('rent'));
        const rows: ReportRow[] = rentPayments.map((row) => ({
          id: row.id,
          cells: [
            formatDate(row.payment_date),
            row.period_start ? `${formatDate(row.period_start)} – ${formatDate(row.period_end)}` : '—',
            PAYMENT_TYPE_LABELS[row.type],
            row.is_late ? 'Late' : 'On time',
            Number(row.amount),
          ],
        }));
        return {
          headers: ['Paid on', 'Period', 'Type', 'Timeliness', 'Amount'],
          rows,
          summary: [
            { label: 'Rent payments', value: String(rows.length) },
            { label: 'Rent collected', value: formatCurrency(sumBy(rentPayments, (row) => Number(row.amount))) },
            {
              label: 'On-time rate',
              value: rows.length
                ? formatPercent(
                    (rentPayments.filter((row) => !row.is_late).length / rentPayments.length) * 100,
                  )
                : '—',
            },
          ],
        };
      }
    }
  }, [type, monthsInRange, payments.data, expenses.data, maintenance.data, mileageInRange, canSeeMoney, truck]);

  const currencyColumns = useMemo(() => {
    switch (type) {
      case 'profit':
        return new Set([1, 2, 3, 6]);
      case 'income':
        return new Set([5]);
      case 'expense':
        return new Set([5]);
      case 'maintenance':
        return new Set([6]);
      case 'rental':
        return new Set([4]);
      default:
        return new Set<number>();
    }
  }, [type]);

  function renderCell(value: string | number, index: number) {
    if (typeof value === 'number') {
      if (currencyColumns.has(index)) return formatCurrency(value);
      if (type === 'profit' && index === 4) return formatPercent(value);
      return formatNumber(value);
    }
    return value;
  }

  async function handleExport(format: 'pdf' | 'xlsx' | 'csv') {
    setBusy(true);
    try {
      const exportColumns: ExportColumn<ReportRow>[] = report.headers.map((header, index) => ({
        header,
        value: (row) => row.cells[index],
        type: currencyColumns.has(index) ? 'currency' : typeof report.rows[0]?.cells[index] === 'number' ? 'number' : 'string',
        width: index === 1 ? 32 : 16,
      }));

      const filename = `fleetops-${type}-report`;

      if (format === 'csv') {
        exportCsv(report.rows, exportColumns, filename);
      } else if (format === 'xlsx') {
        await exportExcel(report.rows, exportColumns, filename, activeType.label);
      } else {
        const spec: ReportSpec = {
          title: `${activeType.label} report`,
          subtitle: truck
            ? `${truck.year} ${truck.make} ${truck.model} · Unit ${truck.truck_number} · VIN ${truck.vin}`
            : 'Fleet report',
          companyName: settings.data?.company_name ?? 'FleetOps',
          period: `${formatDate(range.from)} – ${formatDate(range.to)}`,
          summary: report.summary,
          columns: report.headers.map((header, index) => ({
            header,
            width: index === 1 ? 220 : 110,
            align: typeof report.rows[0]?.cells[index] === 'number' ? 'right' : 'left',
          })),
          rows: report.rows.map((row) => row.cells.map((cell, index) => String(renderCell(cell, index)))),
          footnote: 'Generated by FleetOps — figures reflect data recorded at the time of export.',
        };
        await downloadReportPdf(spec, filename);
      }
      toast.success(`${format.toUpperCase()} exported`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setBusy(false);
    }
  }

  const loading =
    payments.isLoading || expenses.isLoading || maintenance.isLoading || mileage.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Build a report, review it on screen, then export to PDF, Excel or CSV."
        actions={
          <>
            <Button variant="outline" onClick={() => void handleExport('csv')} disabled={busy}>
              <Download />
              CSV
            </Button>
            <Button variant="outline" onClick={() => void handleExport('xlsx')} disabled={busy}>
              <FileSpreadsheet />
              Excel
            </Button>
            <Button onClick={() => void handleExport('pdf')} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <FileText />}
              PDF
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Report builder</CardTitle>
          <CardDescription>{activeType.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="report-type" className="text-sm font-medium">
              Report
            </label>
            <NativeSelect
              id="report-type"
              className="w-52"
              value={type}
              onChange={(event) => setType(event.target.value as ReportType)}
              options={availableTypes.map((item) => ({ value: item.value, label: item.label }))}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="report-from" className="text-sm font-medium">
              From
            </label>
            <Input
              id="report-from"
              type="date"
              className="w-40"
              value={range.from}
              onChange={(event) => setRange({ ...range, from: event.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="report-to" className="text-sm font-medium">
              To
            </label>
            <Input
              id="report-to"
              type="date"
              className="w-40"
              value={range.to}
              onChange={(event) => setRange({ ...range, to: event.target.value })}
            />
          </div>
          <Button variant="ghost" onClick={() => setRange(defaultRange())}>
            Reset range
          </Button>
        </CardContent>
      </Card>

      <StatCardGrid className={report.summary.length === 3 ? 'xl:grid-cols-3' : undefined}>
        {report.summary.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} icon={BarChart3} tone="default" />
        ))}
      </StatCardGrid>

      {type === 'profit' && canSeeMoney ? (
        <Card>
          <CardHeader>
            <CardTitle>Trend</CardTitle>
            <CardDescription>Income, expenses and profit across the selected period.</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={monthsInRange} height={260} />
          </CardContent>
        </Card>
      ) : null}

      {type === 'mileage' ? (
        <Card>
          <CardHeader>
            <CardTitle>Monthly mileage</CardTitle>
            <CardDescription>Miles driven per month with average fuel economy.</CardDescription>
          </CardHeader>
          <CardContent>
            <MileageChart data={monthlyMileage.data ?? []} height={260} />
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        data={report.rows}
        getRowId={(row) => row.id}
        loading={loading}
        pageSize={20}
        searchPlaceholder="Search this report…"
        emptyTitle="No data in this period"
        emptyDescription="Widen the date range or pick a different report type."
        columns={report.headers.map((header, index) => ({
          id: `col-${index}`,
          header,
          align: typeof report.rows[0]?.cells[index] === 'number' ? ('right' as const) : ('left' as const),
          value: (row: ReportRow) => row.cells[index],
          cell: (row: ReportRow) => (
            <span
              className={
                typeof row.cells[index] === 'number' ? 'font-mono tabular-nums' : undefined
              }
            >
              {renderCell(row.cells[index], index)}
            </span>
          ),
        }))}
      />
    </div>
  );
}
