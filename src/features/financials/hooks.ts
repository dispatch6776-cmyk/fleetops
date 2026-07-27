import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { queryKeys } from '@/app/query-client';
import { isSupabaseConfigured } from '@/lib/supabase';
import { usePermissions } from '@/hooks/use-permissions';
import type { TablesInsert, TablesUpdate } from '@/types';
import {
  createExpense,
  createInvoice,
  createPayment,
  deleteExpense,
  deleteInvoice,
  deletePayment,
  getAppSettings,
  getInvoice,
  listExpenses,
  listInvoices,
  listPayments,
  listRentalAgreements,
  listRentalCompanies,
  replaceLineItems,
  updateExpense,
  updateInvoice,
  updatePayment,
  type DateRangeFilter,
  type InvoiceDraft,
} from './api/financials.api';

export function usePayments(truckId: string | null, range?: DateRangeFilter) {
  const { canSeeMoney } = usePermissions();
  return useQuery({
    queryKey: queryKeys.payments(truckId ?? 'none', range),
    queryFn: () => listPayments(truckId as string, range),
    enabled: Boolean(truckId) && canSeeMoney && isSupabaseConfigured,
  });
}

export function useExpenses(truckId: string | null, range?: DateRangeFilter) {
  const { canSeeMoney } = usePermissions();
  return useQuery({
    queryKey: queryKeys.expenses(truckId ?? 'none', range),
    queryFn: () => listExpenses(truckId as string, range),
    enabled: Boolean(truckId) && canSeeMoney && isSupabaseConfigured,
  });
}

export function useInvoices(truckId: string | null) {
  const { canSeeMoney } = usePermissions();
  return useQuery({
    queryKey: queryKeys.invoices(truckId ?? 'none'),
    queryFn: () => listInvoices(truckId as string),
    enabled: Boolean(truckId) && canSeeMoney && isSupabaseConfigured,
  });
}

export function useInvoice(invoiceId: string | null) {
  return useQuery({
    queryKey: queryKeys.invoice(invoiceId ?? 'none'),
    queryFn: () => getInvoice(invoiceId as string),
    enabled: Boolean(invoiceId) && isSupabaseConfigured,
  });
}

export function useRentalAgreements(truckId: string | null) {
  const { canSeeMoney } = usePermissions();
  return useQuery({
    queryKey: queryKeys.rentals(truckId ?? 'none'),
    queryFn: () => listRentalAgreements(truckId as string),
    enabled: Boolean(truckId) && canSeeMoney && isSupabaseConfigured,
  });
}

export function useRentalCompanies() {
  const { canSeeMoney } = usePermissions();
  return useQuery({
    queryKey: ['rental-companies'] as const,
    queryFn: listRentalCompanies,
    enabled: canSeeMoney && isSupabaseConfigured,
    staleTime: 5 * 60_000,
  });
}

export function useAppSettings() {
  return useQuery({
    queryKey: queryKeys.settings(),
    queryFn: getAppSettings,
    enabled: isSupabaseConfigured,
    staleTime: 10 * 60_000,
  });
}

/** Invalidates everything that depends on money after a write. */
function useFinancialInvalidation(truckId: string | null) {
  const queryClient = useQueryClient();
  return () => {
    if (!truckId) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.payments(truckId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.expenses(truckId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.invoices(truckId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(truckId) });
  };
}

export function usePaymentMutations(truckId: string | null) {
  const invalidate = useFinancialInvalidation(truckId);

  const create = useMutation({
    mutationFn: (payload: TablesInsert<'payments'>) => createPayment(payload),
    onSuccess: () => {
      toast.success('Payment recorded');
      invalidate();
    },
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'payments'> }) =>
      updatePayment(id, patch),
    onSuccess: () => {
      toast.success('Payment updated');
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePayment(id),
    onSuccess: () => {
      toast.success('Payment deleted');
      invalidate();
    },
  });

  return { create, update, remove };
}

export function useExpenseMutations(truckId: string | null) {
  const invalidate = useFinancialInvalidation(truckId);

  const create = useMutation({
    mutationFn: (payload: TablesInsert<'expenses'>) => createExpense(payload),
    onSuccess: () => {
      toast.success('Expense recorded');
      invalidate();
    },
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'expenses'> }) =>
      updateExpense(id, patch),
    onSuccess: () => {
      toast.success('Expense updated');
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      toast.success('Expense deleted');
      invalidate();
    },
  });

  return { create, update, remove };
}

export function useInvoiceMutations(truckId: string | null) {
  const queryClient = useQueryClient();
  const invalidate = useFinancialInvalidation(truckId);

  const create = useMutation({
    mutationFn: (draft: InvoiceDraft) => createInvoice(draft),
    onSuccess: () => {
      toast.success('Invoice created');
      invalidate();
    },
  });

  const update = useMutation({
    mutationFn: ({
      id,
      patch,
      lineItems,
    }: {
      id: string;
      patch: TablesUpdate<'invoices'>;
      lineItems?: Omit<TablesInsert<'invoice_line_items'>, 'invoice_id'>[];
    }) =>
      updateInvoice(id, patch).then(async (invoice) => {
        if (lineItems) await replaceLineItems(id, lineItems);
        return invoice;
      }),
    onSuccess: (invoice) => {
      toast.success('Invoice updated');
      void queryClient.invalidateQueries({ queryKey: queryKeys.invoice(invoice.id) });
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteInvoice(id),
    onSuccess: () => {
      toast.success('Invoice deleted');
      invalidate();
    },
  });

  return { create, update, remove };
}
