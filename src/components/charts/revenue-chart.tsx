import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import type { MonthlyFinancials } from '@/types';
import { AXIS_STYLE, ChartFrame, ChartTooltip, GRID_STYLE, TooltipRow } from './chart-primitives';

interface Payload {
  active?: boolean;
  label?: string;
  payload?: { name: string; value: number; color: string; dataKey: string }[];
}

function CustomTooltip({ active, label, payload }: Payload) {
  if (!active || !payload?.length) return null;
  return (
    <ChartTooltip label={label ? format(parseISO(`${label}-01`), 'MMMM yyyy') : undefined}>
      {payload.map((entry) => (
        <TooltipRow
          key={entry.dataKey}
          color={entry.color}
          name={entry.name}
          value={formatCurrency(entry.value)}
        />
      ))}
    </ChartTooltip>
  );
}

export function RevenueChart({
  data,
  height = 280,
}: {
  data: MonthlyFinancials[];
  height?: number;
}) {
  const series = data.map((row) => ({
    month: row.month.slice(0, 7),
    Income: Number(row.income),
    Expenses: Number(row.expenses),
    Profit: Number(row.profit),
  }));

  return (
    <ChartFrame height={height} isEmpty={series.length === 0}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="income-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="expense-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--danger))" stopOpacity={0.28} />
              <stop offset="100%" stopColor="hsl(var(--danger))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_STYLE} />
          <XAxis
            dataKey="month"
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: string) => format(parseISO(`${value}-01`), 'MMM')}
            minTickGap={12}
          />
          <YAxis
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value: number) => formatCurrencyCompact(value)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--border))' }} />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}
          />
          <Area
            type="monotone"
            dataKey="Income"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#income-fill)"
          />
          <Area
            type="monotone"
            dataKey="Expenses"
            stroke="hsl(var(--danger))"
            strokeWidth={2}
            fill="url(#expense-fill)"
          />
          <Area
            type="monotone"
            dataKey="Profit"
            stroke="hsl(var(--success))"
            strokeWidth={2}
            strokeDasharray="4 3"
            fill="transparent"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
