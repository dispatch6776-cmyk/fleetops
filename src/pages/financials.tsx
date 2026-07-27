import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  Banknote,
  Download,
  FileSpreadsheet,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NativeSelect } from '@/components/ui/native-select';
import { TableCell } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable, type Column } from '@/components/common/data-table';
import { PageHeader } from '@/components/common/page-header';
import { StatCard, StatCardGrid } from '@/components/common/stat-card';
import { CategoryDonut, DonutLegend } from '@/components/charts/category-donut';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { ExpenseDialog } from '@/features/financials/components/expense-dialog';
import { PaymentDialog } from '@/features/financials/components/payment-dialog';
import {
  useExpenseMutations,
  useExpenses,
  useInvoices,
  usePaymentMutations,
  usePayments,
  useRentalAgreements,
} from '@/features/financials/hooks';
import { useMonthlyFinancials } from '@/features/dashboard/hooks';
import { useActiveRental, useActiveTruck } from '@/features/trucks/hooks';
import {
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  RATE_TYPE_LABELS,
  RENTAL_STATUS_LABELS,
} from '@/lib/constants';
import { formatCurrency, formatDate, formatNumber, formatPercent } from '@/lib/format';
import { exportCsv, exportExcel, type ExportColumn } from '@/lib/export';
import { percentChange, sumBy } from '@/lib/utils';
import type { Expense, Payment } from '@/types';

type RangeKey = '3m' | '6m' | '12m' | 'ytd' | 'all';

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time' },
];

function rangeToFilter(range: RangeKey): { from?: string } {
  const now = new Date();
  switch (range) {
    case '3m':
      return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10) };
    case '6m':
      return { from: new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10) };
    case '12m':
      return { from: new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString().slice(0, 10) };
    case 'ytd':
      return { from: new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10) };
    default:
      return {};
  }
}

