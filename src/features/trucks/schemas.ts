import { z } from 'zod';

const optionalString = z.string().trim().max(120).optional().or(z.literal(''));
const optionalDate = z.string().optional().or(z.literal(''));
const optionalNumber = z
  .union([z.number(), z.string()])
  .optional()
  .transform((value) => {
    if (value === '' || value == null) return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  });

export const truckSchema = z.object({
  truck_number: z.string().trim().min(1, 'Unit number is required').max(32),
  vin: z
    .string()
    .trim()
    .min(11, 'A VIN is 17 characters')
    .max(17, 'A VIN is 17 characters')
    .regex(/^[A-HJ-NPR-Z0-9]+$/i, 'A VIN cannot contain I, O or Q')
    .transform((value) => value.toUpperCase()),
  license_plate: z.string().trim().min(1, 'Plate is required').max(16),
  plate_state: optionalString,
  year: z.coerce
    .number()
    .int()
    .min(1950, 'Year looks too old')
    .max(new Date().getFullYear() + 2, 'Year is in the future'),
  make: z.string().trim().min(1, 'Make is required').max(40),
  model: z.string().trim().min(1, 'Model is required').max(40),
  color: optionalString,
  engine: optionalString,
  engine_hours: optionalNumber,
  transmission: z.enum(['manual', 'automatic', 'automated_manual']).optional(),
  odometer: z.coerce.number().int().min(0, 'Odometer cannot be negative'),
  fuel_type: z.enum(['diesel', 'def_diesel', 'gasoline', 'cng', 'lng', 'electric', 'hybrid']),
  tank_capacity_gal: optionalNumber,
  tire_size: optionalString,
  tire_installed_miles: optionalNumber,
  tire_life_miles: optionalNumber,
  gvwr_lbs: optionalNumber,
  axles: optionalNumber,
  status: z.enum(['active', 'inactive', 'in_repair', 'out_of_service']),
  purchase_date: optionalDate,
  purchase_price: optionalNumber,
  current_value: optionalNumber,
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export const complianceSchema = z.object({
  insurance_provider: optionalString,
  insurance_policy_number: optionalString,
  insurance_effective_on: optionalDate,
  insurance_expires_on: optionalDate,
  insurance_monthly_cost: optionalNumber,
  insurance_agent_phone: optionalString,
  registration_state: optionalString,
  registration_number: optionalString,
  registration_expires_on: optionalDate,
  registration_annual_cost: optionalNumber,
  dot_number: optionalString,
  mc_number: optionalString,
  dot_inspection_on: optionalDate,
  dot_inspection_expires_on: optionalDate,
  ifta_account: optionalString,
  ifta_expires_on: optionalDate,
  eld_provider: optionalString,
  eld_device_id: optionalString,
});

export type TruckInput = z.infer<typeof truckSchema>;
export type ComplianceInput = z.infer<typeof complianceSchema>;

/** Turns empty strings into nulls so Postgres stores NULL rather than ''. */
export function blankToNull<T extends Record<string, unknown>>(values: T): T {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === '' ? null : value]),
  ) as T;
}
