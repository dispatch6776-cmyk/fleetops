import { differenceInDays, parseISO } from 'date-fns';
import { formatCurrency, formatDate, formatNumber } from '@/lib/format';
import { EXPENSE_CATEGORY_LABELS, MAINTENANCE_CATEGORY_LABELS } from '@/lib/constants';
import type {
  Expense,
  MaintenanceCategory,
  MaintenanceCostByCategory,
  MaintenanceRecord,
  MonthlyFinancials,
  MonthlyMileage,
  Payment,
  UpcomingService,
} from '@/types';

export type InsightTone = 'positive' | 'neutral' | 'warning' | 'critical';

export interface Insight {
  id: string;
  title: string;
  headline: string;
  detail: string;
  tone: InsightTone;
  bullets?: string[];
}

/** Least-squares slope of a series — used for trend direction. */
function slope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let denominator = 0;
  values.forEach((value, index) => {
    numerator += (index - meanX) * (value - meanY);
    denominator += (index - meanX) ** 2;
  });
  return denominator === 0 ? 0 : numerator / denominator;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export interface InsightInput {
  months: MonthlyFinancials[];
  expenses: Expense[];
  payments: Payment[];
  maintenance: MaintenanceRecord[];
  maintenanceCosts: MaintenanceCostByCategory[];
  upcoming: UpcomingService[];
  mileage: MonthlyMileage[];
  odometer: number;
}

/** Where the money went, and what changed. */
export function summariseExpenses(input: InsightInput): Insight {
  const byCategory = new Map<string, number>();
  for (const expense of input.expenses) {
    const label = EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category;
    byCategory.set(label, (byCategory.get(label) ?? 0) + Number(expense.amount));
  }

  const ranked = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const total = ranked.reduce((sum, [, value]) => sum + value, 0);
  const recent = input.months.slice(-3);
  const previous = input.months.slice(-6, -3);
  const recentAvg = mean(recent.map((row) => Number(row.expenses)));
  const previousAvg = mean(previous.map((row) => Number(row.expenses)));
  const change = previousAvg ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

  return {
    id: 'expense-summary',
    title: 'Expense summary',
    headline: `${formatCurrency(total)} spent across ${ranked.length} categories`,
    detail:
      previousAvg === 0
        ? 'Not enough history yet to compare periods.'
        : `Your last three months average ${formatCurrency(recentAvg)} per month, ${
            change >= 0 ? 'up' : 'down'
          } ${Math.abs(change).toFixed(1)}% on the three months before.`,
    tone: change > 20 ? 'warning' : change < -10 ? 'positive' : 'neutral',
    bullets: ranked
      .slice(0, 5)
      .map(
        ([label, value]) =>
          `${label}: ${formatCurrency(value)} (${total ? Math.round((value / total) * 100) : 0}% of spend)`,
      ),
  };
}

/** What is coming due, and what history says it will cost. */
export function predictMaintenance(input: InsightInput): Insight {
  const dueSoon = input.upcoming.filter((service) => service.urgency !== 'scheduled');
  const costLookup = new Map(
    input.maintenanceCosts.map((row) => [row.category, Number(row.average_cost)]),
  );

  const projected = dueSoon.reduce(
    (sum, service) => sum + (costLookup.get(service.category) ?? Number(service.estimated_cost ?? 0)),
    0,
  );

  // Average miles per month over the last six months, used to date the next service.
  const recentMiles = input.mileage.slice(-6).map((row) => Number(row.miles_driven));
  const milesPerMonth = mean(recentMiles.filter((value) => value > 0));

  const bullets = dueSoon.slice(0, 5).map((service) => {
    const cost = costLookup.get(service.category) ?? Number(service.estimated_cost ?? 0);
    if (service.miles_remaining != null && milesPerMonth > 0) {
      const monthsAway = service.miles_remaining / milesPerMonth;
      const when =
        service.miles_remaining <= 0
          ? 'overdue now'
          : monthsAway < 1
            ? `about ${Math.max(1, Math.round(monthsAway * 4))} weeks away`
            : `about ${monthsAway.toFixed(1)} months away`;
      return `${service.name} — ${when}, historically ${formatCurrency(cost)}`;
    }
    return `${service.name} — ${
      service.next_due_date ? formatDate(service.next_due_date) : 'no date set'
    }, historically ${formatCurrency(cost)}`;
  });

  return {
    id: 'maintenance-forecast',
    title: 'Maintenance forecast',
    headline:
      dueSoon.length === 0
        ? 'Nothing due in the alert window'
        : `${dueSoon.length} service${dueSoon.length > 1 ? 's' : ''} due, ≈${formatCurrency(projected)}`,
    detail:
      milesPerMonth > 0
        ? `At the current rate of ${formatNumber(Math.round(milesPerMonth))} miles per month, mileage-based intervals arrive on the timeline below.`
        : 'Log mileage regularly to convert mileage intervals into dates.',
    tone: dueSoon.some((service) => service.urgency === 'overdue')
      ? 'critical'
      : dueSoon.length > 0
        ? 'warning'
        : 'positive',
    bullets,
  };
}

