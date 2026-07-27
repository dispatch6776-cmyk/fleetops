import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import { formatNumber } from '@/lib/format';
import type { MonthlyMileage } from '@/types';
import { AXIS_STYLE, ChartFrame, ChartTooltip, GRID_STYLE, TooltipRow } from './chart-primitives';

interface TooltipProps {
  active?: boolean;
  label?: string;
  payload?: { value: number; payload: { month: string; miles: number; mpg: number | null } }[];
}

function MileageTooltip({ active, label, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <ChartTooltip label={label ? format(parseISO(`${label}-01`), 'MMMM yyyy') : undefined}>
      <TooltipRow color="hsl(var(--primary))" name="Miles driven" value={formatNumber(row.miles)} />
      {row.mpg ? (
        <TooltipRow color="hsl(var(--success))" name="Average MPG" value={row.mpg.toFixed(2)} />
      ) : null}
    </ChartTooltip>
  );
}

export function MileageChart({ data, height = 240 }: { data: MonthlyMileage[]; height?: number }) {
  const series = data.map((row) => ({
    month: row.month.slice(0, 7),
    miles: Number(row.miles_driven),
    mpg: row.avg_mpg ? Number(row.avg_mpg) : null,
  }));

  return (
    <ChartFrame height={height} isEmpty={series.length === 0} emptyLabel="No mileage logged yet">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
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
            width={56}
            tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
          />
          <Tooltip content={<MileageTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.5)' }} />
          <Bar dataKey="miles" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
