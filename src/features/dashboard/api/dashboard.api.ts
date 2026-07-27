import { requireSupabase } from '@/lib/supabase';
import type {
  AlertItem,
  ComplianceStatus,
  MaintenanceRecord,
  MonthlyFinancials,
  Payment,
  TruckKpis,
  UpcomingService,
} from '@/types';
import { daysUntil } from '@/lib/format';
import { MAINTENANCE_CATEGORY_LABELS } from '@/lib/constants';

export async function getTruckKpis(truckId: string): Promise<TruckKpis | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('v_truck_kpis')
    .select('*')
    .eq('truck_id', truckId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getMonthlyFinancials(
  truckId: string,
  months = 12,
): Promise<MonthlyFinancials[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('v_monthly_financials')
    .select('*')
    .eq('truck_id', truckId)
    .order('month', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).slice(-months);
}

export async function getExpenseBreakdown(truckId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('v_expense_by_category')
    .select('*')
    .eq('truck_id', truckId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getUpcomingServices(truckId: string): Promise<UpcomingService[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('v_upcoming_services')
    .select('*')
    .eq('truck_id', truckId);
  if (error) throw new Error(error.message);

  const rank = { overdue: 0, due_soon: 1, scheduled: 2 } as const;
  return (data ?? []).sort((a, b) => {
    const byUrgency = rank[a.urgency] - rank[b.urgency];
    if (byUrgency !== 0) return byUrgency;
    return (a.days_remaining ?? 9999) - (b.days_remaining ?? 9999);
  });
}

export async function getComplianceStatus(truckId: string): Promise<ComplianceStatus[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('v_compliance_status')
    .select('*')
    .eq('truck_id', truckId)
    .order('days_remaining', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface ActivityItem {
  id: string;
  kind: 'maintenance' | 'payment' | 'expense' | 'mileage';
  title: string;
  detail: string;
  amount: number | null;
  occurredAt: string;
  href: string;
}

/**
 * Recent activity is assembled client-side from the three tables the user is
 * allowed to read, so a maintenance user sees work orders without triggering a
 * denied query for payments.
 */
export async function getRecentActivity(
  truckId: string,
  options: { includeFinancial: boolean; limit?: number } = { includeFinancial: false },
): Promise<ActivityItem[]> {
  const supabase = requireSupabase();
  const limit = options.limit ?? 8;

  const maintenancePromise = supabase
    .from('maintenance_records')
    .select('id, title, category, status, service_date, cost_total, created_at')
    .eq('truck_id', truckId)
    .order('created_at', { ascending: false })
    .limit(limit);

  const paymentsPromise = options.includeFinancial
    ? supabase
        .from('payments')
        .select('id, amount, type, payment_date, reference, created_at')
        .eq('truck_id', truckId)
        .order('created_at', { ascending: false })
        .limit(limit)
    : Promise.resolve({ data: [] as Payment[], error: null });

  const mileagePromise = supabase
    .from('mileage_logs')
    .select('id, log_date, odometer, miles_driven, created_at')
    .eq('truck_id', truckId)
    .order('created_at', { ascending: false })
    .limit(limit);

  const [maintenance, payments, mileage] = await Promise.all([
    maintenancePromise,
    paymentsPromise,
    mileagePromise,
  ]);

  const items: ActivityItem[] = [];

  for (const record of (maintenance.data ?? []) as Pick<
    MaintenanceRecord,
    'id' | 'title' | 'category' | 'status' | 'service_date' | 'cost_total' | 'created_at'
  >[]) {
    items.push({
      id: `maintenance-${record.id}`,
      kind: 'maintenance',
      title: record.title,
      detail: `${MAINTENANCE_CATEGORY_LABELS[record.category]} · ${record.status.replace('_', ' ')}`,
      amount: options.includeFinancial ? record.cost_total : null,
      occurredAt: record.created_at,
      href: `/maintenance/${record.id}`,
    });
  }

  for (const payment of (payments.data ?? []) as Payment[]) {
    items.push({
      id: `payment-${payment.id}`,
      kind: 'payment',
      title: 'Payment received',
      detail: payment.reference ?? payment.type.replace(/_/g, ' '),
      amount: payment.amount,
      occurredAt: payment.created_at,
      href: '/financials',
    });
  }

  for (const log of (mileage.data ?? []) as {
    id: string;
    log_date: string;
    odometer: number;
    miles_driven: number | null;
    created_at: string;
  }[]) {
    items.push({
      id: `mileage-${log.id}`,
      kind: 'mileage',
      title: 'Odometer updated',
      detail: `${log.odometer.toLocaleString()} mi${
        log.miles_driven ? ` · +${log.miles_driven.toLocaleString()} since last reading` : ''
      }`,
      amount: null,
      occurredAt: log.created_at,
      href: '/mileage',
    });
  }

  return items
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);
}

const COMPLIANCE_LABELS: Record<string, string> = {
  insurance: 'Insurance policy',
  registration: 'Registration',
  dot_inspection: 'DOT inspection',
  ifta: 'IFTA licence',
};

/**
 * Turns compliance countdowns, service schedules and unpaid invoices into a
 * single prioritised alert list for the dashboard and the bell menu.
 */
export function buildAlerts({
  compliance,
  services,
  outstandingBalance,
  alertWindowDays = 30,
}: {
  compliance: ComplianceStatus[];
  services: UpcomingService[];
  outstandingBalance?: number | null;
  alertWindowDays?: number;
}): AlertItem[] {
  const alerts: AlertItem[] = [];

  for (const item of compliance) {
    if (item.days_remaining > alertWindowDays) continue;
    const label = item.item.startsWith('document:')
      ? `Document — ${item.reference ?? 'expiring'}`
      : (COMPLIANCE_LABELS[item.item] ?? item.item);
    alerts.push({
      id: `compliance-${item.item}-${item.expires_on}`,
      severity: item.days_remaining < 0 ? 'critical' : item.days_remaining <= 14 ? 'warning' : 'info',
      title: item.days_remaining < 0 ? `${label} expired` : `${label} expires soon`,
      description:
        item.days_remaining < 0
          ? `Expired ${Math.abs(item.days_remaining)} days ago${item.reference ? ` · ${item.reference}` : ''}`
          : `${item.days_remaining} days remaining${item.reference ? ` · ${item.reference}` : ''}`,
      dueDate: item.expires_on,
      href: item.item.startsWith('document:') ? '/documents' : '/truck',
      category: item.item.startsWith('document:') ? 'document' : 'compliance',
    });
  }

  for (const service of services) {
    if (service.urgency === 'scheduled') continue;
    const parts: string[] = [];
    if (service.days_remaining != null) {
      parts.push(
        service.days_remaining < 0
          ? `${Math.abs(service.days_remaining)} days overdue`
          : `due in ${service.days_remaining} days`,
      );
    }
    if (service.miles_remaining != null) {
      parts.push(
        service.miles_remaining < 0
          ? `${Math.abs(service.miles_remaining).toLocaleString()} mi past due`
          : `${service.miles_remaining.toLocaleString()} mi remaining`,
      );
    }
    alerts.push({
      id: `service-${service.id}`,
      severity: service.urgency === 'overdue' ? 'critical' : 'warning',
      title: service.urgency === 'overdue' ? `${service.name} is overdue` : `${service.name} due soon`,
      description: parts.join(' · ') || 'Scheduled preventive maintenance',
      dueDate: service.next_due_date,
      href: '/maintenance',
      category: 'maintenance',
    });
  }

  if (outstandingBalance && outstandingBalance > 0) {
    alerts.push({
      id: 'finance-outstanding',
      severity: 'warning',
      title: 'Outstanding balance',
      description: `${outstandingBalance.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })} is unpaid across open invoices`,
      dueDate: null,
      href: '/invoices',
      category: 'financial',
    });
  }

  const weight = { critical: 0, warning: 1, info: 2 } as const;
  return alerts.sort((a, b) => {
    const bySeverity = weight[a.severity] - weight[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return (daysUntil(a.dueDate) ?? 9999) - (daysUntil(b.dueDate) ?? 9999);
  });
}
