import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  FileText,
  Gauge,
  Pencil,
  ShieldCheck,
  Truck as TruckIcon,
  Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DetailList, type DetailItem } from '@/components/common/detail-list';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { PermissionGate } from '@/components/common/permission-gate';
import { ComplianceFormDialog } from '@/features/trucks/components/compliance-form-dialog';
import { TruckFormDialog } from '@/features/trucks/components/truck-form-dialog';
import { useActiveRental, useActiveTruck, useCompliance } from '@/features/trucks/hooks';
import { usePermissions } from '@/hooks/use-permissions';
import {
  FUEL_TYPE_LABELS,
  RATE_TYPE_LABELS,
  TRANSMISSION_LABELS,
  TRUCK_STATUS_LABELS,
  TRUCK_STATUS_TONE,
} from '@/lib/constants';
import {
  daysUntil,
  formatCountdown,
  formatCurrency,
  formatDate,
  formatMiles,
  formatNumber,
} from '@/lib/format';

function expiryTone(value: string | null | undefined): DetailItem['tone'] {
  const days = daysUntil(value);
  if (days == null) return 'default';
  if (days < 0) return 'danger';
  if (days <= 30) return 'warning';
  return 'success';
}

export default function TruckPage() {
  const { truck, truckId, isLoading, isError, error, refetch } = useActiveTruck();
  const compliance = useCompliance(truckId);
  const rental = useActiveRental(truckId);
  const { can } = usePermissions();

  const [editTruckOpen, setEditTruckOpen] = useState(false);
  const [editComplianceOpen, setEditComplianceOpen] = useState(false);
  const [addTruckOpen, setAddTruckOpen] = useState(false);

  if (isError) {
    return <ErrorState title="Could not load the truck" error={error} onRetry={() => void refetch()} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard className="h-24" />
        <SkeletonCard className="h-72" />
      </div>
    );
  }

  if (!truck) {
    return (
      <>
        <EmptyState
          icon={TruckIcon}
          title="No truck on file"
          description="Once a truck is added, its specifications, compliance dates and rental terms appear here."
          action={
            <PermissionGate permission="truck.edit">
              <Button onClick={() => setAddTruckOpen(true)}>Add your truck</Button>
            </PermissionGate>
          }
        />
        <TruckFormDialog truck={null} open={addTruckOpen} onOpenChange={setAddTruckOpen} />
      </>
    );
  }

  const specs: DetailItem[] = [
    { label: 'Unit number', value: truck.truck_number, mono: true },
    { label: 'VIN', value: truck.vin, mono: true },
    { label: 'License plate', value: `${truck.license_plate}${truck.plate_state ? ` · ${truck.plate_state}` : ''}`, mono: true },
    { label: 'Year', value: truck.year },
    { label: 'Make', value: truck.make },
    { label: 'Model', value: truck.model },
    { label: 'Colour', value: truck.color },
    { label: 'Engine', value: truck.engine },
    { label: 'Transmission', value: truck.transmission ? TRANSMISSION_LABELS[truck.transmission] : null },
    { label: 'Odometer', value: formatMiles(truck.odometer), mono: true },
    { label: 'Engine hours', value: truck.engine_hours ? formatNumber(truck.engine_hours) : null, mono: true },
    { label: 'Fuel type', value: FUEL_TYPE_LABELS[truck.fuel_type] },
    { label: 'Tank capacity', value: truck.tank_capacity_gal ? `${truck.tank_capacity_gal} gal` : null },
    { label: 'Tire size', value: truck.tire_size, mono: true },
    { label: 'GVWR', value: truck.gvwr_lbs ? `${formatNumber(truck.gvwr_lbs)} lbs` : null },
    { label: 'Axles', value: truck.axles },
  ];

  const complianceItems: DetailItem[] = [
    { label: 'Insurance provider', value: compliance.data?.insurance_provider },
    { label: 'Policy number', value: compliance.data?.insurance_policy_number, mono: true },
    {
      label: 'Insurance expires',
      value: compliance.data?.insurance_expires_on
        ? `${formatDate(compliance.data.insurance_expires_on)} · ${formatCountdown(compliance.data.insurance_expires_on)}`
        : null,
      tone: expiryTone(compliance.data?.insurance_expires_on),
    },
    { label: 'Agent phone', value: compliance.data?.insurance_agent_phone, mono: true },
    { label: 'Registration state', value: compliance.data?.registration_state },
    {
      label: 'Registration expires',
      value: compliance.data?.registration_expires_on
        ? `${formatDate(compliance.data.registration_expires_on)} · ${formatCountdown(compliance.data.registration_expires_on)}`
        : null,
      tone: expiryTone(compliance.data?.registration_expires_on),
    },
    { label: 'DOT number', value: compliance.data?.dot_number, mono: true },
    { label: 'MC number', value: compliance.data?.mc_number, mono: true },
    {
      label: 'DOT inspection expires',
      value: compliance.data?.dot_inspection_expires_on
        ? `${formatDate(compliance.data.dot_inspection_expires_on)} · ${formatCountdown(compliance.data.dot_inspection_expires_on)}`
        : null,
      tone: expiryTone(compliance.data?.dot_inspection_expires_on),
    },
    { label: 'IFTA account', value: compliance.data?.ifta_account, mono: true },
    {
      label: 'IFTA expires',
      value: compliance.data?.ifta_expires_on ? formatDate(compliance.data.ifta_expires_on) : null,
      tone: expiryTone(compliance.data?.ifta_expires_on),
    },
    { label: 'ELD', value: compliance.data?.eld_provider ? `${compliance.data.eld_provider} · ${compliance.data.eld_device_id ?? ''}` : null },
  ];

  const financialItems: DetailItem[] = [
    { label: 'Purchase date', value: formatDate(truck.purchase_date) },
    { label: 'Purchase price', value: truck.purchase_price ? formatCurrency(truck.purchase_price) : null, mono: true },
    { label: 'Current value', value: truck.current_value ? formatCurrency(truck.current_value) : null, mono: true },
    {
      label: 'Depreciation to date',
      value:
        truck.purchase_price && truck.current_value
          ? formatCurrency(truck.purchase_price - truck.current_value)
          : null,
      mono: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${truck.year} ${truck.make} ${truck.model}`}
        description={`Unit ${truck.truck_number} · VIN ${truck.vin}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/documents">
                <FileText />
                Documents
              </Link>
            </Button>
            <PermissionGate permission="truck.edit">
              <Button onClick={() => setEditTruckOpen(true)}>
                <Pencil />
                Edit truck
              </Button>
            </PermissionGate>
          </>
        }
      >
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant={TRUCK_STATUS_TONE[truck.status]}>{TRUCK_STATUS_LABELS[truck.status]}</Badge>
          <Badge variant="neutral">
            <Gauge aria-hidden />
            {formatMiles(truck.odometer)}
          </Badge>
          {compliance.data?.insurance_expires_on ? (
            <Badge variant={expiryTone(compliance.data.insurance_expires_on) === 'danger' ? 'danger' : 'neutral'}>
              <ShieldCheck aria-hidden />
              Insurance {formatCountdown(compliance.data.insurance_expires_on)}
            </Badge>
          ) : null}
        </div>
      </PageHeader>

      <Tabs defaultValue="specifications">
        <TabsList>
          <TabsTrigger value="specifications">
            <TruckIcon />
            Specifications
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <BadgeCheck />
            Compliance
          </TabsTrigger>
          {can('financials.view') ? (
            <TabsTrigger value="rental">
              <Wrench />
              Rental & value
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="specifications">
          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
              <CardDescription>
                Physical details of the asset. The odometer updates automatically from mileage logs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <DetailList items={specs} columns={3} />
              {truck.notes ? (
                <div className="rounded-lg border border-border bg-surface-muted/50 p-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Notes
                  </p>
                  <p className="whitespace-pre-line text-sm">{truck.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle>Insurance, registration & compliance</CardTitle>
                <CardDescription>
                  Expiry dates drive dashboard countdowns and alerts 30 days ahead.
                </CardDescription>
              </div>
              <PermissionGate permission="truck.edit">
                <Button variant="outline" size="sm" onClick={() => setEditComplianceOpen(true)}>
                  <Pencil />
                  Edit
                </Button>
              </PermissionGate>
            </CardHeader>
            <CardContent>
              {compliance.isLoading ? (
                <SkeletonCard className="h-48 border-0 p-0 shadow-none" />
              ) : (
                <DetailList items={complianceItems} columns={3} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {can('financials.view') ? (
          <TabsContent value="rental">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Active rental agreement</CardTitle>
                  <CardDescription>Who is renting the truck and on what terms.</CardDescription>
                </CardHeader>
                <CardContent>
                  {rental.data ? (
                    <DetailList
                      columns={2}
                      items={[
                        { label: 'Renter', value: rental.data.rental_company?.name },
                        { label: 'Contact', value: rental.data.rental_company?.contact_name },
                        { label: 'Phone', value: rental.data.rental_company?.phone, mono: true },
                        { label: 'Driver', value: rental.data.driver?.full_name },
                        { label: 'Agreement', value: rental.data.agreement_number, mono: true },
                        { label: 'Started', value: formatDate(rental.data.start_date) },
                        { label: 'Rate', value: `${formatCurrency(rental.data.rate_amount)} ${RATE_TYPE_LABELS[rental.data.rate_type].toLowerCase()}`, mono: true },
                        { label: 'Deposit held', value: formatCurrency(rental.data.deposit_amount), mono: true },
                        {
                          label: 'Mileage allowance',
                          value: rental.data.mileage_allowance
                            ? `${formatNumber(rental.data.mileage_allowance)} mi / period`
                            : 'Unlimited',
                        },
                        {
                          label: 'Overage rate',
                          value: rental.data.overage_rate ? `$${rental.data.overage_rate}/mi` : null,
                          mono: true,
                        },
                        {
                          label: 'Payment day',
                          value: rental.data.payment_day ? `Day ${rental.data.payment_day} of the month` : null,
                        },
                        {
                          label: 'Late fee',
                          value: rental.data.late_fee_amount
                            ? `${formatCurrency(rental.data.late_fee_amount)} after ${rental.data.late_fee_grace_days ?? 0} days`
                            : null,
                        },
                      ]}
                    />
                  ) : (
                    <EmptyState
                      compact
                      title="No active agreement"
                      description="Record a rental agreement to track rent, deposits and mileage allowances."
                      action={
                        <Button size="sm" asChild>
                          <Link to="/financials">Open financials</Link>
                        </Button>
                      }
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Asset value</CardTitle>
                  <CardDescription>Purchase, current value and depreciation.</CardDescription>
                </CardHeader>
                <CardContent>
                  <DetailList items={financialItems} columns={2} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ) : null}
      </Tabs>

      {can('truck.edit') ? (
        <>
          <TruckFormDialog truck={truck} open={editTruckOpen} onOpenChange={setEditTruckOpen} />
          <ComplianceFormDialog
            truckId={truck.id}
            compliance={compliance.data ?? null}
            open={editComplianceOpen}
            onOpenChange={setEditComplianceOpen}
          />
        </>
      ) : null}
    </div>
  );
}
