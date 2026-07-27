import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { INVOICE_STATUS_LABELS, toOptions } from '@/lib/constants';
import { formatCurrency, toDateInput } from '@/lib/format';
import { useInvoiceMutations, useRentalCompanies } from '../hooks';
import { invoiceSchema, type InvoiceInput } from '../schemas';
import type { InvoiceDetail, RentalAgreement } from '@/types';

export function InvoiceDialog({
  truckId,
  invoice,
  activeAgreement,
  open,
  onOpenChange,
}: {
  truckId: string;
  invoice?: InvoiceDetail | null;
  activeAgreement?: RentalAgreement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const companies = useRentalCompanies();
  const { create, update } = useInvoiceMutations(truckId);
  const isEdit = Boolean(invoice);

  const form = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: toDefaults(invoice, activeAgreement),
  });

  const { register, control, handleSubmit, watch, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'line_items' });

  useEffect(() => {
    if (open) form.reset(toDefaults(invoice, activeAgreement));
  }, [open, invoice, activeAgreement, form]);

  const lineItems = watch('line_items') ?? [];
  const subtotal = lineItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0,
  );
  const taxRate = Number(watch('tax_rate')) || 0;
  const discount = Number(watch('discount_amount')) || 0;
  const total = subtotal + subtotal * taxRate - discount;

  function onSubmit(values: InvoiceInput) {
    const invoicePayload = {
      truck_id: truckId,
      rental_company_id: values.rental_company_id || null,
      rental_agreement_id: values.rental_agreement_id || null,
      issue_date: values.issue_date,
      due_date: values.due_date,
      period_start: values.period_start || null,
      period_end: values.period_end || null,
      status: values.status,
      tax_rate: values.tax_rate,
      discount_amount: values.discount_amount,
      notes: values.notes || null,
      terms: values.terms || null,
    };

    const items = values.line_items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    if (isEdit && invoice) {
      update.mutate(
        { id: invoice.id, patch: invoicePayload, lineItems: items },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate(
        { invoice: invoicePayload, lineItems: items },
        { onSuccess: () => onOpenChange(false) },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${invoice?.invoice_number}` : 'New invoice'}</DialogTitle>
          <DialogDescription>
            Totals are calculated by the database from the line items — the numbers here are a live
            preview.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Bill to" htmlFor="rental_company_id">
              <NativeSelect
                id="rental_company_id"
                placeholder="Select a company"
                options={(companies.data ?? []).map((company) => ({
                  value: company.id,
                  label: company.name,
                }))}
                {...register('rental_company_id')}
              />
            </FormField>
            <FormField label="Issue date" htmlFor="issue_date" required error={formState.errors.issue_date?.message}>
              <Input id="issue_date" type="date" {...register('issue_date')} />
            </FormField>
            <FormField label="Due date" htmlFor="due_date" required error={formState.errors.due_date?.message}>
              <Input id="due_date" type="date" {...register('due_date')} />
            </FormField>
            <FormField label="Service period start" htmlFor="period_start">
              <Input id="period_start" type="date" {...register('period_start')} />
            </FormField>
            <FormField label="Service period end" htmlFor="period_end">
              <Input id="period_end" type="date" {...register('period_end')} />
            </FormField>
            <FormField label="Status" htmlFor="status" required>
              <NativeSelect id="status" options={toOptions(INVOICE_STATUS_LABELS)} {...register('status')} />
            </FormField>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Line items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ description: '', quantity: 1, unit_price: 0 })}
              >
                <Plus />
                Add line
              </Button>
            </div>

            {formState.errors.line_items?.message ? (
              <p className="text-xs text-danger">{formState.errors.line_items.message}</p>
            ) : null}

            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_5rem_7rem_2.25rem]">
                  <Input
                    aria-label={`Line ${index + 1} description`}
                    placeholder="Monthly truck rental"
                    invalid={Boolean(formState.errors.line_items?.[index]?.description)}
                    {...register(`line_items.${index}.description` as const)}
                  />
                  <Input
                    aria-label={`Line ${index + 1} quantity`}
                    type="number"
                    step="0.01"
                    className="text-right font-mono"
                    {...register(`line_items.${index}.quantity` as const)}
                  />
                  <Input
                    aria-label={`Line ${index + 1} unit price`}
                    type="number"
                    step="0.01"
                    className="text-right font-mono"
                    {...register(`line_items.${index}.unit_price` as const)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove line ${index + 1}`}
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Tax rate" htmlFor="tax_rate" hint="Decimal, e.g. 0.0825 for 8.25%.">
              <Input id="tax_rate" type="number" step="0.0001" {...register('tax_rate')} />
            </FormField>
            <FormField label="Discount" htmlFor="discount_amount">
              <Input id="discount_amount" type="number" step="0.01" {...register('discount_amount')} />
            </FormField>
            <div className="rounded-lg border border-border bg-surface-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="font-mono tabular-nums">{formatCurrency(subtotal * taxRate)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-border pt-1 font-medium">
                <span>Total</span>
                <span className="font-mono tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Notes" htmlFor="notes">
              <Textarea id="notes" rows={2} {...register('notes')} />
            </FormField>
            <FormField label="Terms" htmlFor="terms">
              <Textarea id="terms" rows={2} {...register('terms')} />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {isEdit ? 'Save invoice' : 'Create invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDefaults(
  invoice?: InvoiceDetail | null,
  agreement?: RentalAgreement | null,
): InvoiceInput {
  const today = new Date();
  const dueDefault = new Date(today);
  dueDefault.setDate(dueDefault.getDate() + 15);

  if (invoice) {
    return {
      rental_company_id: invoice.rental_company_id ?? '',
      rental_agreement_id: invoice.rental_agreement_id ?? '',
      issue_date: toDateInput(invoice.issue_date),
      due_date: toDateInput(invoice.due_date),
      period_start: toDateInput(invoice.period_start),
      period_end: toDateInput(invoice.period_end),
      status: invoice.status,
      tax_rate: Number(invoice.tax_rate),
      discount_amount: Number(invoice.discount_amount),
      notes: invoice.notes ?? '',
      terms: invoice.terms ?? '',
      line_items: (invoice.line_items ?? []).map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      })),
    } as InvoiceInput;
  }

  return {
    rental_company_id: agreement?.rental_company_id ?? '',
    rental_agreement_id: agreement?.id ?? '',
    issue_date: toDateInput(today),
    due_date: toDateInput(dueDefault),
    period_start: '',
    period_end: '',
    status: 'draft',
    tax_rate: 0,
    discount_amount: 0,
    notes: '',
    terms: '',
    line_items: [
      {
        description: 'Monthly truck rental',
        quantity: 1,
        unit_price: Number(agreement?.rate_amount ?? 0),
      },
    ],
  } as InvoiceInput;
}
