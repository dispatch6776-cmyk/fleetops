import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote,
  CalendarClock,
  CircleDollarSign,
  Droplets,
  FileWarning,
  Gauge,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
  Truck as TruckIcon,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { PermissionGate } from '@/components/common/permission-gate';
import { StatCard, StatCardGrid } from '@/components/common/stat-card';
import { CategoryDonut, DonutLegend } from '@/components/charts/category-donut';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { ActivityFeed } from '@/features/dashboard/components/activity-feed';
import { AlertsPanel } from '@/features/dashboard/components/alerts-panel';
import { TruckSummary } from '@/features/dashboard/components/truck-summary';
import { UpcomingServices } from '@/features/dashboard/components/upcoming-services';
import {
  useAlerts,
  useExpenseBreakdown,
  useMonthlyFinancials,
  useRecentActivity,
  useTruckKpis,
  useUpcomingServices,
} from '@/features/dashboard/hooks';
import { useActiveRental, useActiveTruck, useLatestLocation } from '@/features/trucks/hooks';
import { EXPENSE_CATEGORY_LABELS, TRUCK_STATUS_LABELS } from '@/lib/constants';
import {
  formatCountdown,
  formatCurrency,
  formatMiles,
  formatNumber,
  formatPercent,
} from '@/lib/format';
import { percentChange } from '@/lib/utils';
import type { ExpenseByCategory } from '@/types';