/** Trailing-average profit projection with trend adjustment. */
export function estimateProfit(input: InsightInput): Insight {
  const closed = input.months.slice(0, -1).slice(-6);
  if (closed.length < 2) {
    return {
      id: 'profit-estimate',
      title: 'Profit estimate',
      headline: 'Not enough history yet',
      detail: 'Two or more complete months are needed before a projection is meaningful.',
      tone: 'neutral',
    };
  }

  const profits = closed.map((row) => Number(row.profit));
  const average = mean(profits);
  const trend = slope(profits);
  const projection = average + trend * 1.5;
  const incomeAvg = mean(closed.map((row) => Number(row.income)));
  const expenseAvg = mean(closed.map((row) => Number(row.expenses)));

  return {
    id: 'profit-estimate',
    title: 'Profit estimate',
    headline: `${formatCurrency(projection)} expected next month`,
    detail: `Based on the last ${closed.length} complete months: income averaging ${formatCurrency(
      incomeAvg,
    )} against ${formatCurrency(expenseAvg)} of costs, with a ${
      trend >= 0 ? 'rising' : 'falling'
    } trend of ${formatCurrency(Math.abs(trend))} per month.`,
    tone: projection > 0 ? (trend >= 0 ? 'positive' : 'neutral') : 'critical',
    bullets: [
      `Six-month average profit: ${formatCurrency(average)}`,
      `Best month: ${formatCurrency(Math.max(...profits))}`,
      `Worst month: ${formatCurrency(Math.min(...profits))}`,
    ],
  };
}

/** Flags work orders more than two standard deviations above their category norm. */
export function detectCostAnomalies(input: InsightInput): Insight {
  const stats = new Map(
    input.maintenanceCosts.map((row) => [
      row.category,
      { avg: Number(row.average_cost), sd: Number(row.stddev_cost ?? 0), count: Number(row.service_count) },
    ]),
  );

  const outliers = input.maintenance
    .filter((record) => record.status === 'completed' && !record.is_warranty)
    .map((record) => {
      const stat = stats.get(record.category);
      if (!stat || stat.count < 3 || stat.sd === 0) return null;
      const z = (Number(record.cost_total) - stat.avg) / stat.sd;
      return z >= 2 ? { record, z, avg: stat.avg } : null;
    })
    .filter((item): item is { record: MaintenanceRecord; z: number; avg: number } => item !== null)
    .sort((a, b) => b.z - a.z)
    .slice(0, 5);

  // Repeat repairs in the same category within 120 days are worth a look too.
  const repeats: string[] = [];
  const byCategory = new Map<MaintenanceCategory, MaintenanceRecord[]>();
  for (const record of input.maintenance.filter((item) => item.type === 'repair')) {
    const list = byCategory.get(record.category) ?? [];
    list.push(record);
    byCategory.set(record.category, list);
  }
  for (const [category, list] of byCategory) {
    const sorted = [...list].sort((a, b) => b.service_date.localeCompare(a.service_date));
    for (let index = 0; index < sorted.length - 1; index += 1) {
      const gap = differenceInDays(
        parseISO(sorted[index].service_date),
        parseISO(sorted[index + 1].service_date),
      );
      if (gap <= 120) {
        repeats.push(
          `${MAINTENANCE_CATEGORY_LABELS[category]} repaired twice within ${gap} days — check for an underlying fault.`,
        );
        break;
      }
    }
  }

  const bullets = [
    ...outliers.map(
      (item) =>
        `${item.record.title} on ${formatDate(item.record.service_date)} cost ${formatCurrency(
          item.record.cost_total,
        )} against a ${formatCurrency(item.avg)} average.`,
    ),
    ...repeats.slice(0, 3),
  ];

  return {
    id: 'cost-anomalies',
    title: 'Unusual costs',
    headline: bullets.length === 0 ? 'No outliers detected' : `${bullets.length} item${bullets.length > 1 ? 's' : ''} to review`,
    detail:
      bullets.length === 0
        ? 'Every completed work order sits within two standard deviations of its category average.'
        : 'These entries are well above their category norm or repeat unusually quickly.',
    tone: bullets.length === 0 ? 'positive' : 'warning',
    bullets,
  };
}

