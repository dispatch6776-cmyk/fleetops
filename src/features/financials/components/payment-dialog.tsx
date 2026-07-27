import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { PAYMENT_METHOD_LABELS, PAYMENT_TYPE_LABELS, toOptions } from '@/lib/constants';
import { toDateInput } from '@/lib/format';
import { usePaymentMutations } from '../hooks';
import { paymentSchema, type PaymentInput } from '../schemas';
import type { Invoice, Payment } from '@/types';

export function PaymentDialog({
  truckId,
  rentalAgreementId,
  invoices,
  payment,
  open,
  onOpenChange,
}: {
  truckId: string;
  rentalAgreementId?: string | null;
  invoices: Invoice[];
  payment?: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { create, update } = usePaymentMutations(truckId);
  const isEdit = Boolean(payment);

  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: toDefaults(payment),
  });

  useEffect(() => {
    if (open) form.reset(toDefaults(payment));
  }, [open, payment, form]);

  const { register, handleSubmit, formState } = form;

  function onSubmit(values: PaymentInput) {
    const payload = {
      truck_id: truckId,
      rental_agreement_id: rentalAgreementId ?? null,
      payment_date: values.payment_date,
      amount: values.amount,
      type: values.type,
      method: values.method,
      reference: values.reference || null,
      invoice_id: values.invoice_id || null,
      period_start: values.period_start || null,
      period_end: values.period_end || null,
      notes: values.notes || null,
    };

    if (isEdit && payment) {
      update.mutate({ id: payment.id, patch: payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  const openInvoices = invoices.filter((invoice) =>
    ['sent', 'partial', 'overdue', 'draft'].includes(invoice.status),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit payment' : 'Record a payment'}</DialogTitle>
          <DialogDescription>
            Applying a payment to an invoice updates its balance and status automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Payment date" htmlFor="payment_date" required error={formState.errors.payment_date?.message}>
              <Input id="payment_date" type="date" {...register('payment_date')} />
            </FormField>
            <FormField label="Amount" htmlFor="amount" required error={formState.errors.amount?.message}>
              <Input id="amount" type="number" step="0.01" inputMode="decimal" {...register('amount')} />
            </FormField>
            <FormField label="Type" htmlFor="type" required>
              <NativeSelect id="type" options={toOptions(PAYMENT_TYPE_LABELS)} {...register('type')} />
            </FormField>
            <FormField label="Method" htmlFor="method" required>
              <NativeSelect id="method" options={toOptions(PAYMENT_METHOD_LABELS)} {...register('method')} />
            </FormField>
            <FormField label="Apply to invoice" htmlFor="invoice_id" hint="Optional — leave blank for ad-hoc payments.">
              <NativeSelect
                id="invoice_id"
                placeholder="No invoice"
                options={openInvoices.map((invoice) => ({
                  value: invoice.id,
                  label: `${invoice.invoice_number} · balance $${Number(invoice.balance).toFixed(2)}`,
                }))}
                {...register('invoice_id')}
              />
            </FormField>
            <FormField label="Reference" htmlFor="reference" hint="Check number, ACH trace, etc.">
              <Input id="reference" className="font-mono" {...register('reference')} />
            </FormField>
            <FormField label="Period start" htmlFor="period_start">
              <Input id="period_start" type="date" {...register('period_start')} />
            </FormField>
            <FormField label="Period end" htmlFor="period_end">
              <Input id="period_end" type="date" {...register('period_end')} />
            </FormField>
          </div>

          <FormField label="Notes" htmlFor="notes">
            <Textarea id="notes" rows={2} {...register('notes')} />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {isEdit ? 'Save payment' : 'Record payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDefaults(payment?: Payment | null): PaymentInput {
  return {
    payment_date: toDateInput(payment?.payment_date ?? new Date()),
    amount: payment?.amount ?? 0,
    type: payment?.type ?? 'rent_monthly',
    method: payment?.method ?? 'ach',
    reference: payment?.reference ?? '',
    invoice_id: payment?.invoice_id ?? '',
    period_start: toDateInput(payment?.period_start),
    period_end: toDateInput(payment?.period_end),
    notes: payment?.notes ?? '',
  } as PaymentInput;
}
