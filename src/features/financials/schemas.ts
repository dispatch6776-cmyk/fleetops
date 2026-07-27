import { z } from 'zod';

const money = z.coerce.number().refine((value) => Number.isFinite(value), 'Enter an amount');

export const paymentSchema = z.object({
  payment_date: z.string().min(1, 'Choose a date'),
  amount: money.refine((value) => value !== 0, 'Amount cannot be zero'),
  type: z.enum([
    'rent_monthly',
    'rent_weekly',
    'rent_daily',
    'deposit',
    'deposit_refund',
    'late_fee',
    'damage_fee',
    'mileage_overage',
    'reimbursement',
    'custom',
  ]),
  method: z.enum(['cash', 'check', 'ach', 'wire', 'card', 'zelle', 'other']),
  reference: z.string().max(80).optional().or(z.literal('')),
  invoice_id: z.string().uuid().optional().or(z.literal('')),
  period_start: z.string().optional().or(z.literal('')),
  period_end: z.string().optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

export const expenseSchema = z.object({
  expense_date: z.string().min(1, 'Choose a date'),
  amount: money.refine((value) => value >= 0, 'Amount cannot be negative'),
  category: z.enum([
    'maintenance', 'repair', 'tires', 'fuel', 'def', 'insurance', 'registration',
    'permits', 'ifta', 'tolls', 'parking', 'taxes', 'loan_payment', 'lease_payment',
    'accounting', 'roadside', 'towing', 'equipment', 'other',
  ]),
  vendor: z.string().max(120).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  method: z.enum(['cash', 'check', 'ach', 'wire', 'card', 'zelle', 'other']),
  reference: z.string().max(80).optional().or(z.literal('')),
  is_tax_deductible: z.boolean().default(true),
  is_recurring: z.boolean().default(false),
});

export const invoiceLineItemSchema = z.object({
  description: z.string().min(1, 'Describe the charge').max(200),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unit_price: z.coerce.number().min(0, 'Price cannot be negative'),
});

export const invoiceSchema = z.object({
  rental_company_id: z.string().uuid().optional().or(z.literal('')),
  rental_agreement_id: z.string().uuid().optional().or(z.literal('')),
  issue_date: z.string().min(1, 'Choose an issue date'),
  due_date: z.string().min(1, 'Choose a due date'),
  period_start: z.string().optional().or(z.literal('')),
  period_end: z.string().optional().or(z.literal('')),
  status: z.enum(['draft', 'sent', 'partial', 'paid', 'overdue', 'void']),
  tax_rate: z.coerce.number().min(0).max(1).default(0),
  discount_amount: z.coerce.number().min(0).default(0),
  notes: z.string().max(1000).optional().or(z.literal('')),
  terms: z.string().max(2000).optional().or(z.literal('')),
  line_items: z.array(invoiceLineItemSchema).min(1, 'Add at least one line item'),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoiceLineItemInput = z.infer<typeof invoiceLineItemSchema>;
