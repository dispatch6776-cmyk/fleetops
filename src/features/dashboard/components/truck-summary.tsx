import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Truck as TruckIcon, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PermissionGate } from '@/components/common/permission-gate';
import { TRUCK_STATUS_LABELS, TRUCK_STATUS_TONE } from '@/lib/constants';
import { formatDateTime, formatMiles } from '@/lib/format';
import type { Truck, TruckLocation } from '@/types';
import type { ActiveRental } from '@/features/trucks/api/trucks.api';

export function TruckSummary({
  truck,
  rental,
  location,
}: {
  truck: Truck;
  rental: ActiveRental | null;
  location: TruckLocation | null;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage:
              'radial-gradient(40rem 20rem at 10% 0%, hsl(var(--primary) / 0.16), transparent 60%)',
          }}
        />
        <CardContent className="relative flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <TruckIcon className="size-6" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold tracking-tight">
                  {truck.year} {truck.make} {truck.model}
                </h2>
                <Badge variant={TRUCK_STATUS_TONE[truck.status]}>
                  {TRUCK_STATUS_LABELS[truck.status]}
                </Badge>
              </div>
              <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Unit number</dt>
                  <dd className="font-mono">{truck.truck_number}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt>Plate</dt>
                  <dd className="font-mono text-foreground">
                    {truck.license_plate}
                    {truck.plate_state ? ` · ${truck.plate_state}` : ''}
                  </dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt>VIN</dt>
                  <dd className="font-mono">{truck.vin}</dd>
                </div>
                <div className="flex items-center gap-1.5">
                  <dt>Odometer</dt>
                  <dd className="font-mono text-foreground">{formatMiles(truck.odometer)}</dd>
                </div>
              </dl>
              {location ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden />
                  {location.address ?? `${location.latitude}, ${location.longitude}`} ·{' '}
                  {formatDateTime(location.recorded_at)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <PermissionGate permission="financials.view">
              {rental ? (
                <div className="text-left lg:text-right">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground lg:justify-end">
                    <User className="size-3.5" aria-hidden />
                    Rented to
                  </p>
                  <p className="text-sm font-medium">
                    {rental.rental_company?.name ?? 'Unassigned'}
                  </p>
                  {rental.driver ? (
                    <p className="text-xs text-muted-foreground">Driver: {rental.driver.full_name}</p>
                  ) : null}
                </div>
              ) : null}
            </PermissionGate>
            <Button variant="outline" size="sm" asChild>
              <Link to="/truck">
                Truck profile
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
