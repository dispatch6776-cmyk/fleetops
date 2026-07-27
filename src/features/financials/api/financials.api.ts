import { requireSupabase } from '@/lib/supabase';
import type {
  Expense,
  Invoice,
  InvoiceDetail,
  InvoiceLineItem,
  Payment,
  RentalAgreement,
  RentalCompany,
  TablesInsert,
  TablesUpdate,
} from '@/types';

export interface DateRangeFilter {
  from?: string;
  to?: string;
}

// ---------------------------------------------------------------------------
// Payments (income)
// ---------------------------------------------------------------------------
export async function listPayments(truckId: string, range?: DateRangeFilter): Promise<Payment[]> {
  const supabase = requireSupabase();
  let query = supabase
    .from('payments')
    .select('*')
    .eq('truck_id', truckId)
    .order('payment_date', { ascending: false });

  if (range?.from) query = query.gte('payment_date', range.from);
  if (range?.to) query = query.lte('payment_date', range.to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createPayment(payload: TablesInsert<'payments'>): Promise<Payment> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('payments').insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePayment(id: string, patch: TablesUpdate<'payments'>): Promise<Payment> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('payments').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deletePayment(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------
export async function listExpenses(truckId: string, range?: DateRangeFilter): Promise<Expense[]> {
  const supabase = requireSupabase();
  let query = supabase
    .from('expenses')
    .select('*')
    .eq('truck_id', truckId)
    .order('expense_date', { ascending: false });

  if (range?.from) query = query.gte('expense_date', range.from);
  if (range?.to) query = query.lte('expense_date', range.to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createExpense(payload: TablesInsert<'expenses'>): Promise<Expense> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('expenses').insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateExpense(id: string, patch: TablesUpdate<'expenses'>): Promise<Expense> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('expenses').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------
export async function listInvoices(truckId: string): Promise<Invoice[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('truck_id', truckId)
    .order('issue_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getInvoice(id: string): Promise<InvoiceDetail> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('invoices')
    .select('*, line_items:invoice_line_items(*), payments:payments(*), rental_company:rental_companies(*)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);

  const invoice = data as unknown as InvoiceDetail;
  invoice.line_items = [...(invoice.line_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return invoice;
}

export interface InvoiceDraft {
  invoice: TablesInsert<'invoices'>;
  lineItems: Omit<TablesInsert<'invoice_line_items'>, 'invoice_id'>[];
}

/**
 * Creates an invoice and its line items. Totals are computed by the database
 * trigger, so the client never has to keep the maths in sync.
 */
export async function createInvoice({ invoice, lineItems }: InvoiceDraft): Promise<Invoice> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('invoices').insert(invoice).select().single();
  if (error) throw new Error(error.message);

  if (lineItems.length > 0) {
    const { error: itemsError } = await supabase.from('invoice_line_items').insert(
      lineItems.map((item, index) => ({ ...item, invoice_id: data.id, sort_order: index })),
    );
    if (itemsError) throw new Error(itemsError.message);
  }

  return data;
}

export async function updateInvoice(id: string, patch: TablesUpdate<'invoices'>): Promise<Invoice> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('invoices').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function replaceLineItems(
  invoiceId: string,
  lineItems: Omit<TablesInsert<'invoice_line_items'>, 'invoice_id'>[],
): Promise<InvoiceLineItem[]> {
  const supabase = requireSupabase();
  const { error: deleteError } = await supabase
    .from('invoice_line_items')
    .delete()
    .eq('invoice_id', invoiceId);
  if (deleteError) throw new Error(deleteError.message);

  if (lineItems.length === 0) return [];

  const { data, error } = await supabase
    .from('invoice_line_items')
    .insert(lineItems.map((item, index) => ({ ...item, invoice_id: invoiceId, sort_order: index })))
    .select();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function deleteInvoice(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Rental agreements and companies
// ---------------------------------------------------------------------------
export async function listRentalAgreements(truckId: string): Promise<RentalAgreement[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('rental_agreements')
    .select('*')
    .eq('truck_id', truckId)
    .order('start_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listRentalCompanies(): Promise<RentalCompany[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('rental_companies')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createRentalAgreement(
  payload: TablesInsert<'rental_agreements'>,
): Promise<RentalAgreement> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('rental_agreements').insert(payload).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateRentalAgreement(
  id: string,
  patch: TablesUpdate<'rental_agreements'>,
): Promise<RentalAgreement> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('rental_agreements')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------------------------------------------------------
// Settings (company details used on invoices)
// ---------------------------------------------------------------------------
export async function getAppSettings() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('app_settings').select('*').limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
