import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { MAINTENANCE_CATEGORY_LABELS, toOptions } from '@/lib/constants';
import { toDateInput } from '@/lib/format';
import { useScheduleMutations } from '../hooks';
import { scheduleSchema, type ScheduleInput } from '../schemas';
import type { MaintenanceSchedule } from '@/types';

const INTERVAL_OPTIONS = [
  { value: 'miles', label: 'Every X miles' },
  { value: 'days', label: 'Every X days' },
  { value: 'engine_hours', label: 'Every X engine hours' },
];

export function ScheduleDialog({
  truckId,
  schedule,
  open,
  onOpenChange,
}: {
  truckId: string;
  schedule?: MaintenanceSchedule | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { create, update } = useScheduleMutations(truckId);
  const isEdit = Boolean(schedule);

  const form = useForm<ScheduleInput>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: toDefaults(schedule),
  });

  const { register, handleSubmit, watch, setValue, formState } = form;
  const intervalType = watch('interval_type');

  useEffect(() => {
    if (open) form.reset(toDefaults(schedule));
  }, [open, schedule, form]);

  function onSubmit(values: ScheduleInput) {
    const payload = {
      truck_id: truckId,
      name: values.name,
      category: values.category,
      interval_type: values.interval_type,
      interval_miles: values.interval_miles === '' ? null : Number(values.interval_miles),
      interval_days: values.interval_days === '' ? null : Number(values.interval_days),
      interval_engine_hours:
        values.interval_engine_hours === '' ? null : Number(values.interval_engine_hours),
      last_service_odometer:
        values.last_service_odometer === '' ? null : Number(values.last_service_odometer),
      last_service_date: values.last_service_date || null,
      next_due_odometer: values.next_due_odometer === '' ? null : Number(values.next_due_odometer),
      next_due_date: values.next_due_date || null,
      notify_miles_before: values.notify_miles_before,
      notify_days_before: values.notify_days_before,
      estimated_cost: values.estimated_cost === '' ? null : Number(values.estimated_cost),
      is_active: values.is_active,
    };

    if (isEdit && schedule) {
      update.mutate({ id: schedule.id, patch: payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit schedule' : 'New maintenance schedule'}</DialogTitle>
          <DialogDescription>
            Recurring services roll forward automatically each time a matching work order is
            completed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" htmlFor="name" required error={formState.errors.name?.message}>
              <Input id="name" placeholder="Engine oil & filter" {...register('name')} />
            </FormField>
            <FormField label="Category" htmlFor="category" required>
              <NativeSelect id="category" options={toOptions(MAINTENANCE_CATEGORY_LABELS)} {...register('category')} />
            </FormField>
            <FormField label="Interval type" htmlFor="interval_type" required>
              <NativeSelect id="interval_type" options={INTERVAL_OPTIONS} {...register('interval_type')} />
            </FormField>
            {intervalType === 'miles' ? (
              <FormField
                label="Every (miles)"
                htmlFor="interval_miles"
                required
                error={formState.errors.interval_miles?.message}
              >
                <Input id="interval_miles" type="number" {...register('interval_miles')} />
              </FormField>
            ) : intervalType === 'days' ? (
              <FormField label="Every (days)" htmlFor="interval_days" required>
                <Input id="interval_days" type="number" {...register('interval_days')} />
              </FormField>
            ) : (
              <FormField label="Every (engine hours)" htmlFor="interval_engine_hours" required>
                <Input id="interval_engine_hours" type="number" {...register('interval_engine_hours')} />
              </FormField>
            )}
            <FormField label="Last service odometer" htmlFor="last_service_odometer">
              <Input id="last_service_odometer" type="number" {...register('last_service_odometer')} />
            </FormField>
            <FormField label="Last service date" htmlFor="last_service_date">
              <Input id="last_service_date" type="date" {...register('last_service_date')} />
            </FormField>
            <FormField label="Next due odometer" htmlFor="next_due_odometer">
              <Input id="next_due_odometer" type="number" {...register('next_due_odometer')} />
            </FormField>
            <FormField label="Next due date" htmlFor="next_due_date">
              <Input id="next_due_date" type="date" {...register('next_due_date')} />
            </FormField>
            <FormField label="Warn me (miles before)" htmlFor="notify_miles_before">
              <Input id="notify_miles_before" type="number" {...register('notify_miles_before')} />
            </FormField>
            <FormField label="Warn me (days before)" htmlFor="notify_days_before">
              <Input id="notify_days_before" type="number" {...register('notify_days_before')} />
            </FormField>
            <FormField label="Estimated cost" htmlFor="estimated_cost">
              <Input id="estimated_cost" type="number" step="0.01" {...register('estimated_cost')} />
            </FormField>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_active"
              checked={watch('is_active')}
              onCheckedChange={(checked: boolean | 'indeterminate') =>
                setValue('is_active', checked === true)
              }
            />
            <Label htmlFor="is_active" className="text-sm font-normal">
              Active — include in alerts and the dashboard
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {isEdit ? 'Save schedule' : 'Create schedule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDefaults(schedule?: MaintenanceSchedule | null): ScheduleInput {
  return {
    name: schedule?.name ?? '',
    category: schedule?.category ?? 'oil_change',
    interval_type: schedule?.interval_type ?? 'miles',
    interval_miles: schedule?.interval_miles ?? '',
    interval_days: schedule?.interval_days ?? '',
    interval_engine_hours: schedule?.interval_engine_hours ?? '',
    last_service_odometer: schedule?.last_service_odometer ?? '',
    last_service_date: toDateInput(schedule?.last_service_date),
    next_due_odometer: schedule?.next_due_odometer ?? '',
    next_due_date: toDateInput(schedule?.next_due_date),
    notify_miles_before: schedule?.notify_miles_before ?? 1000,
    notify_days_before: schedule?.notify_days_before ?? 14,
    estimated_cost: schedule?.estimated_cost ?? '',
    is_active: schedule?.is_active ?? true,
  } as ScheduleInput;
}
