import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  Printer,
  Send,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TableCell } from '@/components/ui/table';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable, type Column } from '@/components/common/data-table';
import { DetailList } from '@/components/common/detail-list';
import { PageHeader } from '@/components/common/page-header';
import { StatCard, StatCardGrid } from '@/components/common/stat-card';
import { Spinner } from '@/components/ui/spinner';
import { InvoiceDialog } from '@/features/financials/components/invoice-dialog';
import {
  useAppSettings,
  useInvoice,
  useInvoiceMutations,
  useInvoices,
} from '@/features/financials/hooks';
import { downloadInvoicePdf } from '@/features/financials/pdf/invoice-pdf';
import { useActiveRental, useActiveTruck } from '@/features/trucks/hooks';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_TONE } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/format';
import { exportCsv, exportExcel, type ExportColumn } from '@/lib/export';
import { sumBy } from '@/lib/utils';
import type { Invoice } from '@/types';

export default function InvoicesPage() {
  const { truck, truckId } = useActiveTruck();
  const invoices = useInvoices(truckId);
  const settings = useAppSettings();
  const activeRental = useActiveRental(truckId);
  const mutations = useInvoiceMutations(truckId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [detailId, setDetailId] = useState<string | null>(() => searchParams.get('open'));

  // Deep link from global search (`/invoices?open=<id>`): open the matching
  // invoice's detail dialog once, then drop the param so it doesn't reopen
  // if the user closes it and navigates back.
  useEffect(() => {
    const openId = searchParams.get('open');
    if (openId) setDetailId(openId);
  }, [searchParams]);

  function closeDetail() {
    setDetailId(null);
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

  const editing = useInvoice(editingId);
  const detail = useInvoice(detailId);

  const rows = invoices.data ?? [];
  const outstanding = sumBy(
    rows.filter((row) => ['sent', 'partial', 'overdue'].includes(row.status)),
    (row) => Number(row.balance),
  );
  const paidThisYear = sumBy(
    rows.filter(
      (row) => row.status === 'paid' && new Date(row.issue_date).getFullYear() === new Date().getFullYear(),
    ),
    (row) => Number(row.total),
  );
  const overdueCount = rows.filter((row) => row.status === 'overdue').length;

  async function handlePdf(invoiceId: string) {
    try {
      const target = detail.data?.id === invoiceId ? detail.data : null;
      if (!target) {
        setDetailId(invoiceId);
        toast('Opening the invoice — press Download PDF again once it loads.');
        return;
      }
      await downloadInvoicePdf({
        invoice: target,
        settings: settings.data ?? null,
        truck: truck ?? null,
      });
      toast.success('Invoice PDF downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not build the PDF');
    }
  }

  const exportColumns: ExportColumn<Invoice>[] = [
    { header: 'Invoice', value: (row) => row.invoice_number },
    { header: 'Issued', value: (row) => row.issue_date, type: 'date' },
    { header: 'Due', value: (row) => row.due_date, type: 'date' },
    { header: 'Status', value: (row) => INVOICE_STATUS_LABELS[row.status] },
    { header: 'Total', value: (row) => Number(row.total), type: 'currency' },
    { header: 'Paid', value: (row) => Number(row.amount_paid), type: 'currency' },
    { header: 'Balance', value: (row) => Number(row.balance), type: 'currency' },
  ];

  const columns: Column<Invoice>[] = [
    {
      id: 'number',
      header: 'Invoice',
      value: (row) => row.invoice_number,
      cell: (row) => <span className="font-mono font-medium">{row.invoice_number}</span>,
    },
    {
      id: 'issued',
      header: 'Issued',
      value: (row) => row.issue_date,
      cell: (row) => <span className="whitespace-nowrap">{formatDate(row.issue_date)}</span>,
    },
    {
      id: 'due',
      header: 'Due',
      value: (row) => row.due_date,
      cell: (row) => <span className="whitespace-nowrap">{formatDate(row.due_date)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      value: (row) => row.status,
      cell: (row) => (
        <Badge variant={INVOICE_STATUS_TONE[row.status]}>{INVOICE_STATUS_LABELS[row.status]}</Badge>
      ),
    },
    {
      id: 'total',
      header: 'Total',
      align: 'right',
      value: (row) => Number(row.total),
      cell: (row) => <span className="font-mono tabular-nums">{formatCurrency(row.total)}</span>,
    },
    {
      id: 'balance',
      header: 'Balance',
      align: 'right',
      value: (row) => Number(row.balance),
      cell: (row) => (
        <span
          className={`font-mono font-medium tabular-nums ${
            Number(row.balance) > 0 ? 'text-warning' : 'text-success'
          }`}
        >
          {formatCurrency(row.balance)}
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
            aria-label="View invoice"
            onClick={(event) => {
              event.stopPropagation();
              setDetailId(row.id);
            }}
          >
            <FileText />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit invoice"
            onClick={(event) => {
              event.stopPropagation();
              setEditingId(row.id);
              setEditorOpen(true);
            }}
          >
            <Pencil />
          </Button>
          <ConfirmDialog
            destructive
            title={`Delete ${row.invoice_number}?`}
            description="Line items are removed too. Payments already applied stay on record but lose their link."
            confirmLabel="Delete invoice"
            onConfirm={() => mutations.remove.mutateAsync(row.id)}
            trigger={
              <Button variant="ghost" size="icon-sm" aria-label="Delete invoice">
                <Trash2 />
              </Button>
            }
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Bill the renting company, track payments and chase what is outstanding."
        actions={
          <>
            <Button variant="outline" onClick={() => exportCsv(rows, exportColumns, 'fleetops-invoices')}>
              <Download />
              CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => void exportExcel(rows, exportColumns, 'fleetops-invoices', 'Invoices')}
            >
              <FileSpreadsheet />
              Excel
            </Button>
            <Button
              onClick={() => {
                setEditingId(null);
                setEditorOpen(true);
              }}
            >
              <Plus />
              New invoice
            </Button>
          </>
        }
      />

      <StatCardGrid className="xl:grid-cols-3">
        <StatCard
          label="Outstanding balance"
          value={formatCurrency(outstanding)}
          icon={Send}
          tone={outstanding > 0 ? 'warning' : 'success'}
          hint={`${rows.filter((row) => Number(row.balance) > 0).length} open invoices`}
          loading={invoices.isLoading}
        />
        <StatCard
          label="Overdue"
          value={String(overdueCount)}
          icon={FileText}
          tone={overdueCount > 0 ? 'danger' : 'success'}
          hint={overdueCount > 0 ? 'Past the due date' : 'Nothing past due'}
        />
        <StatCard
          label="Collected this year"
          value={formatCurrency(paidThisYear)}
          icon={Printer}
          tone="success"
          hint="Paid invoices, current calendar year"
        />
      </StatCardGrid>

      <DataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        loading={invoices.isLoading}
        onRowClick={(row) => setDetailId(row.id)}
        searchPlaceholder="Search by number or status…"
        initialSort={{ columnId: 'issued', direction: 'desc' }}
        emptyTitle="No invoices yet"
        emptyDescription="Create your first invoice to bill the renting company."
        emptyAction={
          <Button
            onClick={() => {
              setEditingId(null);
              setEditorOpen(true);
            }}
          >
            <Plus />
            New invoice
          </Button>
        }
        footer={
          <>
            <TableCell colSpan={4} className="font-medium">
              Total
            </TableCell>
            <TableCell className="text-right font-mono font-medium tabular-nums">
              {formatCurrency(sumBy(rows, (row) => Number(row.total)))}
            </TableCell>
            <TableCell className="text-right font-mono font-medium tabular-nums">
              {formatCurrency(sumBy(rows, (row) => Number(row.balance)))}
            </TableCell>
            <TableCell />
          </>
        }
      />

      {/* Invoice detail */}
      <Dialog open={Boolean(detailId)} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent size="lg" className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail.data?.invoice_number ?? 'Invoice'}</DialogTitle>
            <DialogDescription>
              {detail.data
                ? `Issued ${formatDate(detail.data.issue_date)} · due ${formatDate(detail.data.due_date)}`
                : 'Loading…'}
            </DialogDescription>
          </DialogHeader>

          {detail.isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner label="Loading invoice" />
            </div>
          ) : detail.data ? (
            <div className="space-y-5">
              <DetailList
                columns={2}
                items={[
                  { label: 'Bill to', value: detail.data.rental_company?.name },
                  {
                    label: 'Status',
                    value: (
                      <Badge variant={INVOICE_STATUS_TONE[detail.data.status]}>
                        {INVOICE_STATUS_LABELS[detail.data.status]}
                      </Badge>
                    ),
                  },
                  {
                    label: 'Service period',
                    value:
                      detail.data.period_start && detail.data.period_end
                        ? `${formatDate(detail.data.period_start)} – ${formatDate(detail.data.period_end)}`
                        : null,
                  },
                  { label: 'Balance', value: formatCurrency(detail.data.balance), mono: true },
                ]}
              />

              <div className="panel overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Description</th>
                      <th className="px-4 py-2 text-right font-semibold">Qty</th>
                      <th className="px-4 py-2 text-right font-semibold">Unit</th>
                      <th className="px-4 py-2 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {detail.data.line_items?.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2">{item.description}</td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">
                          {Number(item.quantity)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-medium tabular-nums">
                          {formatCurrency(item.line_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono tabular-nums">{formatCurrency(detail.data.subtotal)}</span>
                </div>
                {Number(detail.data.tax_amount) > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-mono tabular-nums">
                      {formatCurrency(detail.data.tax_amount)}
                    </span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t border-border pt-1 font-medium">
                  <span>Total</span>
                  <span className="font-mono tabular-nums">{formatCurrency(detail.data.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-mono tabular-nums text-success">
                    {formatCurrency(detail.data.amount_paid)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Balance due</span>
                  <span className="font-mono tabular-nums">{formatCurrency(detail.data.balance)}</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingId(detail.data?.id ?? null);
                    setDetailId(null);
                    setEditorOpen(true);
                  }}
                >
                  <Pencil />
                  Edit
                </Button>
                <Button onClick={() => void handlePdf(detail.data!.id)}>
                  <Download />
                  Download PDF
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {truckId ? (
        <InvoiceDialog
          truckId={truckId}
          invoice={editingId ? (editing.data ?? null) : null}
          activeAgreement={activeRental.data ?? null}
          open={editorOpen}
          onOpenChange={(open) => {
            setEditorOpen(open);
            if (!open) setEditingId(null);
          }}
        />
      ) : null}
    </div>
  );
}
