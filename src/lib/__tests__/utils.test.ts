import { describe, expect, it } from 'vitest';
import {
  clamp,
  cn,
  formatBytes,
  groupBy,
  hashHue,
  initials,
  percentChange,
  sumBy,
} from '../utils';

describe('cn', () => {
  it('merges class names and lets a later Tailwind utility win', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('drops falsy values', () => {
    const disabled = false;
    expect(cn('a', disabled && 'b', undefined, null, 'c')).toBe('a c');
  });
});

describe('sumBy', () => {
  it('sums a numeric projection, treating null/undefined as zero', () => {
    const rows = [{ amount: 10 }, { amount: null }, { amount: 5 }, { amount: undefined }];
    expect(sumBy(rows, (row) => row.amount)).toBe(15);
  });

  it('returns 0 for an empty list', () => {
    expect(sumBy([], () => 1)).toBe(0);
  });
});

describe('groupBy', () => {
  it('buckets items by a derived key', () => {
    const rows = [
      { category: 'fuel', amount: 1 },
      { category: 'repair', amount: 2 },
      { category: 'fuel', amount: 3 },
    ];
    const grouped = groupBy(rows, (row) => row.category);
    expect(grouped.fuel).toHaveLength(2);
    expect(grouped.repair).toHaveLength(1);
  });
});

describe('clamp', () => {
  it('bounds a value between min and max', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
  });
});

describe('percentChange', () => {
  it('computes signed percentage change', () => {
    expect(percentChange(110, 100)).toBeCloseTo(10);
    expect(percentChange(90, 100)).toBeCloseTo(-10);
  });

  it('guards against dividing by zero', () => {
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(50, 0)).toBeNull();
  });
});

describe('initials', () => {
  it('takes the first letter of up to two words', () => {
    expect(initials('Maria Lopez')).toBe('ML');
    expect(initials('Cher')).toBe('C');
  });

  it('placeholders a missing name', () => {
    expect(initials(null)).toBe('··');
    expect(initials(undefined)).toBe('··');
  });
});

describe('hashHue', () => {
  it('is deterministic and bounded to a hue circle', () => {
    const a = hashHue('Freightliner Cascadia');
    const b = hashHue('Freightliner Cascadia');
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(360);
  });
});

describe('formatBytes', () => {
  it('scales to the appropriate unit', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });
});
