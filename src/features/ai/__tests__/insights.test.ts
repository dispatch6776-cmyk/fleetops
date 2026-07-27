import { describe, expect, it } from 'vitest';
import {
  buildRecommendations,
  detectCostAnomalies,
  estimateProfit,
  predictMaintenance,
  summariseExpenses,
  summariseRental,
} from '../insights';
import {
  makeExpense,
  makeInsightInput,
  makeMaintenance,
  makeMaintenanceCost,
  makeMileageMonth,
  makeMonth,
  makePayment,
  makeUpcoming,
} from './fixtures';

describe('summariseExpenses', () => {
  it('ranks categories by spend and computes the share of total', () => {
    const input = makeInsightInput({
      expenses: [
        makeExpense({ category: 'fuel', amount: 600 }),
        makeExpense({ category: 'maintenance', amount: 300 }),
        makeExpense({ category: 'insurance', amount: 100 }),
      ],
    });

    const insight = summariseExpenses(input);

    expect(insight.headline).toBe('$1,000.00 spent across 3 categories');
    expect(insight.bullets?.[0]).toBe('Fuel: $600.00 (60% of spend)');
    expect(insight.bullets?.[1]).toBe('Maintenance: $300.00 (30% of spend)');
    expect(insight.detail).toContain('Not enough history');
    expect(insight.tone).toBe('neutral');
  });

  it('flags a rising trend as a warning', () => {
    const priorThree = [100, 100, 100].map((expenses, index) =>
      makeMonth({ month: `2026-0${index + 1}-01`, expenses }),
    );
    const recentThree = [200, 200, 200].map((expenses, index) =>
      makeMonth({ month: `2026-0${index + 4}-01`, expenses }),
    );

    const input = makeInsightInput({
      expenses: [makeExpense({ amount: 100 })],
      months: [...priorThree, ...recentThree],
    });

    const insight = summariseExpenses(input);

    expect(insight.tone).toBe('warning');
    expect(insight.detail).toContain('up 100.0%');
  });
});

describe('predictMaintenance', () => {
  it('projects cost from category history and dates mileage-based intervals', () => {
    const input = makeInsightInput({
      upcoming: [
        makeUpcoming({
          name: 'Timing belt',
          category: 'engine',
          urgency: 'overdue',
          miles_remaining: -100,
        }),
        makeUpcoming({
          name: 'Oil change',
          category: 'oil_change',
          urgency: 'due_soon',
          miles_remaining: 1500,
        }),
      ],
      maintenanceCosts: [
        makeMaintenanceCost({ category: 'engine', average_cost: 800 }),
        makeMaintenanceCost({ category: 'oil_change', average_cost: 150 }),
      ],
      mileage: Array.from({ length: 6 }, () => makeMileageMonth({ miles_driven: 3000 })),
    });

    const insight = predictMaintenance(input);

    expect(insight.headline).toBe('2 services due, ≈$950.00');
    expect(insight.tone).toBe('critical');
    expect(insight.bullets?.[0]).toBe('Timing belt — overdue now, historically $800.00');
    expect(insight.bullets?.[1]).toBe('Oil change — about 2 weeks away, historically $150.00');
  });

  it('is calm when nothing is due', () => {
    const insight = predictMaintenance(makeInsightInput());
    expect(insight.headline).toBe('Nothing due in the alert window');
    expect(insight.tone).toBe('positive');
  });
});

describe('estimateProfit', () => {
  it('declines to project with fewer than two complete months', () => {
    const insight = estimateProfit(makeInsightInput({ months: [makeMonth()] }));
    expect(insight.headline).toBe('Not enough history yet');
    expect(insight.tone).toBe('neutral');
  });

  it('projects forward from a linear trend over the trailing six months', () => {
    // Seven months of data: the trailing six (index 0-5) trend up by 100/mo,
    // the seventh (index 6) is the open, incomplete month and is excluded.
    const months = Array.from({ length: 7 }, (_, index) =>
      makeMonth({ month: `2026-${String(index + 1).padStart(2, '0')}-01`, profit: 1000 + index * 100 }),
    );

    const insight = estimateProfit(makeInsightInput({ months }));

    expect(insight.headline).toBe('$1,400.00 expected next month');
    expect(insight.tone).toBe('positive');
    expect(insight.bullets).toContain('Six-month average profit: $1,250.00');
    expect(insight.bullets).toContain('Best month: $1,500.00');
    expect(insight.bullets).toContain('Worst month: $1,000.00');
  });
});

describe('detectCostAnomalies', () => {
  it('flags work orders more than 2 standard deviations above their category average', () => {
    const input = makeInsightInput({
      maintenanceCosts: [
        makeMaintenanceCost({ category: 'engine', average_cost: 500, stddev_cost: 50, service_count: 5 }),
      ],
      maintenance: [
        makeMaintenance({
          category: 'engine',
          type: 'repair',
          title: 'Turbo replace',
          cost_total: 700,
          service_date: '2026-03-01',
        }),
        makeMaintenance({
          category: 'engine',
          type: 'repair',
          title: 'Turbo replace again',
          cost_total: 520,
          service_date: '2026-02-01',
        }),
      ],
    });

    const insight = detectCostAnomalies(input);

    expect(insight.tone).toBe('warning');
    expect(insight.bullets).toContain(
      'Turbo replace on Mar 1, 2026 cost $700.00 against a $500.00 average.',
    );
    expect(insight.bullets).toContain(
      'Engine repaired twice within 28 days — check for an underlying fault.',
    );
  });

  it('reports a clean bill of health when nothing is out of range', () => {
    const insight = detectCostAnomalies(makeInsightInput());
    expect(insight.headline).toBe('No outliers detected');
    expect(insight.tone).toBe('positive');
  });
});

describe('summariseRental', () => {
  it('has nothing to report before the first payment', () => {
    const insight = summariseRental(makeInsightInput());
    expect(insight.headline).toBe('No rent recorded yet');
    expect(insight.tone).toBe('neutral');
  });

  it('computes on-time rate and separates rent from deposits/fees', () => {
    const input = makeInsightInput({
      payments: [
        makePayment({ type: 'rent_monthly', amount: 1000, is_late: false, payment_date: '2026-01-01' }),
        makePayment({ type: 'rent_monthly', amount: 1000, is_late: true, payment_date: '2026-02-01' }),
        makePayment({ type: 'rent_monthly', amount: 1000, is_late: false, payment_date: '2026-03-01' }),
        makePayment({ type: 'deposit', amount: 500, is_late: false, payment_date: '2026-01-01' }),
      ],
    });

    const insight = summariseRental(input);

    expect(insight.headline).toBe('$3,000.00 collected across 3 payments');
    expect(insight.detail).toContain('67% of payments arrived on time');
    expect(insight.tone).toBe('warning');
    expect(insight.bullets).toContain('Deposits and fees: $500.00');
  });
});

describe('buildRecommendations', () => {
  it('leads with overdue services and marks the tone critical', () => {
    const input = makeInsightInput({
      upcoming: [makeUpcoming({ name: 'Brake service', urgency: 'overdue' })],
    });

    const insight = buildRecommendations(input);

    expect(insight.tone).toBe('critical');
    expect(insight.bullets?.[0]).toContain('Book Brake service now');
  });

  it('falls back to a calm default with no signal', () => {
    const insight = buildRecommendations(makeInsightInput());
    expect(insight.tone).toBe('neutral');
    expect(insight.bullets).toContain('Nothing urgent. Keep logging mileage weekly so forecasts stay accurate.');
  });
});
