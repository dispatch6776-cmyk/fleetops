import { useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/app/query-client';
import { updateTruck } from '../api/trucks.api';
import { blankToNull, truckSchema, type TruckInput } from '../schemas';
import {
  FUEL_TYPE_LABELS,
  TRANSMISSION_LABELS,
  TRUCK_STATUS_LABELS,
  US_STATES,
} from '@/lib/constants';
import { toDateInput } from '@/lib/format';
import type { Truck } from '@/types';

function NativeSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      id={id}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      className="flex h-9 w-full rounded-lg border border-input bg-surface px-3 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function TruckFormDialog({
  truck,
  open,
  onOpenChange,
  trigger,
}: {
  truck: Truck;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: ReactNode;
}) {
  const queryClient = useQueryClient();

  const form = useForm<TruckInput>({
    resolver: zodResolver(truckSchema),
    defaultValues: toDefaults(truck),
  });

  useEffect(() => {
    if (open) form.reset(toDefaults(truck));
  }, [open, truck, form]);

  const mutation = useMutation({
    mutationFn: (values: TruckInput) => updateTruck(truck.id, blankToNull(values)),
    onSuccess: () => {
      toast.success('Truck profile updated');
      void queryClient.invalidateQueries({ queryKey: queryKeys.trucks() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.truck(truck.id) });
      onOpenChange(false);
    },
  });

  const { register, handleSubmit, setValue, watch, formState } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent size="xl" className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit truck profile</DialogTitle>
          <DialogDescription>
            Specifications feed the dashboard gauges, tire-life estimate and depreciation figures.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          className="space-y-5"
          noValidate
        >
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Unit number" htmlFor="truck_number" required error={formState.errors.truck_number?.message}>
              <Input id="truck_number" {...register('truck_number')} />
            </FormField>
            <FormField label="VIN" htmlFor="vin" required error={formState.errors.vin?.message}>
              <Input id="vin" className="font-mono uppercase" {...register('vin')} />
            </FormField>
            <FormField label="Status" htmlFor="status" required>
              <NativeSelect
                id="status"
                value={watch('status')}
                onChange={(value) => setValue('status', value as TruckInput['status'])}
                options={Object.entries(TRUCK_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </FormField>
            <FormField label="License plate" htmlFor="license_plate" required error={formState.errors.license_plate?.message}>
              <Input id="license_plate" className="font-mono uppercase" {...register('license_plate')} />
            </FormField>
            <FormField label="Plate state" htmlFor="plate_state">
              <NativeSelect
                id="plate_state"
                value={watch('plate_state')}
                onChange={(value) => setValue('plate_state', value)}
                placeholder="Select a state"
                options={US_STATES.map((state) => ({ value: state, label: state }))}
              />
            </FormField>
            <FormField label="Colour" htmlFor="color">
              <Input id="color" {...register('color')} />
            </FormField>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Year" htmlFor="year" required error={formState.errors.year?.message}>
              <Input id="year" type="number" inputMode="numeric" {...register('year')} />
            </FormField>
            <FormField label="Make" htmlFor="make" required error={formState.errors.make?.message}>
              <Input id="make" {...register('make')} />
            </FormField>
            <FormField label="Model" htmlFor="model" required error={formState.errors.model?.message}>
              <Input id="model" {...register('model')} />
            </FormField>
            <FormField label="Engine" htmlFor="engine">
              <Input id="engine" placeholder="Detroit DD15 505 HP" {...register('engine')} />
            </FormField>
            <FormField label="Transmission" htmlFor="transmission">
              <NativeSelect
                id="transmission"
                value={watch('transmission')}
                onChange={(value) => setValue('transmission', value as TruckInput['transmission'])}
                placeholder="Select"
                options={Object.entries(TRANSMISSION_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </FormField>
            <FormField label="Engine hours" htmlFor="engine_hours">
              <Input id="engine_hours" type="number" step="0.1" {...register('engine_hours')} />
            </FormField>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              label="Odometer"
              htmlFor="odometer"
              required
              hint="Updated automatically from mileage logs."
              error={formState.errors.odometer?.message}
            >
              <Input id="odometer" type="number" inputMode="numeric" {...register('odometer')} />
            </FormField>
            <FormField label="Fuel type" htmlFor="fuel_type" required>
              <NativeSelect
                id="fuel_type"
                value={watch('fuel_type')}
                onChange={(value) => setValue('fuel_type', value as TruckInput['fuel_type'])}
                options={Object.entries(FUEL_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </FormField>
            <FormField label="Tank capacity (gal)" htmlFor="tank_capacity_gal">
              <Input id="tank_capacity_gal" type="number" step="0.1" {...register('tank_capacity_gal')} />
            </FormField>
            <FormField label="Tire size" htmlFor="tire_size">
              <Input id="tire_size" placeholder="295/75R22.5" {...register('tire_size')} />
            </FormField>
            <FormField
              label="Tires installed at (mi)"
              htmlFor="tire_installed_miles"
              hint="Drives the tire-life gauge."
            >
              <Input id="tire_installed_miles" type="number" {...register('tire_installed_miles')} />
            </FormField>
            <FormField label="Expected tire life (mi)" htmlFor="tire_life_miles">
              <Input id="tire_life_miles" type="number" {...register('tire_life_miles')} />
            </FormField>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="GVWR (lbs)" htmlFor="gvwr_lbs">
              <Input id="gvwr_lbs" type="number" {...register('gvwr_lbs')} />
            </FormField>
            <FormField label="Axles" htmlFor="axles">
              <Input id="axles" type="number" {...register('axles')} />
            </FormField>
            <FormField label="Purchase date" htmlFor="purchase_date">
              <Input id="purchase_date" type="date" {...register('purchase_date')} />
            </FormField>
            <FormField label="Purchase price" htmlFor="purchase_price">
              <Input id="purchase_price" type="number" step="0.01" {...register('purchase_price')} />
            </FormField>
            <FormField label="Current value" htmlFor="current_value">
              <Input id="current_value" type="number" step="0.01" {...register('current_value')} />
            </FormField>
          </section>

          <FormField label="Notes" htmlFor="notes">
            <Textarea id="notes" rows={3} {...register('notes')} />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDefaults(truck: Truck): TruckInput {
  return {
    truck_number: truck.truck_number,
    vin: truck.vin,
    license_plate: truck.license_plate,
    plate_state: truck.plate_state ?? '',
    year: truck.year,
    make: truck.make,
    model: truck.model,
    color: truck.color ?? '',
    engine: truck.engine ?? '',
    engine_hours: truck.engine_hours,
    transmission: truck.transmission ?? undefined,
    odometer: truck.odometer,
    fuel_type: truck.fuel_type,
    tank_capacity_gal: truck.tank_capacity_gal,
    tire_size: truck.tire_size ?? '',
    tire_installed_miles: truck.tire_installed_miles,
    tire_life_miles: truck.tire_life_miles,
    gvwr_lbs: truck.gvwr_lbs,
    axles: truck.axles,
    status: truck.status,
    purchase_date: toDateInput(truck.purchase_date),
    purchase_price: truck.purchase_price,
    current_value: truck.current_value,
    notes: truck.notes ?? '',
  } as TruckInput;
}
