import type {
  ComplianceStatus,
  Invoice,
  MaintenanceRecord,
  MaintenanceSchedule,
} from '@/types';
import { MAINTENANCE_CATEGORY_LABELS } from '@/lib/constants';

export type CalendarEventKind =
  | 'work_order'
  | 'service_due'
  | 'payment_due'
  | 'insurance'
  | 'registration'
  | 'inspection'
  | 'ifta'
  | 'document';

export interface FleetCalendarEvent {
  id: string;
  title: string;
  start: string;
  allDay: true;
  kind: CalendarEventKind;
  href: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: { kind: CalendarEventKind; description: string; href: string };
}

const PALETTE: Record<CalendarEventKind, { bg: string; text: string }> = {
  work_order: { bg: 'hsl(var(--primary) / 0.16)', text: 'hsl(var(--primary))' },
  service_due: { bg: 'hsl(var(--warning) / 0.18)', text: 'hsl(var(--warning))' },
  payment_due: { bg: 'hsl(var(--success) / 0.18)', text: 'hsl(var(--success))' },
  insurance: { bg: 'hsl(var(--danger) / 0.16)', text: 'hsl(var(--danger))' },
  registration: { bg: 'hsl(var(--danger) / 0.16)', text: 'hsl(var(--danger))' },
  inspection: { bg: 'hsl(var(--info) / 0.18)', text: 'hsl(var(--info))' },
  ifta: { bg: 'hsl(var(--info) / 0.18)', text: 'hsl(var(--info))' },
  document: { bg: 'hsl(var(--muted))', text: 'hsl(var(--muted-foreground))' },
};

function makeEvent(
  id: string,
  title: string,
  start: string,
  kind: CalendarEventKind,
  description: string,
  href: string,
): FleetCalendarEvent {
  const palette = PALETTE[kind];
  return {
    id,
    title,
    start: start.slice(0, 10),
    allDay: true,
    kind,
    href,
    backgroundColor: palette.bg,
    borderColor: 'transparent',
    textColor: palette.text,
    extendedProps: { kind, description, href },
  };
}

/**
 * Folds every dated obligation — work orders, PM schedules, invoice due dates
 * and compliance expiries — into one event list for FullCalendar.
 */
export function buildCalendarEvents({
  maintenance,
  schedules,
  invoices,
  compliance,
}: {
  maintenance: MaintenanceRecord[];
  schedules: MaintenanceSchedule[];
  invoices: Invoice[];
  compliance: ComplianceStatus[];
}): FleetCalendarEvent[] {
  const events: FleetCalendarEvent[] = [];

  for (const record of maintenance) {
    const date = record.scheduled_for ?? record.service_date;
    if (!date) continue;
    events.push(
      makeEvent(
        `wo-${record.id}`,
        record.title,
        date,
        'work_order',
        `${MAINTENANCE_CATEGORY_LABELS[record.category]} · ${record.status.replace('_', ' ')}`,
        `/maintenance`,
      ),
    );
  }

  for (const schedule of schedules) {
    if (!schedule.next_due_date || !schedule.is_active) continue;
    events.push(
      makeEvent(
        `sched-${schedule.id}`,
        `Due: ${schedule.name}`,
        schedule.next_due_date,
        'service_due',
        'Preventive maintenance schedule',
        '/maintenance',
      ),
    );
  }

  for (const invoice of invoices) {
    if (invoice.status === 'paid' || invoice.status === 'void') continue;
    events.push(
      makeEvent(
        `inv-${invoice.id}`,
        `${invoice.invoice_number} due`,
        invoice.due_date,
        'payment_due',
        `Balance ${Number(invoice.balance).toFixed(2)}`,
        '/invoices',
      ),
    );
  }

  for (const item of compliance) {
    const kind: CalendarEventKind = item.item.startsWith('document:')
      ? 'document'
      : item.item === 'insurance'
        ? 'insurance'
        : item.item === 'registration'
          ? 'registration'
          : item.item === 'dot_inspection'
            ? 'inspection'
            : 'ifta';

    const label = item.item.startsWith('document:')
      ? `Document expires: ${item.reference ?? ''}`
      : `${item.item.replace('_', ' ')} expires`;

    events.push(
      makeEvent(
        `comp-${item.item}-${item.expires_on}`,
        label,
        item.expires_on,
        kind,
        item.reference ?? '',
        item.item.startsWith('document:') ? '/documents' : '/truck',
      ),
    );
  }

  return events;
}

export const EVENT_LEGEND: { kind: CalendarEventKind; label: string }[] = [
  { kind: 'work_order', label: 'Work orders' },
  { kind: 'service_due', label: 'Services due' },
  { kind: 'payment_due', label: 'Payments due' },
  { kind: 'insurance', label: 'Insurance' },
  { kind: 'registration', label: 'Registration' },
  { kind: 'inspection', label: 'DOT inspection' },
  { kind: 'ifta', label: 'IFTA' },
  { kind: 'document', label: 'Documents' },
];

export const EVENT_COLORS = PALETTE;