export default function FinancialsPage() {
  const { truck, truckId } = useActiveTruck();
  const [range, setRange] = useState<RangeKey>('12m');
  const filter = useMemo(() => rangeToFilter(range), [range]);

  const payments = usePayments(truckId, filter);
  const expenses = useExpenses(truckId, filter);
  const invoices = useInvoices(truckId);
  const agreements = useRentalAgreements(truckId);
  const activeRental = useActiveRental(truckId);
  const months = useMonthlyFinancials(truckId, range === '3m' ? 3 : range === '6m' ? 6 : 12);

  const paymentMutations = usePaymentMutations(truckId);
  const expenseMutations = useExpenseMutations(truckId);

  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; payment: Payment | null }>({
    open: false,
    payment: null,
  });
  const [expenseDialog, setExpenseDialog] = useState<{ open: boolean; expense: Expense | null }>({
    open: false,
    expense: null,
  });

  const paymentRows = payments.data ?? [];
  // Memoized (not just `?? []`) because it's also a useMemo dependency below —
  // a fresh array literal on every render would defeat that memoization.
  const expenseRows = useMemo(() => expenses.data ?? [], [expenses.data]);
  const monthRows = months.data ?? [];

  const totalIncome = sumBy(paymentRows, (row) => Number(row.amount));
  const totalExpenses = sumBy(expenseRows, (row) => Number(row.amount));
  const profit = totalIncome - totalExpenses;
  const margin = totalIncome > 0 ? (profit / totalIncome) * 100 : null;
  const outstanding = sumBy(
    (invoices.data ?? []).filter((invoice) =>
      ['sent', 'partial', 'overdue'].includes(invoice.status),
    ),
    (invoice) => Number(invoice.balance),
  );

  const thisMonth = monthRows.at(-1);
  const lastMonth = monthRows.at(-2);

  const expenseByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const expense of expenseRows) {
      const label = EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category;
      totals.set(label, (totals.get(label) ?? 0) + Number(expense.amount));
    }
    return [...totals.entries()].map(([name, value]) => ({ name, value }));
  }, [expenseRows]);

  const paymentColumns: Column<Payment>[] = [
    {
      id: 'date',
      header: 'Date',
      value: (row) => row.payment_date,
      cell: (row) => <span className="whitespace-nowrap">{formatDate(row.payment_date)}</span>,
    },
    {
      id: 'type',
      header: 'Type',
      value: (row) => PAYMENT_TYPE_LABELS[row.type],
      cell: (row) => (
        <span className="flex items-center gap-2">
          {PAYMENT_TYPE_LABELS[row.type]}
          {row.is_late ? <Badge variant="warning">Late</Badge> : null}
        </span>
      ),
    },
    {
      id: 'method',
      header: 'Method',
      value: (row) => PAYMENT_METHOD_LABELS[row.method],
      cell: (row) => <span className="text-muted-foreground">{PAYMENT_METHOD_LABELS[row.method]}</span>,
    },
    {
      id: 'reference',
      header: 'Reference',
      value: (row) => row.reference,
      cell: (row) => <span className="font-mono text-xs">{row.reference ?? '—'}</span>,
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      value: (row) => Number(row.amount),
      cell: (row) => (
        <span className="font-mono font-medium tabular-nums text-success">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit payment"
            onClick={() => setPaymentDialog({ open: true, payment: row })}
          >
            <Pencil />
          </Button>
          <ConfirmDialog
            destructive
            title="Delete this payment?"
            description="The invoice balance and monthly totals will be recalculated."
            confirmLabel="Delete payment"
            onConfirm={() => paymentMutations.remove.mutateAsync(row.id)}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Delete payment">
                <Trash2 />
              </Button>
            }
          />
        </div>
      ),
    },
  ];

  const expenseColumns: Column<Expense>[] = [
    {
      id: 'date',
      header: 'Date',
      value: (row) => row.expense_date,
      cell: (row) => <span className="whitespace-nowrap">{formatDate(row.expense_date)}</span>,
    },
    {
      id: 'category',
      header: 'Category',
      value: (row) => EXPENSE_CATEGORY_LABELS[row.category],
      cell: (row) => <Badge variant="neutral">{EXPENSE_CATEGORY_LABELS[row.category]}</Badge>,
    },
    {
      id: 'vendor',
      header: 'Vendor',
      value: (row) => row.vendor,
      cell: (row) => <span className="truncate">{row.vendor ?? '—'}</span>,
    },
    {
      id: 'description',
      header: 'Description',
      value: (row) => row.description,
      cell: (row) => (
        <span className="flex items-center gap-2 truncate text-muted-foreground">
          {row.description ?? '—'}
          {row.maintenance_id ? <Badge variant="info">Work order</Badge> : null}
          {row.fuel_log_id ? <Badge variant="info">Fuel</Badge> : null}
        </span>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      value: (row) => Number(row.amount),
      cell: (row) => (
        <span className="font-mono font-medium tabular-nums">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit expense"
            onClick={() => setExpenseDialog({ open: true, expense: row })}
          >
            <Pencil />
          </Button>
          {!row.maintenance_id && !row.fuel_log_id ? (
            <ConfirmDialog
              destructive
              title="Delete this expense?"
              description="It will be removed from your profit and loss figures."
              confirmLabel="Delete expense"
              onConfirm={() => expenseMutations.remove.mutateAsync(row.id)}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label="Delete expense">
                  <Trash2 />
                </Button>
              }
            />
          ) : null}
        </div>
      ),
    },
  ];

  const paymentExportColumns: ExportColumn<Payment>[] = [
    { header: 'Date', value: (row) => row.payment_date, type: 'date' },
    { header: 'Type', value: (row) => PAYMENT_TYPE_LABELS[row.type] },
    { header: 'Method', value: (row) => PAYMENT_METHOD_LABELS[row.method] },
    { header: 'Reference', value: (row) => row.reference },
    { header: 'Amount', value: (row) => Number(row.amount), type: 'currency' },
    { header: 'Late', value: (row) => (row.is_late ? 'Yes' : 'No') },
    { header: 'Notes', value: (row) => row.notes, width: 40 },
  ];

  const expenseExportColumns: ExportColumn<Expense>[] = [
    { header: 'Date', value: (row) => row.expense_date, type: 'date' },
    { header: 'Category', value: (row) => EXPENSE_CATEGORY_LABELS[row.category] },
    { header: 'Vendor', value: (row) => row.vendor },
    { header: 'Description', value: (row) => row.description, width: 40 },
    { header: 'Amount', value: (row) => Number(row.amount), type: 'currency' },
    { header: 'Tax deductible', value: (row) => (row.is_tax_deductible ? 'Yes' : 'No') },
  ];

  async function handleExport(kind: 'payments' | 'expenses', format: 'csv' | 'xlsx') {
    try {
      if (kind === 'payments') {
        if (format === 'csv') exportCsv(paymentRows, paymentExportColumns, 'fleetops-income');
        else await exportExcel(paymentRows, paymentExportColumns, 'fleetops-income', 'Income');
      } else {
        if (format === 'csv') exportCsv(expenseRows, expenseExportColumns, 'fleetops-expenses');
        else await exportExcel(expenseRows, expenseExportColumns, 'fleetops-expenses', 'Expenses');
      }
      toast.success(`Exported ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financials"
        description={
          truck
            ? `Income, expenses and profit for ${truck.truck_number}.`
            : 'Income, expenses and profit.'
        }
        actions={
          <>
            <NativeSelect
              className="w-44"
              options={RANGE_OPTIONS}
              value={range}
              onChange={(event) => setRange(event.target.value as RangeKey)}
              aria-label="Date range"
            />
            <Button variant="outline" asChild>
              <Link to="/invoices">
                <Receipt />
                Invoices
              </Link>
            </Button>
            <Button onClick={() => setPaymentDialog({ open: true, payment: null })}>
              <Plus />
              Record payment
            </Button>
          </>
        }
      />

      <StatCardGrid>
        <StatCard
          label="Income"
          value={formatCurrency(totalIncome)}
          icon={Banknote}
          tone="success"
          hint={`${paymentRows.length} payments`}
          change={percentChange(Number(thisMonth?.income ?? 0), Number(lastMonth?.income ?? 0))}
          loading={payments.isLoading}
        />
        <StatCard
          label="Expenses"
          value={formatCurrency(totalExpenses)}
          icon={ArrowDownRight}
          tone="danger"
          hint={`${expenseRows.length} entries`}
          change={percentChange(Number(thisMonth?.expenses ?? 0), Number(lastMonth?.expenses ?? 0))}
          positiveIsGood={false}
          loading={expenses.isLoading}
        />
        <StatCard
          label="Net profit"
          value={formatCurrency(profit)}
          icon={profit >= 0 ? TrendingUp : ArrowDownRight}
          tone={profit >= 0 ? 'success' : 'danger'}
          hint={margin != null ? `${formatPercent(margin)} margin` : undefined}
          change={percentChange(Number(thisMonth?.profit ?? 0), Number(lastMonth?.profit ?? 0))}
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(outstanding)}
          icon={Wallet}
          tone={outstanding > 0 ? 'warning' : 'success'}
          hint={outstanding > 0 ? 'Across open invoices' : 'Everything is settled'}
          href="/invoices"
        />
      </StatCardGrid>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="rental">Rental terms</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Cash flow</CardTitle>
                <CardDescription>Income against expenses, with profit overlaid.</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueChart data={monthRows} height={300} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Expense mix</CardTitle>
                <CardDescription>Selected period.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CategoryDonut
                  data={expenseByCategory}
                  centerValue={formatCurrency(totalExpenses)}
                  centerLabel="Total"
                  height={200}
                />
                <DonutLegend data={expenseByCategory.slice(0, 7)} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly breakdown</CardTitle>
              <CardDescription>Every month with its margin and cost per mile.</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={monthRows}
                getRowId={(row) => row.month}
                searchable={false}
                pageSize={12}
                emptyTitle="No financial history yet"
                columns={[
                  {
                    id: 'month',
                    header: 'Month',
                    value: (row) => row.month,
                    cell: (row) => formatDate(row.month, 'MMMM yyyy'),
                  },
                  {
                    id: 'income',
                    header: 'Income',
                    align: 'right',
                    value: (row) => Number(row.income),
                    cell: (row) => (
                      <span className="font-mono tabular-nums text-success">
                        {formatCurrency(row.income)}
                      </span>
                    ),
                  },
                  {
                    id: 'expenses',
                    header: 'Expenses',
                    align: 'right',
                    value: (row) => Number(row.expenses),
                    cell: (row) => (
                      <span className="font-mono tabular-nums">{formatCurrency(row.expenses)}</span>
                    ),
                  },
                  {
                    id: 'profit',
                    header: 'Profit',
                    align: 'right',
                    value: (row) => Number(row.profit),
                    cell: (row) => (
                      <span
                        className={`font-mono font-medium tabular-nums ${
                          Number(row.profit) >= 0 ? 'text-success' : 'text-danger'
                        }`}
                      >
                        {formatCurrency(row.profit)}
                      </span>
                    ),
                  },
                  {
                    id: 'margin',
                    header: 'Margin',
                    align: 'right',
                    value: (row) => Number(row.margin_percent ?? 0),
                    cell: (row) =>
                      row.margin_percent != null ? formatPercent(Number(row.margin_percent)) : '—',
                  },
                  {
                    id: 'miles',
                    header: 'Miles',
                    align: 'right',
                    value: (row) => Number(row.miles_driven),
                    cell: (row) => (
                      <span className="font-mono tabular-nums">{formatNumber(row.miles_driven)}</span>
                    ),
                  },
                  {
                    id: 'cpm',
                    header: 'Cost / mile',
                    align: 'right',
                    value: (row) => Number(row.cost_per_mile ?? 0),
                    cell: (row) =>
                      row.cost_per_mile != null ? `$${Number(row.cost_per_mile).toFixed(3)}` : '—',
                  },
                ]}
                footer={
                  <>
                    <TableCell className="font-medium">Total</TableCell>
                    <TableCell className="text-right font-mono font-medium tabular-nums text-success">
                      {formatCurrency(sumBy(monthRows, (row) => Number(row.income)))}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium tabular-nums">
                      {formatCurrency(sumBy(monthRows, (row) => Number(row.expenses)))}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium tabular-nums">
                      {formatCurrency(sumBy(monthRows, (row) => Number(row.profit)))}
                    </TableCell>
                    <TableCell colSpan={3} />
                  </>
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income">
          <DataTable
            data={paymentRows}
            columns={paymentColumns}
            getRowId={(row) => row.id}
            loading={payments.isLoading}
            searchPlaceholder="Search payments…"
            emptyTitle="No payments in this period"
            emptyDescription="Record the rent you receive to build your income history."
            emptyAction={
              <Button onClick={() => setPaymentDialog({ open: true, payment: null })}>
                <Plus />
                Record payment
              </Button>
            }
            toolbar={
              <>
                <Button variant="outline" size="sm" onClick={() => void handleExport('payments', 'csv')}>
                  <Download />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => void handleExport('payments', 'xlsx')}>
                  <FileSpreadsheet />
                  Excel
                </Button>
                <Button size="sm" onClick={() => setPaymentDialog({ open: true, payment: null })}>
                  <Plus />
                  Payment
                </Button>
              </>
            }
          />
        </TabsContent>

        <TabsContent value="expenses">
          <DataTable
            data={expenseRows}
            columns={expenseColumns}
            getRowId={(row) => row.id}
            loading={expenses.isLoading}
            searchPlaceholder="Search expenses…"
            emptyTitle="No expenses in this period"
            emptyDescription="Fuel and maintenance costs arrive automatically; add insurance, permits and taxes here."
            emptyAction={
              <Button onClick={() => setExpenseDialog({ open: true, expense: null })}>
                <Plus />
                Record expense
              </Button>
            }
            toolbar={
              <>
                <Button variant="outline" size="sm" onClick={() => void handleExport('expenses', 'csv')}>
                  <Download />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => void handleExport('expenses', 'xlsx')}>
                  <FileSpreadsheet />
                  Excel
                </Button>
                <Button size="sm" onClick={() => setExpenseDialog({ open: true, expense: null })}>
                  <Plus />
                  Expense
                </Button>
              </>
            }
          />
        </TabsContent>

        <TabsContent value="rental">
          <Card>
            <CardHeader>
              <CardTitle>Rental agreements</CardTitle>
              <CardDescription>
                Terms behind the rent you invoice. The active agreement drives invoice defaults.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={agreements.data ?? []}
                getRowId={(row) => row.id}
                loading={agreements.isLoading}
                searchable={false}
                emptyTitle="No rental agreements recorded"
                columns={[
                  {
                    id: 'agreement',
                    header: 'Agreement',
                    value: (row) => row.agreement_number,
                    cell: (row) => <span className="font-mono">{row.agreement_number ?? '—'}</span>,
                  },
                  {
                    id: 'period',
                    header: 'Period',
                    value: (row) => row.start_date,
                    cell: (row) => (
                      <span className="whitespace-nowrap">
                        {formatDate(row.start_date)} → {row.end_date ? formatDate(row.end_date) : 'ongoing'}
                      </span>
                    ),
                  },
                  {
                    id: 'rate',
                    header: 'Rate',
                    align: 'right',
                    value: (row) => Number(row.rate_amount),
                    cell: (row) => (
                      <span className="font-mono tabular-nums">
                        {formatCurrency(row.rate_amount)}{' '}
                        <span className="text-muted-foreground">
                          {RATE_TYPE_LABELS[row.rate_type].toLowerCase()}
                        </span>
                      </span>
                    ),
                  },
                  {
                    id: 'deposit',
                    header: 'Deposit',
                    align: 'right',
                    value: (row) => Number(row.deposit_amount),
                    cell: (row) => (
                      <span className="font-mono tabular-nums">{formatCurrency(row.deposit_amount)}</span>
                    ),
                  },
                  {
                    id: 'allowance',
                    header: 'Mileage allowance',
                    align: 'right',
                    value: (row) => row.mileage_allowance ?? 0,
                    cell: (row) =>
                      row.mileage_allowance
                        ? `${formatNumber(row.mileage_allowance)} mi @ $${row.overage_rate ?? 0}/mi over`
                        : 'Unlimited',
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    value: (row) => row.status,
                    cell: (row) => (
                      <Badge variant={row.status === 'active' ? 'success' : 'neutral'}>
                        {RENTAL_STATUS_LABELS[row.status]}
                      </Badge>
                    ),
                  },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {truckId ? (
        <>
          <PaymentDialog
            truckId={truckId}
            rentalAgreementId={activeRental.data?.id ?? null}
            invoices={invoices.data ?? []}
            payment={paymentDialog.payment}
            open={paymentDialog.open}
            onOpenChange={(open) => setPaymentDialog({ open, payment: open ? paymentDialog.payment : null })}
          />
          <ExpenseDialog
            truckId={truckId}
            expense={expenseDialog.expense}
            open={expenseDialog.open}
            onOpenChange={(open) => setExpenseDialog({ open, expense: open ? expenseDialog.expense : null })}
          />
        </>
      ) : null}
    </div>
  );
}
