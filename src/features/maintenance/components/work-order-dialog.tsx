import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { PermissionGate } from '@/components/common/permission-gate';
import {
  MAINTENANCE_CATEGORY_LABELS,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_TYPE_LABELS,
  toOptions,
} from '@/lib/constants';
import { formatCurrency, toDateInput } from '@/lib/format';
import { useMaintenanceMutations } from '../hooks';
import { maintenanceSchema, type MaintenanceInput } from '../schemas';
import type { MaintenanceRecordDetail } from '@/types';

export function WorkOrderDialog({
  truckId,
  record,
  defaultOdometer,
  open,
  onOpenChange,
}: {
  truckId: string;
  record?: MaintenanceRecordDetail | null;
  defaultOdometer?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { create, update } = useMaintenanceMutations(truckId);
  const isEdit = Boolean(record);

  const form = useForm<MaintenanceInput>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: toDefaults(record, defaultOdometer),
  });

  const { register, control, handleSubmit, watch, setValue, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'parts' });

  useEffect(() => {
    if (open) form.reset(toDefaults(record, defaultOdometer));
  }, [open, record, defaultOdometer, form]);

  const parts = watch('parts') ?? [];
  const partsTotal = parts.reduce(
    (sum, part) => sum + (Number(part.quantity) || 0) * (Number(part.unit_cost) || 0),
    0,
  );
  const total =
    (Number(watch('cost_parts')) || 0) +
    (Number(watch('cost_labor')) || 0) +
    (Number(watch('cost_tax')) || 0) +
    (Number(watch('cost_other')) || 0);

  function onSubmit(values: MaintenanceInput) {
    const payload = {
      truck_id: truckId,
      title: values.title,
      type: values.type,
      category: values.category,
      status: values.status,
      service_date: values.service_date,
      scheduled_for: values.scheduled_for || null,
      completed_at: values.status === 'completed' ? new Date().toISOString() : null,
      odometer: values.odometer === '' ? null : Number(values.odometer),
      description: values.description || null,
      cost_parts: values.cost_parts,
      cost_labor: values.cost_labor,
      cost_tax: values.cost_tax,
      cost_other: values.cost_other,
      is_warranty: values.is_warranty,
      warranty_expires_on: values.warranty_expires_on || null,
      warranty_miles: values.warranty_miles === '' ? null : Number(values.warranty_miles),
      shop_name: values.shop_name || null,
      shop_phone: values.shop_phone || null,
      mechanic_name: values.mechanic_name || null,
      invoice_number: values.invoice_number || null,
      downtime_days: values.downtime_days === '' ? null : Number(values.downtime_days),
      notes: values.notes || null,
    };

    const partRows = values.parts.map((part) => ({
      part_name: part.part_name,
      part_number: part.part_number || null,
      quantity: part.quantity,
      unit_cost: part.unit_cost,
      vendor: part.vendor || null,
    }));

    if (isEdit && record) {
      update.mutate(
        { id: record.id, patch: payload, parts: partRows },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      create.mutate({ record: payload, parts: partRows }, { onSuccess: () => onOpenChange(false) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit work order' : 'New work order'}</DialogTitle>
          <DialogDescription>
            Completing a work order writes the cost to the expense ledger and moves the matching
            preventive-maintenance schedule forward.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              label="Title"
              htmlFor="title"
              required
              className="sm:col-span-2"
              error={formState.errors.title?.message}
            >
              <Input id="title" placeholder="Engine oil & filter change" {...register('title')} />
            </FormField>
            <FormField label="Status" htmlFor="status" required>
              <NativeSelect id="status" options={toOptions(MAINTENANCE_STATUS_LABELS)} {...register('status')} />
            </FormField>
            <FormField label="Type" htmlFor="type" required>
              <NativeSelect id="type" options={toOptions(MAINTENANCE_TYPE_LABELS)} {...register('type')} />
            </FormField>
            <FormField label="Category" htmlFor="category" required>
              <NativeSelect id="category" options={toOptions(MAINTENANCE_CATEGORY_LABELS)} {...register('category')} />
            </FormField>
            <FormField label="Service date" htmlFor="service_date" required error={formState.errors.service_date?.message}>
              <Input id="service_date" type="date" {...register('service_date')} />
            </FormField>
            <FormField label="Scheduled for" htmlFor="scheduled_for" hint="Used by the calendar.">
              <Input id="scheduled_for" type="date" {...register('scheduled_for')} />
            </FormField>
            <FormField label="Odometer" htmlFor="odometer" hint="Updates the truck if it is higher.">
              <Input id="odometer" type="number" inputMode="numeric" {...register('odometer')} />
            </FormField>
            <FormField label="Downtime (days)" htmlFor="downtime_days">
              <Input id="downtime_days" type="number" step="0.5" {...register('downtime_days')} />
            </FormField>
          </div>

          <FormField label="Description" htmlFor="description">
            <Textarea id="description" rows={3} placeholder="What was done, findings, follow-up needed…" {...register('description')} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Shop" htmlFor="shop_name">
              <Input id="shop_name" {...register('shop_name')} />
            </FormField>
            <FormField label="Shop phone" htmlFor="shop_phone">
              <Input id="shop_phone" type="tel" {...register('shop_phone')} />
            </FormField>
            <FormField label="Mechanic" htmlFor="mechanic_name">
              <Input id="mechanic_name" {...register('mechanic_name')} />
            </FormField>
            <FormField label="Shop invoice #" htmlFor="invoice_number">
              <Input id="invoice_number" className="font-mono" {...register('invoice_number')} />
            </FormField>
          </div>

          <PermissionGate permission="maintenance.viewCost">
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Costs</h3>
                <span className="font-mono text-sm font-medium tabular-nums">
                  Total {formatCurrency(total)}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FormField label="Parts" htmlFor="cost_parts">
                  <Input id="cost_parts" type="number" step="0.01" {...register('cost_parts')} />
                </FormField>
                <FormField label="Labour" htmlFor="cost_labor">
                  <Input id="cost_labor" type="number" step="0.01" {...register('cost_labor')} />
                </FormField>
                <FormField label="Tax" htmlFor="cost_tax">
                  <Input id="cost_tax" type="number" step="0.01" {...register('cost_tax')} />
                </FormField>
                <FormField label="Other" htmlFor="cost_other">
                  <Input id="cost_other" type="number" step="0.01" {...register('cost_other')} />
                </FormField>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_warranty"
                    checked={watch('is_warranty')}
                    onCheckedChange={(checked: boolean | 'indeterminate') =>
                      setValue('is_warranty', checked === true)
                    }
                  />
                  <Label htmlFor="is_warranty" className="text-sm font-normal">
                    Covered by warranty (excluded from expenses)
                  </Label>
                </div>
                <FormField label="Warranty expires" htmlFor="warranty_expires_on" className="w-44">
                  <Input id="warranty_expires_on" type="date" {...register('warranty_expires_on')} />
                </FormField>
                <FormField label="Warranty miles" htmlFor="warranty_miles" className="w-40">
                  <Input id="warranty_miles" type="number" {...register('warranty_miles')} />
                </FormField>
              </div>
            </div>
          </PermissionGate>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Parts used{' '}
                {partsTotal > 0 ? (
                  <span className="font-normal text-muted-foreground">
                    · {formatCurrency(partsTotal)}
                  </span>
                ) : null}
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ part_name: '', part_number: '', quantity: 1, unit_cost: 0, vendor: '' })
                }
              >
                <Plus />
                Add part
              </Button>
            </div>

            {fields.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                No parts listed. Add them to keep a searchable history of what went on the truck.
              </p>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid gap-2 sm:grid-cols-[1fr_8rem_5rem_7rem_2.25rem]">
                    <Input
                      aria-label={`Part ${index + 1} name`}
                      placeholder="Oil filter"
                      {...register(`parts.${index}.part_name` as const)}
                    />
                    <Input
                      aria-label={`Part ${index + 1} number`}
                      placeholder="Part #"
                      className="font-mono"
                      {...register(`parts.${index}.part_number` as const)}
                    />
                    <Input
                      aria-label={`Part ${index + 1} quantity`}
                      type="number"
                      step="0.01"
                      className="text-right font-mono"
                      {...register(`parts.${index}.quantity` as const)}
                    />
                    <Input
                      aria-label={`Part ${index + 1} unit cost`}
                      type="number"
                      step="0.01"
                      className="text-right font-mono"
                      {...register(`parts.${index}.unit_cost` as const)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove part ${index + 1}`}
                      onClick={() => remove(index)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <FormField label="Notes" htmlFor="notes">
            <Textarea id="notes" rows={2} {...register('notes')} />
          </FormField>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending || update.isPending}>
              {isEdit ? 'Save work order' : 'Create work order'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toDefaults(
  record?: MaintenanceRecordDetail | null,
  defaultOdometer?: number | null,
): MaintenanceInput {
  return {
    title: record?.title ?? '',
    type: record?.type ?? 'preventive',
    category: record?.category ?? 'oil_change',
    status: record?.status ?? 'completed',
    service_date: toDateInput(record?.service_date ?? new Date()),
    scheduled_for: toDateInput(record?.scheduled_for),
    odometer: record?.odometer ?? defaultOdometer ?? '',
    description: record?.description ?? '',
    cost_parts: Number(record?.cost_parts ?? 0),
    cost_labor: Number(record?.cost_labor ?? 0),
    cost_tax: Number(record?.cost_tax ?? 0),
    cost_other: Number(record?.cost_other ?? 0),
    is_warranty: record?.is_warranty ?? false,
    warranty_expires_on: toDateInput(record?.warranty_expires_on),
    warranty_miles: record?.warranty_miles ?? '',
    shop_name: record?.shop_name ?? '',
    shop_phone: record?.shop_phone ?? '',
    mechanic_name: record?.mechanic_name ?? '',
    invoice_number: record?.invoice_number ?? '',
    downtime_days: record?.downtime_days ?? '',
    notes: record?.notes ?? '',
    parts: (record?.parts ?? []).map((part) => ({
      part_name: part.part_name,
      part_number: part.part_number ?? '',
      quantity: Number(part.quantity),
      unit_cost: Number(part.unit_cost),
      vendor: part.vendor ?? '',
    })),
  } as MaintenanceInput;
}
