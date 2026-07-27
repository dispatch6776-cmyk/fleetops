import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/format';
import { CHART_COLORS } from '@/lib/constants';
import { ChartFrame, ChartTooltip, TooltipRow } from './chart-primitives';

export interface DonutSlice {
  name: string;
  value: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; payload: DonutSlice; fill: string }[];
}

function SliceTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const slice = payload[0];
  return (
    <ChartTooltip>
      <TooltipRow color={slice.fill} name={slice.name} value={formatCurrency(slice.value)} />
    </ChartTooltip>
  );
}

export function CategoryDonut({
  data,
  height = 240,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const slices = data.filter((slice) => slice.value > 0).sort((a, b) => b.value - a.value);

  return (
    <ChartFrame height={height} isEmpty={slices.length === 0} emptyLabel="No expenses recorded yet">
      <div className="relative h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={2}
              stroke="hsl(var(--background))"
              strokeWidth={2}
            >
              {slices.map((slice, index) => (
                <Cell key={slice.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<SliceTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {centerValue ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-xl font-semibold tabular-nums">{centerValue}</span>
            {centerLabel ? (
              <span className="text-xs text-muted-foreground">{centerLabel}</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </ChartFrame>
  );
}

export function DonutLegend({ data }: { data: DonutSlice[] }) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const slices = data.filter((slice) => slice.value > 0).sort((a, b) => b.value - a.value);

  return (
    <ul className="space-y-2">
      {slices.map((slice, index) => (
        <li key={slice.name} className="flex items-center justify-between gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: CHART_COLORS[index % CHART_COLORS.length] }}
              aria-hidden
            />
            <span className="truncate text-muted-foreground">{slice.name}</span>
          </span>
          <span className="shrink-0 font-mono text-xs tabular-nums">
            {formatCurrency(slice.value)}
            <span className="ml-1.5 text-muted-foreground">
              {total > 0 ? `${Math.round((slice.value / total) * 100)}%` : '—'}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
