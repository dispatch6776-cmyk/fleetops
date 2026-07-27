/**
 * Typed contract for the FleetOps Postgres schema.
 *
 * Mirrors `supabase/migrations/*.sql`. Keep the two in sync — after changing a
 * migration, update the matching Row interface here (or regenerate with
 * `supabase gen types typescript --linked > src/types/database.types.ts`).
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export type UserRole = 'owner' | 'admin' | 'maintenance' | 'mechanic' | 'viewer';
export type TruckStatus = 'active' | 'inactive' | 'in_repair' | 'out_of_service';
export type FuelTypeEnum = 'diesel' | 'def_diesel' | 'gasoline' | 'cng' | 'lng' | 'electric' | 'hybrid';
export type TransmissionEnum = 'manual' | 'automatic' | 'automated_manual';
export type MaintenanceType = 'preventive' | 'repair' | 'warranty' | 'recall' | 'inspection' | 'upgrade';
export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'deferred' | 'cancelled';
export type MaintenanceCategory =
  | 'oil_change' | 'brake_service' | 'transmission' | 'engine' | 'turbo' | 'cooling'
  | 'battery' | 'electrical' | 'tires' | 'alignment' | 'suspension' | 'steering'
  | 'lights' | 'def_system' | 'dpf' | 'exhaust' | 'drivetrain' | 'clutch'
  | 'air_system' | 'hvac' | 'body' | 'trailer' | 'inspection' | 'other';
export type ScheduleInterval = 'miles' | 'days' | 'engine_hours';
export type RateType = 'daily' | 'weekly' | 'monthly' | 'per_mile' | 'custom';
export type RentalStatus = 'pending' | 'active' | 'ended' | 'terminated';
export type PaymentType =
  | 'rent_monthly' | 'rent_weekly' | 'rent_daily' | 'deposit' | 'deposit_refund'
  | 'late_fee' | 'damage_fee' | 'mileage_overage' | 'reimbursement' | 'custom';
export type PaymentMethod = 'cash' | 'check' | 'ach' | 'wire' | 'card' | 'zelle' | 'other';
export type ExpenseCategory =
  | 'maintenance' | 'repair' | 'tires' | 'fuel' | 'def' | 'insurance' | 'registration'
  | 'permits' | 'ifta' | 'tolls' | 'parking' | 'taxes' | 'loan_payment' | 'lease_payment'
  | 'accounting' | 'roadside' | 'towing' | 'equipment' | 'other';
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void';
export type DocumentCategory =
  | 'insurance' | 'registration' | 'title' | 'lease' | 'rental_agreement' | 'invoice'
  | 'receipt' | 'dot' | 'inspection' | 'permit' | 'ifta' | 'photo' | 'video'
  | 'warranty' | 'other';
export type MileageSource = 'manual' | 'eld' | 'import' | 'fuel_log' | 'maintenance';
export type NotificationSeverity = 'critical' | 'warning' | 'info' | 'success';
export type NotificationType =
  | 'maintenance_due' | 'maintenance_overdue' | 'insurance_expiring' | 'registration_expiring'
  | 'inspection_due' | 'payment_due' | 'payment_late' | 'document_missing'
  | 'document_expiring' | 'mileage_missing' | 'cost_anomaly' | 'system';
export type AuditAction = 'insert' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'download' | 'invite';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------
export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TruckRow = {
  id: string;
  truck_number: string;
  vin: string;
  license_plate: string;
  plate_state: string | null;
  year: number;
  make: string;
  model: string;
  color: string | null;
  engine: string | null;
  engine_hours: number | null;
  transmission: TransmissionEnum | null;
  odometer: number;
  odometer_updated_at: string | null;
  fuel_type: FuelTypeEnum;
  tank_capacity_gal: number | null;
  tire_size: string | null;
  tire_installed_miles: number | null;
  tire_life_miles: number | null;
  gvwr_lbs: number | null;
  axles: number | null;
  status: TruckStatus;
  purchase_date: string | null;
  purchase_price: number | null;
  current_value: number | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TruckComplianceRow = {
  id: string;
  truck_id: string;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_effective_on: string | null;
  insurance_expires_on: string | null;
  insurance_monthly_cost: number | null;
  insurance_agent_phone: string | null;
  registration_state: string | null;
  registration_number: string | null;
  registration_expires_on: string | null;
  registration_annual_cost: number | null;
  dot_number: string | null;
  mc_number: string | null;
  dot_inspection_on: string | null;
  dot_inspection_expires_on: string | null;
  ifta_account: string | null;
  ifta_expires_on: string | null;
  eld_provider: string | null;
  eld_device_id: string | null;
  eld_expires_on: string | null;
  updated_at: string;
}

export type DriverRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  license_number: string | null;
  license_state: string | null;
  license_expires_on: string | null;
  medical_card_expires_on: string | null;
  hire_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type RentalCompanyRow = {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  dot_number: string | null;
  mc_number: string | null;
  tax_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type RentalAgreementRow = {
  id: string;
  truck_id: string;
  rental_company_id: string | null;
  driver_id: string | null;
  agreement_number: string | null;
  start_date: string;
  end_date: string | null;
  rate_type: RateType;
  rate_amount: number;
  deposit_amount: number;
  deposit_refunded: boolean;
  mileage_allowance: number | null;
  overage_rate: number | null;
  payment_day: number | null;
  late_fee_amount: number | null;
  late_fee_grace_days: number | null;
  status: RentalStatus;
  terms: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type MaintenanceRecordRow = {
  id: string;
  truck_id: string;
  type: MaintenanceType;
  category: MaintenanceCategory;
  status: MaintenanceStatus;
  title: string;
  description: string | null;
  service_date: string;
  scheduled_for: string | null;
  completed_at: string | null;
  odometer: number | null;
  engine_hours: number | null;
  cost_parts: number;
  cost_labor: number;
  cost_tax: number;
  cost_other: number;
  cost_total: number;
  is_warranty: boolean;
  warranty_expires_on: string | null;
  warranty_miles: number | null;
  shop_id: string | null;
  shop_name: string | null;
  shop_phone: string | null;
  mechanic_name: string | null;
  invoice_number: string | null;
  downtime_days: number | null;
  next_service_odometer: number | null;
  next_service_date: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type MaintenancePartRow = {
  id: string;
  maintenance_id: string;
  part_name: string;
  part_number: string | null;
  quantity: number;
  unit_cost: number;
  line_total: number;
  vendor: string | null;
  warranty_months: number | null;
  created_at: string;
}

export type MaintenanceScheduleRow = {
  id: string;
  truck_id: string;
  name: string;
  category: MaintenanceCategory;
  interval_type: ScheduleInterval;
  interval_miles: number | null;
  interval_days: number | null;
  interval_engine_hours: number | null;
  last_service_odometer: number | null;
  last_service_date: string | null;
  next_due_odometer: number | null;
  next_due_date: string | null;
  notify_miles_before: number;
  notify_days_before: number;
  estimated_cost: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type MileageLogRow = {
  id: string;
  truck_id: string;
  log_date: string;
  odometer: number;
  miles_driven: number | null;
  engine_hours: number | null;
  source: MileageSource;
  driver_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export type FuelLogRow = {
  id: string;
  truck_id: string;
  fuel_date: string;
  odometer: number;
  gallons: number;
  price_per_gallon: number;
  total_cost: number;
  miles_since_last: number | null;
  mpg: number | null;
  is_def: boolean;
  is_full_tank: boolean;
  station: string | null;
  city: string | null;
  state: string | null;
  driver_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export type DocumentRow = {
  id: string;
  truck_id: string | null;
  category: DocumentCategory;
  folder: string;
  title: string;
  description: string | null;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  issued_on: string | null;
  expires_on: string | null;
  is_financial: boolean;
  tags: string[];
  maintenance_id: string | null;
  invoice_id: string | null;
  expense_id: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PrivateNoteRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  body: string;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export type ServiceShopRow = {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  place_id: string | null;
  phone: string | null;
  emergency_phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  hours: Json;
  is_24_hours: boolean;
  rating: number | null;
  review_count: number | null;
  services: string[];
  photo_urls: string[];
  is_favorite: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TruckLocationRow = {
  id: string;
  truck_id: string;
  recorded_at: string;
  latitude: number;
  longitude: number;
  speed_mph: number | null;
  heading: number | null;
  address: string | null;
  source: string;
}

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  truck_id: string;
  rental_agreement_id: string | null;
  rental_company_id: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  period_start: string | null;
  period_end: string | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  balance: number;
  sent_at: string | null;
  paid_at: string | null;
  notes: string | null;
  terms: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceLineItemRow = {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
  created_at: string;
}

export type PaymentRow = {
  id: string;
  truck_id: string;
  rental_agreement_id: string | null;
  invoice_id: string | null;
  payment_date: string;
  amount: number;
  type: PaymentType;
  method: PaymentMethod;
  reference: string | null;
  period_start: string | null;
  period_end: string | null;
  is_late: boolean;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ExpenseRow = {
  id: string;
  truck_id: string;
  expense_date: string;
  category: ExpenseCategory;
  amount: number;
  vendor: string | null;
  description: string | null;
  method: PaymentMethod;
  reference: string | null;
  is_tax_deductible: boolean;
  is_recurring: boolean;
  maintenance_id: string | null;
  fuel_log_id: string | null;
  document_id: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationRow = {
  id: string;
  user_id: string | null;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string | null;
  href: string | null;
  entity_type: string | null;
  entity_id: string | null;
  due_date: string | null;
  read_at: string | null;
  emailed_at: string | null;
  dedupe_key: string | null;
  created_at: string;
}

export type NotificationPreferenceRow = {
  user_id: string;
  email_enabled: boolean;
  browser_enabled: boolean;
  maintenance_alerts: boolean;
  compliance_alerts: boolean;
  payment_alerts: boolean;
  document_alerts: boolean;
  weekly_digest: boolean;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  updated_at: string;
}

export type AuditLogRow = {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  summary: string | null;
  changes: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export type LoginHistoryRow = {
  id: number;
  user_id: string | null;
  email: string;
  succeeded: boolean;
  ip_address: string | null;
  user_agent: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
}

export type AppSettingsRow = {
  id: boolean;
  company_name: string;
  company_email: string | null;
  company_phone: string | null;
  company_address: string | null;
  logo_url: string | null;
  currency: string;
  timezone: string;
  distance_unit: string;
  invoice_prefix: string;
  invoice_next_number: number;
  invoice_terms: string | null;
  default_tax_rate: number;
  fiscal_year_start_month: number;
  alert_days_before: number;
  updated_at: string;
}

export type AiConversationRow = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export type AiMessageRow = {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  context: Json | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// View shapes
// ---------------------------------------------------------------------------
export type MonthlyFinancialsRow = {
  truck_id: string;
  month: string;
  income: number;
  rent_income: number;
  late_fees: number;
  expenses: number;
  maintenance_expenses: number;
  fuel_expenses: number;
  insurance_expenses: number;
  compliance_expenses: number;
  tax_expenses: number;
  profit: number;
  margin_percent: number | null;
  miles_driven: number;
  cost_per_mile: number | null;
}

export type ExpenseByCategoryRow = {
  truck_id: string;
  category: ExpenseCategory;
  entry_count: number;
  total: number;
  ytd_total: number | null;
  mtd_total: number | null;
  average: number;
  last_expense_on: string | null;
}

export type MaintenanceCostByCategoryRow = {
  truck_id: string;
  category: MaintenanceCategory;
  service_count: number;
  total_cost: number;
  average_cost: number;
  stddev_cost: number | null;
  max_cost: number;
  first_service_on: string | null;
  last_service_on: string | null;
}

export type MonthlyMileageRow = {
  truck_id: string;
  month: string;
  miles_driven: number;
  avg_daily_miles: number | null;
  ending_odometer: number;
  log_count: number;
  avg_mpg: number | null;
  gallons_purchased: number;
}

export type UpcomingServiceRow = {
  id: string;
  truck_id: string;
  name: string;
  category: MaintenanceCategory;
  interval_type: ScheduleInterval;
  next_due_date: string | null;
  next_due_odometer: number | null;
  estimated_cost: number | null;
  current_odometer: number;
  days_remaining: number | null;
  miles_remaining: number | null;
  urgency: 'overdue' | 'due_soon' | 'scheduled';
}

export type ComplianceStatusRow = {
  truck_id: string;
  item: string;
  reference: string | null;
  expires_on: string;
  days_remaining: number;
}

export type TruckKpiRow = {
  truck_id: string;
  odometer: number;
  status: TruckStatus;
  income_mtd: number;
  expenses_mtd: number;
  income_ytd: number;
  expenses_ytd: number;
  outstanding_balance: number;
  miles_mtd: number;
  avg_mpg_90d: number | null;
  next_service_date: string | null;
  next_service_odometer: number | null;
  insurance_expires_on: string | null;
  registration_expires_on: string | null;
  dot_inspection_expires_on: string | null;
  tire_life_percent: number | null;
}

export type FuelEconomyRow = {
  id: string;
  truck_id: string;
  fuel_date: string;
  odometer: number;
  gallons: number;
  miles_since_last: number | null;
  mpg: number | null;
  is_def: boolean;
  is_full_tank: boolean;
  station: string | null;
  city: string | null;
  state: string | null;
}

export type SearchEntityType = 'truck' | 'invoice' | 'maintenance' | 'mileage' | 'document' | 'shop';

export type GlobalSearchRow = {
  entity_type: SearchEntityType;
  entity_id: string;
  title: string;
  subtitle: string | null;
  href: string;
  occurred_on: string | null;
}

// ---------------------------------------------------------------------------
// Database contract consumed by `createClient<Database>()`
// ---------------------------------------------------------------------------
type Table<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

type View<Row> = { Row: Row; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, 'id' | 'email'>;
      trucks: Table<TruckRow, 'truck_number' | 'vin' | 'license_plate' | 'year' | 'make' | 'model'>;
      truck_compliance: Table<TruckComplianceRow, 'truck_id'>;
      drivers: Table<DriverRow, 'full_name'>;
      rental_companies: Table<RentalCompanyRow, 'name'>;
      rental_agreements: Table<RentalAgreementRow, 'truck_id' | 'start_date' | 'rate_amount'>;
      maintenance_records: Table<MaintenanceRecordRow, 'truck_id' | 'category' | 'title'>;
      maintenance_parts: Table<MaintenancePartRow, 'maintenance_id' | 'part_name'>;
      maintenance_schedules: Table<MaintenanceScheduleRow, 'truck_id' | 'name' | 'category'>;
      mileage_logs: Table<MileageLogRow, 'truck_id' | 'odometer'>;
      fuel_logs: Table<FuelLogRow, 'truck_id' | 'odometer' | 'gallons' | 'price_per_gallon'>;
      documents: Table<DocumentRow, 'title' | 'storage_path' | 'file_name'>;
      private_notes: Table<PrivateNoteRow, 'entity_type' | 'entity_id' | 'body'>;
      service_shops: Table<ServiceShopRow, 'name'>;
      truck_locations: Table<TruckLocationRow, 'truck_id' | 'latitude' | 'longitude'>;
      invoices: Table<InvoiceRow, 'truck_id'>;
      invoice_line_items: Table<InvoiceLineItemRow, 'invoice_id' | 'description'>;
      payments: Table<PaymentRow, 'truck_id' | 'amount'>;
      expenses: Table<ExpenseRow, 'truck_id' | 'category' | 'amount'>;
      notifications: Table<NotificationRow, 'type' | 'title'>;
      notification_preferences: Table<NotificationPreferenceRow, 'user_id'>;
      audit_logs: Table<AuditLogRow, 'action' | 'entity_type'>;
      login_history: Table<LoginHistoryRow, 'email'>;
      app_settings: Table<AppSettingsRow, 'id'>;
      ai_conversations: Table<AiConversationRow, 'user_id'>;
      ai_messages: Table<AiMessageRow, 'conversation_id' | 'role' | 'content'>;
    };
    Views: {
      v_monthly_financials: View<MonthlyFinancialsRow>;
      v_expense_by_category: View<ExpenseByCategoryRow>;
      v_maintenance_cost_by_category: View<MaintenanceCostByCategoryRow>;
      v_monthly_mileage: View<MonthlyMileageRow>;
      v_upcoming_services: View<UpcomingServiceRow>;
      v_compliance_status: View<ComplianceStatusRow>;
      v_truck_kpis: View<TruckKpiRow>;
      v_fuel_economy: View<FuelEconomyRow>;
    };
    Functions: {
      current_role_name: { Args: Record<string, never>; Returns: UserRole };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      next_invoice_number: { Args: Record<string, never>; Returns: string };
      global_search: {
        Args: { p_query: string; p_truck_id?: string | null; p_limit_per_type?: number };
        Returns: GlobalSearchRow[];
      };
    };
    Enums: {
      user_role: UserRole;
      truck_status: TruckStatus;
      fuel_type: FuelTypeEnum;
      transmission_type: TransmissionEnum;
      maintenance_type: MaintenanceType;
      maintenance_status: MaintenanceStatus;
      maintenance_category: MaintenanceCategory;
      schedule_interval: ScheduleInterval;
      rate_type: RateType;
      rental_status: RentalStatus;
      payment_type: PaymentType;
      payment_method: PaymentMethod;
      expense_category: ExpenseCategory;
      invoice_status: InvoiceStatus;
      document_category: DocumentCategory;
      mileage_source: MileageSource;
      notification_severity: NotificationSeverity;
      notification_type: NotificationType;
      audit_action: AuditAction;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
export type Views<T extends keyof Database['public']['Views']> =
  Database['public']['Views'][T]['Row'];
