import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS, toOptions } from '@/lib/constants';
import { toDateInput } from '@/lib/format';
import { useExpenseMutations } from '../hooks';
import { expenseSchema, type ExpenseInput } from '../schemas';
import type { Expense } from '@/types';

export function ExpenseDialog({
  truckId,
  expense,
  open,
  onOpenChange,
}: {
  truckId: string;
  expense?: Expense | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { create, update } = useExpenseMutations(truckId);
  const isEdit = Boolean(expense);
  const isDerived = Boolean(expense?.maintenance_id || expense?.fuel_log_id);

  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: toDefaults(expense),
  });

  useEffect(() => {
    if (open) form.reset(toDefaults(expense));
  }, [open, expense, form]);

  const { register, handleSubmit, setValue, watch, formState } = form;

  function onSubmit(values: ExpenseInput) {
    const payload = {
      truck_id: truckId,
      expense_date: values.expense_date,
      amount: values.amount,
      category: values.category,
      vendor: values.vendor || null,
      description: values.description || null,
      method: values.method,
      reference: values.reference || null,
      is_tax_deductible: values.is_tax_deductible,
      is_recurring: values.is_recurring,
    };

    if (isEdit && expense) {
      update.mutate({ id: expense.id, patch: payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit expense' : 'Record an expense'}</DialogTitle>
          <DialogDescription>
            {isDerived
              ? 'This expense is generated from a work order or fuel log. Edit the source record to change the amount.'
              : 'Fuel and maintenance costs are added automatically — record everything else here.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Date" htmlFor="expense_date" required error={formState.errors.expense_date?.message}>
              <Input id="expense_date" type="date" disabled={isDerived} {...register('expense_date')} />
            </FormField>
            <FormField label="Amount" htmlFor="amount" required error={formState.errors.amount?.message}>
              <Input
                id="amount"
                type="number"
                step="0.01"
                inputMode="decimal"
                disabled={isDerived}
                {...register('amount')}
              />
            </FormField>
            <FormField label="Category" htmlFor="category" required>
              <NativeSelect
                id="category"
                options={toOptions(EXPENSE_CATEGORY_LABELS)}
                disabled={isDerived}
                {...register('category')}
              />
            </FormField>
            <FormField label="Payment method" htmlFor="method" required>
              <NativeSelect id="method" options={toOptions(PAYMENT_METHOD_LABELS)} {...register('method')} />
            </FormField>
            <FormField label="Vendor" htmlFor="vendor">
              <Input id="vendor" disabled={isDerived} {...register('vendor')} />
            </FormField>
            <FormField label="Reference" htmlFor="reference">
              <Input id="reference" className="font-mono" {...register('reference')} />
            </FormField>
          </div>

          <FormField label="Description" htmlFor="description">
            <Textarea id="description" rows={2} disabled={isDerived} {...register('description')} />
          </FormField>

          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_tax_deductible"
                checked={watch('is_tax_deductible')}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  setValue('is_tax_deductible', checked === true)
                }
              />
              <Label htmlFor="is_tax_deductible" className="text-sm font-normal">
                Tax deductible
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_recurring"
                checked={watch('is_recurring')}
                onCheckedChange={(checked: boolean | 'indeterminate') =>
                  setValue('is_recurring', checked === true)
                }
              />
              <Label htmlFor="is_recurring" className="text-sm font-normal">
                Recurring cost
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {isEdit ? 'Save expense' : 'Record expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDefaults(expense?: Expense | null): ExpenseInput {
  return {
    expense_date: toDateInput(expense?.expense_date ?? new Date()),
    amount: expense?.amount ?? 0,
    category: expense?.category ?? 'other',
    vendor: expense?.vendor ?? '',
    description: expense?.description ?? '',
    method: expense?.method ?? 'card',
    reference: expense?.reference ?? '',
    is_tax_deductible: expense?.is_tax_deductible ?? true,
    is_recurring: expense?.is_recurring ?? false,
  } as ExpenseInput;
}
