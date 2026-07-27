import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isValid,
  parseISO,
} from 'date-fns';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat('en-US');
const decimalFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
});

export const formatCurrency = (value: number | null | undefined) =>
  currencyFormatter.format(value ?? 0);

export const formatCurrencyCompact = (value: number | null | undefined) =>
  compactCurrencyFormatter.format(value ?? 0);

export const formatNumber = (value: number | null | undefined) => numberFormatter.format(value ?? 0);

export const formatDecimal = (value: number | null | undefined) =>
  decimalFormatter.format(value ?? 0);

export const formatMiles = (value: number | null | undefined) =>
  `${numberFormatter.format(Math.round(value ?? 0))} mi`;

export const formatPercent = (value: number | null | undefined, alreadyPercent = true) =>
  percentFormatter.format(alreadyPercent ? (value ?? 0) / 100 : (value ?? 0));

export const formatMpg = (value: number | null | undefined) =>
  value == null ? '—' : `${decimalFormatter.format(value)} MPG`;

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = typeof value === 'string' ? parseISO(value) : value;
  return isValid(date) ? date : null;
}

export function formatDate(value: string | Date | null | undefined, pattern = 'MMM d, yyyy') {
  const date = toDate(value);
  return date ? format(date, pattern) : '—';
}

export function formatDateTime(value: string | Date | null | undefined) {
  const date = toDate(value);
  return date ? format(date, "MMM d, yyyy 'at' h:mm a") : '—';
}

export function formatRelative(value: string | Date | null | undefined) {
  const date = toDate(value);
  return date ? `${formatDistanceToNowStrict(date)} ago` : '—';
}

/** Days until a date — negative when overdue. */
export function daysUntil(value: string | Date | null | undefined): number | null {
  const date = toDate(value);
  return date ? differenceInCalendarDays(date, new Date()) : null;
}

/** Short label such as “in 12 days”, “today”, “9 days overdue”. */
export function formatCountdown(value: string | Date | null | undefined): string {
  const days = daysUntil(value);
  if (days === null) return '—';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return '1 day overdue';
  if (days < 0) return `${Math.abs(days)} days overdue`;
  return `in ${days} days`;
}

/** Normalise a VIN for display (upper case, no spaces). */
export const formatVin = (vin: string | null | undefined) =>
  (vin ?? '').replace(/\s+/g, '').toUpperCase();

/** ISO date string (yyyy-MM-dd) for form inputs and Postgres `date` columns. */
export function toDateInput(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? format(date, 'yyyy-MM-dd') : '';
}