export default function DashboardPage() {
  const { truck, truckId, isLoading: truckLoading, isError, error, refetch } = useActiveTruck();

  const kpis = useTruckKpis(truckId);
  const financials = useMonthlyFinancials(truckId, 12);
  const breakdown = useExpenseBreakdown(truckId);
  const services = useUpcomingServices(truckId);
  const activity = useRecentActivity(truckId);
  const rental = useActiveRental(truckId);
  const location = useLatestLocation(truckId);
  const { alerts, isLoading: alertsLoading } = useAlerts(truckId, kpis.data?.outstanding_balance);

  const months = financials.data ?? [];
  const thisMonth = months.at(-1);
  const lastMonth = months.at(-2);

  const incomeChange = percentChange(Number(thisMonth?.income ?? 0), Number(lastMonth?.income ?? 0));
  const expenseChange = percentChange(
    Number(thisMonth?.expenses ?? 0),
    Number(lastMonth?.expenses ?? 0),
  );
  const profitChange = percentChange(Number(thisMonth?.profit ?? 0), Number(lastMonth?.profit ?? 0));

  const donutData = useMemo(
    () =>
      (breakdown.data ?? [])
        .map((row: ExpenseByCategory) => ({
          name: EXPENSE_CATEGORY_LABELS[row.category] ?? row.category,
          value: Number(row.ytd_total ?? 0),
        }))
        .filter((slice) => slice.value > 0),
    [breakdown.data],
  );

  const ytdExpenses = donutData.reduce((sum, slice) => sum + slice.value, 0);
  const nextService = services.data?.[0];
  const oilChange = services.data?.find((service) => service.category === 'oil_change');

  if (isError) {
    return (
      <ErrorState
        title="Could not load your fleet"
        error={error}
        onRetry={() => void refetch()}
        className="mt-8"
      />
    );
  }

  if (truckLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-28" />
        <StatCardGrid>
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} className="h-32" />
          ))}
        </StatCardGrid>
      </div>
    );
  }

  if (!truck) {
    return (
      <EmptyState
        icon={TruckIcon}
        title="No truck on file yet"
        description="Add your truck to start tracking mileage, maintenance, documents and rental income."
        action={
          <Button asChild>
            <Link to="/truck">Add your truck</Link>
          </Button>
        }
        className="mt-10"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Live status for ${truck.truck_number} — ${truck.year} ${truck.make} ${truck.model}.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/mileage">
                <Gauge />
                Log mileage
              </Link>
            </Button>
            <PermissionGate permission="maintenance.edit">
              <Button asChild>
                <Link to="/maintenance?new=1">
                  <CalendarClock />
                  New work order
                </Link>
              </Button>
            </PermissionGate>
          </>
        }
      />

      <TruckSummary truck={truck} rental={rental.data ?? null} location={location.data ?? null} />

      {/* Operational KPIs — visible to every role */}
      <StatCardGrid>
        <StatCard
          label="Current mileage"
          value={formatMiles(truck.odometer)}
          icon={Gauge}
          tone="info"
          hint={`${formatNumber(kpis.data?.miles_mtd ?? 0)} mi this month`}
          href="/mileage"
          loading={kpis.isLoading}
        />
        <StatCard
          label="Truck status"
          value={TRUCK_STATUS_LABELS[truck.status]}
          icon={TruckIcon}
          tone={truck.status === 'active' ? 'success' : truck.status === 'in_repair' ? 'warning' : 'danger'}
          hint={
            kpis.data?.avg_mpg_90d ? `${Number(kpis.data.avg_mpg_90d).toFixed(2)} MPG (90 days)` : undefined
          }
          href="/truck"
        />
        <StatCard
          label="Next service"
          value={nextService ? nextService.name : 'None scheduled'}
          icon={CalendarClock}
          tone={
            nextService?.urgency === 'overdue'
              ? 'danger'
              : nextService?.urgency === 'due_soon'
                ? 'warning'
                : 'default'
          }
          hint={
            nextService?.miles_remaining != null
              ? `${formatNumber(Math.max(0, nextService.miles_remaining))} mi remaining`
              : nextService?.next_due_date
                ? formatCountdown(nextService.next_due_date)
                : undefined
          }
          href="/maintenance"
          loading={services.isLoading}
        />
        <StatCard
          label="Oil change countdown"
          value={
            oilChange?.miles_remaining != null
              ? `${formatNumber(Math.max(0, oilChange.miles_remaining))} mi`
              : oilChange?.next_due_date
                ? formatCountdown(oilChange.next_due_date)
                : '—'
          }
          icon={Droplets}
          tone={oilChange?.urgency === 'overdue' ? 'danger' : oilChange?.urgency === 'due_soon' ? 'warning' : 'success'}
          hint={
            oilChange?.next_due_odometer
              ? `Due at ${formatNumber(oilChange.next_due_odometer)} mi`
              : 'No oil-change interval set'
          }
          href="/maintenance"
          loading={services.isLoading}
        />
      </StatCardGrid>

      <StatCardGrid>
        <StatCard
          label="Insurance expires"
          value={
            kpis.data?.insurance_expires_on ? formatCountdown(kpis.data.insurance_expires_on) : '—'
          }
          icon={ShieldCheck}
          tone={
            (kpis.data?.insurance_expires_on &&
              new Date(kpis.data.insurance_expires_on) < new Date()) ?
              'danger' : 'default'
          }
          hint={kpis.data?.insurance_expires_on ?? 'Not recorded'}
          href="/truck"
          loading={kpis.isLoading}
        />
        <StatCard
          label="Registration expires"
          value={
            kpis.data?.registration_expires_on
              ? formatCountdown(kpis.data.registration_expires_on)
              : '—'
          }
          icon={FileWarning}
          tone={
            (kpis.data?.registration_expires_on &&
              new Date(kpis.data.registration_expires_on) < new Date()) ?
              'danger' : 'default'
          }
          hint={kpis.data?.registration_expires_on ?? 'Not recorded'}
          href="/truck"
          loading={kpis.isLoading}
        />
        <StatCard
          label="Tire life remaining"
          value={
            kpis.data?.tire_life_percent != null
              ? `${Number(kpis.data.tire_life_percent).toFixed(0)}%`
              : '—'
          }
          icon={CircleDollarSign}
          tone={
            (kpis.data?.tire_life_percent ?? 100) < 20
              ? 'danger'
              : (kpis.data?.tire_life_percent ?? 100) < 40
                ? 'warning'
                : 'success'
          }
          hint={truck.tire_size ? `Size ${truck.tire_size}` : 'Set tire size on the truck profile'}
          href="/truck"
          loading={kpis.isLoading}
        />
        <PermissionGate
          permission="financials.view"
          fallback={
            <StatCard
              label="Documents on file"
              value="Document center"
              icon={ReceiptText}
              tone="default"
              hint="Insurance, registration, inspections and photos"
              href="/documents"
            />
          }
        >
          <StatCard
            label="Outstanding balance"
            value={formatCurrency(kpis.data?.outstanding_balance ?? 0)}
            icon={Wallet}
            tone={(kpis.data?.outstanding_balance ?? 0) > 0 ? 'warning' : 'success'}
            hint={(kpis.data?.outstanding_balance ?? 0) > 0 ? 'Unpaid invoices' : 'All invoices settled'}
            href="/invoices"
            loading={kpis.isLoading}
          />
        </PermissionGate>
      </StatCardGrid>

      {/* Financial KPIs — Owner and Administrator only */}
      <PermissionGate permission="financials.view">
        <StatCardGrid>
          <StatCard
            label="Income this month"
            value={formatCurrency(thisMonth?.income ?? 0)}
            icon={Banknote}
            tone="success"
            change={incomeChange}
            href="/financials"
            loading={financials.isLoading}
          />
          <StatCard
            label="Expenses this month"
            value={formatCurrency(thisMonth?.expenses ?? 0)}
            icon={ReceiptText}
            tone="danger"
            change={expenseChange}
            positiveIsGood={false}
            href="/financials"
            loading={financials.isLoading}
          />
          <StatCard
            label="Profit this month"
            value={formatCurrency(thisMonth?.profit ?? 0)}
            icon={TrendingUp}
            tone={(thisMonth?.profit ?? 0) >= 0 ? 'success' : 'danger'}
            change={profitChange}
            hint={
              thisMonth?.margin_percent != null
                ? `${formatPercent(Number(thisMonth.margin_percent))} margin`
                : undefined
            }
            href="/financials"
            loading={financials.isLoading}
          />
          <StatCard
            label="Cost per mile"
            value={thisMonth?.cost_per_mile ? `$${Number(thisMonth.cost_per_mile).toFixed(3)}` : '—'}
            icon={Gauge}
            tone="info"
            hint={`${formatNumber(thisMonth?.miles_driven ?? 0)} mi driven`}
            href="/reports"
            loading={financials.isLoading}
          />
        </StatCardGrid>
      </PermissionGate>

      <PermissionGate permission="financials.view">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Income, expenses and profit</CardTitle>
              <CardDescription>Rolling twelve months for this truck.</CardDescription>
            </CardHeader>
            <CardContent>
              <RevenueChart data={months} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expenses year to date</CardTitle>
              <CardDescription>Where the money went.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CategoryDonut
                data={donutData}
                centerValue={formatCurrency(ytdExpenses)}
                centerLabel="YTD total"
                height={200}
              />
              <DonutLegend data={donutData.slice(0, 6)} />
            </CardContent>
          </Card>
        </div>
      </PermissionGate>

      <div className="grid gap-4 lg:grid-cols-3">
        <AlertsPanel alerts={alerts} loading={alertsLoading} />
        <UpcomingServices services={services.data ?? []} loading={services.isLoading} />
        <ActivityFeed items={activity.data ?? []} loading={activity.isLoading} />
      </div>
    </div>
  );
}
