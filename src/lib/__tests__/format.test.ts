import { describe, expect, it, vi } from 'vitest';
import {
  daysUntil,
  formatCountdown,
  formatCurrency,
  formatDate,
  formatMpg,
  formatVin,
  toDateInput,
} from '../format';

describe('formatCurrency', () => {
  it('formats a positive amount as USD', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
  });

  it('treats null and undefined as zero', () => {
    expect(formatCurrency(null)).toBe('$0.00');
    expect(formatCurrency(undefined)).toBe('$0.00');
  });

  it('formats negative amounts with a leading minus', () => {
    expect(formatCurrency(-42)).toBe('-$42.00');
  });
});

describe('formatDate', () => {
  it('formats an ISO date string', () => {
    expect(formatDate('2026-03-15')).toBe('Mar 15, 2026');
  });

  it('returns an em dash placeholder for missing or invalid dates', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
  });
});

describe('formatMpg', () => {
  it('renders one decimal place with a unit suffix', () => {
    expect(formatMpg(6.834)).toBe('6.8 MPG');
  });

  it('placeholders when there is no reading', () => {
    expect(formatMpg(null)).toBe('—');
    expect(formatMpg(undefined)).toBe('—');
  });
});

describe('formatVin', () => {
  it('upper-cases and strips whitespace', () => {
    expect(formatVin(' 1fuja6cv 08lj12345 ')).toBe('1FUJA6CV08LJ12345');
  });

  it('handles a missing VIN', () => {
    expect(formatVin(null)).toBe('');
    expect(formatVin(undefined)).toBe('');
  });
});

describe('toDateInput', () => {
  it('produces yyyy-MM-dd for form inputs', () => {
    expect(toDateInput('2026-01-05T10:00:00Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns an empty string for an invalid value', () => {
    expect(toDateInput(null)).toBe('');
  });
});

describe('daysUntil / formatCountdown', () => {
  it('is null for a missing date', () => {
    expect(daysUntil(null)).toBeNull();
    expect(formatCountdown(null)).toBe('—');
  });

  it('labels today, tomorrow and overdue distinctly', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));

    expect(formatCountdown('2026-06-01')).toBe('Today');
    expect(formatCountdown('2026-06-02')).toBe('Tomorrow');
    expect(formatCountdown('2026-05-31')).toBe('1 day overdue');
    expect(formatCountdown('2026-05-20')).toBe('12 days overdue');
    expect(formatCountdown('2026-06-15')).toBe('in 14 days');

    vi.useRealTimers();
  });
});
