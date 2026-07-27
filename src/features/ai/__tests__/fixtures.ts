import type {
  Expense,
  MaintenanceCostByCategory,
  MaintenanceRecord,
  MonthlyFinancials,
  MonthlyMileage,
  Payment,
  UpcomingService,
} from '@/types';
import type { InsightInput } from '../insights';

let seq = 0;
function nextId() {
  seq += 1;
  return `fixture-${seq}`;
}

export function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: nextId(),
    truck_id: 'truck-1',
    expense_date: '2026-01-15',
    category: 'other',
    amount: 100,
    vendor: null,
    description: null,
    method: 'card',
    reference: null,
    is_tax_deductible: true,
    is_recurring: false,
    maintenance_id: null,
    fuel_log_id: null,
    document_id: null,
    recorded_by: null,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    ...overrides,
  };
}

export function makeMaintenance(overrides: Partial<MaintenanceRecord> = {}): MaintenanceRecord {
  return {
    id: nextId(),
    truck_id: 'truck-1',
    type: 'preventive',
    category: 'other',
    status: 'completed',
    title: 'Service',
    description: null,
    service_date: '2026-01-01',
    scheduled_for: null,
    completed_at: null,
    odometer: 100000,
    engine_hours: null,
    cost_parts: 0,
    cost_labor: 0,
    cost_tax: 0,
    cost_other: 0,
    cost_total: 0,
    is_warranty: false,
    warranty_expires_on: null,
    warranty_miles: null,
    shop_id: null,
    shop_name: null,
    shop_phone: null,
    mechanic_name: null,
    invoice_number: null,
    downtime_days: null,
    next_service_odometer: null,
    next_service_date: null,
    notes: null,
    created_by: null,
    updated_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: nextId(),
    truck_id: 'truck-1',
    rental_agreement_id: null,
    invoice_id: null,
    payment_date: '2026-01-01',
    amount: 1000,
    type: 'rent_monthly',
    method: 'ach',
    reference: null,
    period_start: null,
    period_end: null,
    is_late: false,
    notes: null,
    recorded_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

export function makeMonth(overrides: Partial<MonthlyFinancials> = {}): MonthlyFinancials {
  return {
    truck_id: 'truck-1',
    month: '2026-01-01',
    income: 3000,
    rent_income: 3000,
    late_fees: 0,
    expenses: 1500,
    maintenance_expenses: 500,
    fuel_expenses: 800,
    insurance_expenses: 200,
    compliance_expenses: 0,
    tax_expenses: 0,
    profit: 1500,
    margin_percent: 50,
    miles_driven: 8000,
    cost_per_mile: 0.19,
    ...overrides,
  };
}

export function makeMaintenanceCost(
  overrides: Partial<MaintenanceCostByCategory> = {},
): MaintenanceCostByCategory {
  return {
    truck_id: 'truck-1',
    category: 'other',
    service_count: 5,
    total_cost: 2500,
    average_cost: 500,
    stddev_cost: 50,
    max_cost: 600,
    first_service_on: '2025-01-01',
    last_service_on: '2026-01-01',
    ...overrides,
  };
}

export function makeUpcoming(overrides: Partial<UpcomingService> = {}): UpcomingService {
  return {
    id: nextId(),
    truck_id: 'truck-1',
    name: 'Oil change',
    category: 'oil_change',
    interval_type: 'miles',
    next_due_date: null,
    next_due_odometer: null,
    estimated_cost: 150,
    current_odometer: 100000,
    days_remaining: null,
    miles_remaining: 2000,
    urgency: 'due_soon',
    ...overrides,
  };
}

export function makeMileageMonth(overrides: Partial<MonthlyMileage> = {}): MonthlyMileage {
  return {
    truck_id: 'truck-1',
    month: '2026-01-01',
    miles_driven: 8000,
    avg_daily_miles: 260,
    ending_odometer: 100000,
    log_count: 4,
    avg_mpg: 6.5,
    gallons_purchased: 1230,
    ...overrides,
  };
}

export function makeInsightInput(overrides: Partial<InsightInput> = {}): InsightInput {
  return {
    months: [],
    expenses: [],
    payments: [],
    maintenance: [],
    maintenanceCosts: [],
    upcoming: [],
    mileage: [],
    odometer: 100000,
    ...overrides,
  };
}
