import type {
  DocumentCategory,
  ExpenseCategory,
  FuelTypeEnum,
  InvoiceStatus,
  MaintenanceCategory,
  MaintenanceStatus,
  MaintenanceType,
  PaymentMethod,
  PaymentType,
  RateType,
  RentalStatus,
  SelectOption,
  TransmissionEnum,
  TruckStatus,
} from '@/types';

type BadgeTone = 'default' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

export const TRUCK_STATUS_LABELS: Record<TruckStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  in_repair: 'In Repair',
  out_of_service: 'Out of Service',
};

export const TRUCK_STATUS_TONE: Record<TruckStatus, BadgeTone> = {
  active: 'success',
  inactive: 'neutral',
  in_repair: 'warning',
  out_of_service: 'danger',
};

export const MAINTENANCE_CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  oil_change: 'Oil Change',
  brake_service: 'Brake Service',
  transmission: 'Transmission',
  engine: 'Engine',
  turbo: 'Turbo',
  cooling: 'Cooling System',
  battery: 'Battery',
  electrical: 'Electrical',
  tires: 'Tires',
  alignment: 'Alignment',
  suspension: 'Suspension',
  steering: 'Steering',
  lights: 'Lights',
  def_system: 'DEF System',
  dpf: 'DPF',
  exhaust: 'Exhaust',
  drivetrain: 'Drivetrain',
  clutch: 'Clutch',
  air_system: 'Air System',
  hvac: 'HVAC',
  body: 'Body & Cab',
  trailer: 'Trailer',
  inspection: 'Inspection',
  other: 'Other',
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  deferred: 'Deferred',
  cancelled: 'Cancelled',
};

export const MAINTENANCE_STATUS_TONE: Record<MaintenanceStatus, BadgeTone> = {
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  deferred: 'neutral',
  cancelled: 'neutral',
};

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventive: 'Preventive',
  repair: 'Repair',
  warranty: 'Warranty',
  recall: 'Recall',
  inspection: 'Inspection',
  upgrade: 'Upgrade',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  maintenance: 'Maintenance',
  repair: 'Repair',
  tires: 'Tires',
  fuel: 'Fuel',
  def: 'DEF',
  insurance: 'Insurance',
  registration: 'Registration',
  permits: 'Permits',
  ifta: 'IFTA',
  tolls: 'Tolls',
  parking: 'Parking',
  taxes: 'Taxes',
  loan_payment: 'Loan Payment',
  lease_payment: 'Lease Payment',
  accounting: 'Accounting',
  roadside: 'Roadside Assistance',
  towing: 'Towing',
  equipment: 'Equipment',
  other: 'Other',
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  rent_monthly: 'Monthly Rent',
  rent_weekly: 'Weekly Rent',
  rent_daily: 'Daily Rent',
  deposit: 'Security Deposit',
  deposit_refund: 'Deposit Refund',
  late_fee: 'Late Fee',
  damage_fee: 'Damage Fee',
  mileage_overage: 'Mileage Overage',
  reimbursement: 'Reimbursement',
  custom: 'Custom Payment',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  check: 'Check',
  ach: 'ACH Transfer',
  wire: 'Wire Transfer',
  card: 'Card',
  zelle: 'Zelle',
  other: 'Other',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partial: 'Partially Paid',
  paid: 'Paid',
  overdue: 'Overdue',
  void: 'Void',
};

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  draft: 'neutral',
  sent: 'info',
  partial: 'warning',
  paid: 'success',
  overdue: 'danger',
  void: 'neutral',
};

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  insurance: 'Insurance',
  registration: 'Registration',
  title: 'Title',
  lease: 'Lease',
  rental_agreement: 'Rental Agreement',
  invoice: 'Invoice',
  receipt: 'Receipt',
  dot: 'DOT',
  inspection: 'Inspection',
  permit: 'Permit',
  ifta: 'IFTA',
  photo: 'Photo',
  video: 'Video',
  warranty: 'Warranty',
  other: 'Other',
};

export const FUEL_TYPE_LABELS: Record<FuelTypeEnum, string> = {
  diesel: 'Diesel',
  def_diesel: 'Diesel + DEF',
  gasoline: 'Gasoline',
  cng: 'CNG',
  lng: 'LNG',
  electric: 'Electric',
  hybrid: 'Hybrid',
};

export const TRANSMISSION_LABELS: Record<TransmissionEnum, string> = {
  manual: 'Manual',
  automatic: 'Automatic',
  automated_manual: 'Automated Manual',
};

export const RATE_TYPE_LABELS: Record<RateType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  per_mile: 'Per Mile',
  custom: 'Custom',
};

export const RENTAL_STATUS_LABELS: Record<RentalStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  ended: 'Ended',
  terminated: 'Terminated',
};

/** Categories treated as financial paperwork — hidden from non-financial roles. */
export const FINANCIAL_DOCUMENT_CATEGORIES: DocumentCategory[] = ['invoice', 'receipt', 'lease'];

/** Chart palette, resolved from CSS variables so it follows the active theme. */
export const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--info))',
  'hsl(var(--danger))',
  'hsl(217 91% 76%)',
  'hsl(152 45% 62%)',
  'hsl(38 92% 72%)',
] as const;

/** Helper to turn a label map into `<Select />` options. */
export function toOptions<T extends string>(labels: Record<T, string>): SelectOption<T>[] {
  return (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
}

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
  'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA',
  'RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
] as const;

/** Primary truck id fallback — the app resolves the active truck at runtime. */
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