/** Rent collection reliability. */
export function summariseRental(input: InsightInput): Insight {
  const rent = input.payments.filter((payment) => payment.type.startsWith('rent'));
  if (rent.length === 0) {
    return {
      id: 'rental-summary',
      title: 'Rental history',
      headline: 'No rent recorded yet',
      detail: 'Record payments to track collection reliability.',
      tone: 'neutral',
    };
  }

  const total = rent.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const late = rent.filter((payment) => payment.is_late).length;
  const onTimeRate = ((rent.length - late) / rent.length) * 100;
  const first = rent.reduce(
    (earliest, payment) => (payment.payment_date < earliest ? payment.payment_date : earliest),
    rent[0].payment_date,
  );

  return {
    id: 'rental-summary',
    title: 'Rental history',
    headline: `${formatCurrency(total)} collected across ${rent.length} payments`,
    detail: `Renting since ${formatDate(first)}. ${onTimeRate.toFixed(0)}% of payments arrived on time${
      late > 0 ? `, with ${late} late.` : '.'
    }`,
    tone: onTimeRate >= 90 ? 'positive' : onTimeRate >= 75 ? 'neutral' : 'warning',
    bullets: [
      `Average payment: ${formatCurrency(total / rent.length)}`,
      `Late payments: ${late}`,
      `Deposits and fees: ${formatCurrency(
        input.payments
          .filter((payment) => !payment.type.startsWith('rent'))
          .reduce((sum, payment) => sum + Number(payment.amount), 0),
      )}`,
    ],
  };
}

/** Actionable recommendations derived from the other insights. */
export function buildRecommendations(input: InsightInput): Insight {
  const bullets: string[] = [];

  const overdue = input.upcoming.filter((service) => service.urgency === 'overdue');
  if (overdue.length) {
    bullets.push(
      `Book ${overdue.map((service) => service.name).join(', ')} now — overdue services raise breakdown and CSA risk.`,
    );
  }

  const cpm = input.months.slice(-3).map((row) => Number(row.cost_per_mile ?? 0)).filter(Boolean);
  if (cpm.length >= 2 && slope(cpm) > 0.01) {
    bullets.push(
      `Cost per mile is trending up (${cpm.at(-1)?.toFixed(3)} vs ${cpm[0].toFixed(3)}). Review fuel economy and repair frequency.`,
    );
  }

  const fuelMonths = input.mileage.slice(-3).map((row) => Number(row.avg_mpg ?? 0)).filter(Boolean);
  if (fuelMonths.length >= 2 && fuelMonths.at(-1)! < fuelMonths[0] * 0.92) {
    bullets.push(
      `Fuel economy dropped from ${fuelMonths[0].toFixed(2)} to ${fuelMonths.at(-1)!.toFixed(2)} MPG — check tyre pressure, air filter and DPF status.`,
    );
  }

  const margins = input.months.slice(-3).map((row) => Number(row.margin_percent ?? 0));
  if (margins.length && mean(margins) < 25) {
    bullets.push(
      `Margin is averaging ${mean(margins).toFixed(1)}%. Consider revisiting the rental rate at renewal or trimming recurring costs.`,
    );
  }

  const uninsured = input.months.length > 0 && input.expenses.every((expense) => expense.category !== 'insurance');
  if (uninsured) {
    bullets.push('No insurance expense recorded — confirm the premium is being captured for tax purposes.');
  }

  if (bullets.length === 0) {
    bullets.push('Nothing urgent. Keep logging mileage weekly so forecasts stay accurate.');
  }

  return {
    id: 'recommendations',
    title: 'Recommendations',
    headline: `${bullets.length} suggestion${bullets.length > 1 ? 's' : ''}`,
    detail: 'Generated from your maintenance schedules, cost trends and fuel economy.',
    tone: overdue.length ? 'critical' : 'neutral',
    bullets,
  };
}

export function buildAllInsights(input: InsightInput): Insight[] {
  return [
    estimateProfit(input),
    predictMaintenance(input),
    summariseExpenses(input),
    detectCostAnomalies(input),
    summariseRental(input),
    buildRecommendations(input),
  ];
}

/** Compact, privacy-conscious context sent to the language model. */
export function buildModelContext(input: InsightInput) {
  return {
    odometer: input.odometer,
    months: input.months.slice(-12).map((row) => ({
      month: row.month,
      income: Number(row.income),
      expenses: Number(row.expenses),
      profit: Number(row.profit),
      miles: Number(row.miles_driven),
      costPerMile: row.cost_per_mile ? Number(row.cost_per_mile) : null,
    })),
    expenseTotalsByCategory: Object.fromEntries(
      Object.entries(
        input.expenses.reduce<Record<string, number>>((acc, expense) => {
          acc[expense.category] = (acc[expense.category] ?? 0) + Number(expense.amount);
          return acc;
        }, {}),
      ),
    ),
    maintenance: input.maintenance.slice(0, 40).map((record) => ({
      date: record.service_date,
      title: record.title,
      category: record.category,
      status: record.status,
      cost: Number(record.cost_total),
      odometer: record.odometer,
    })),
    upcoming: input.upcoming.map((service) => ({
      name: service.name,
      category: service.category,
      urgency: service.urgency,
      milesRemaining: service.miles_remaining,
      daysRemaining: service.days_remaining,
    })),
    fuelEconomy: input.mileage.slice(-12).map((row) => ({ month: row.month, mpg: row.avg_mpg })),
  };
}
