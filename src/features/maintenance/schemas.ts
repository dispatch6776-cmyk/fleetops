import { z } from 'zod';

export const maintenancePartSchema = z.object({
  part_name: z.string().min(1, 'Name the part').max(120),
  part_number: z.string().max(60).optional().or(z.literal('')),
  quantity: z.coerce.number().positive('Quantity must be greater than zero'),
  unit_cost: z.coerce.number().min(0, 'Cost cannot be negative'),
  vendor: z.string().max(120).optional().or(z.literal('')),
});

export const maintenanceSchema = z.object({
  title: z.string().min(1, 'Give the work order a title').max(160),
  type: z.enum(['preventive', 'repair', 'warranty', 'recall', 'inspection', 'upgrade']),
  category: z.enum([
    'oil_change', 'brake_service', 'transmission', 'engine', 'turbo', 'cooling',
    'battery', 'electrical', 'tires', 'alignment', 'suspension', 'steering',
    'lights', 'def_system', 'dpf', 'exhaust', 'drivetrain', 'clutch',
    'air_system', 'hvac', 'body', 'trailer', 'inspection', 'other',
  ]),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'deferred', 'cancelled']),
  service_date: z.string().min(1, 'Choose a date'),
  scheduled_for: z.string().optional().or(z.literal('')),
  odometer: z.union([z.coerce.number().int().min(0), z.literal('')]).optional(),
  description: z.string().max(2000).optional().or(z.literal('')),
  cost_parts: z.coerce.number().min(0).default(0),
  cost_labor: z.coerce.number().min(0).default(0),
  cost_tax: z.coerce.number().min(0).default(0),
  cost_other: z.coerce.number().min(0).default(0),
  is_warranty: z.boolean().default(false),
  warranty_expires_on: z.string().optional().or(z.literal('')),
  warranty_miles: z.union([z.coerce.number().int().min(0), z.literal('')]).optional(),
  shop_name: z.string().max(120).optional().or(z.literal('')),
  shop_phone: z.string().max(40).optional().or(z.literal('')),
  mechanic_name: z.string().max(120).optional().or(z.literal('')),
  invoice_number: z.string().max(60).optional().or(z.literal('')),
  downtime_days: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  notes: z.string().max(2000).optional().or(z.literal('')),
  parts: z.array(maintenancePartSchema).default([]),
});

export const scheduleSchema = z
  .object({
    name: z.string().min(1, 'Name the schedule').max(120),
    category: z.enum([
      'oil_change', 'brake_service', 'transmission', 'engine', 'turbo', 'cooling',
      'battery', 'electrical', 'tires', 'alignment', 'suspension', 'steering',
      'lights', 'def_system', 'dpf', 'exhaust', 'drivetrain', 'clutch',
      'air_system', 'hvac', 'body', 'trailer', 'inspection', 'other',
    ]),
    interval_type: z.enum(['miles', 'days', 'engine_hours']),
    interval_miles: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
    interval_days: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
    interval_engine_hours: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
    last_service_odometer: z.union([z.coerce.number().int().min(0), z.literal('')]).optional(),
    last_service_date: z.string().optional().or(z.literal('')),
    next_due_odometer: z.union([z.coerce.number().int().min(0), z.literal('')]).optional(),
    next_due_date: z.string().optional().or(z.literal('')),
    notify_miles_before: z.coerce.number().int().min(0).default(1000),
    notify_days_before: z.coerce.number().int().min(0).default(14),
    estimated_cost: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
    is_active: z.boolean().default(true),
  })
  .refine(
    (values) =>
      (values.interval_type === 'miles' && Boolean(values.interval_miles)) ||
      (values.interval_type === 'days' && Boolean(values.interval_days)) ||
      (values.interval_type === 'engine_hours' && Boolean(values.interval_engine_hours)),
    { message: 'Set the interval for the type you selected', path: ['interval_miles'] },
  );

export type MaintenanceInput = z.infer<typeof maintenanceSchema>;
export type MaintenancePartInput = z.infer<typeof maintenancePartSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
