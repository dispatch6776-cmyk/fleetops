import type { Role } from '@/lib/permissions';
import type {
  ComplianceStatusRow,
  DocumentRow,
  DriverRow,
  ExpenseByCategoryRow,
  ExpenseRow,
  FuelEconomyRow,
  FuelLogRow,
  InvoiceLineItemRow,
  InvoiceRow,
  MaintenanceCostByCategoryRow,
  MaintenancePartRow,
  MaintenanceRecordRow,
  MaintenanceScheduleRow,
  MileageLogRow,
  MonthlyFinancialsRow,
  MonthlyMileageRow,
  NotificationRow,
  PaymentRow,
  ProfileRow,
  RentalAgreementRow,
  RentalCompanyRow,
  ServiceShopRow,
  TruckComplianceRow,
  TruckKpiRow,
  TruckLocationRow,
  TruckRow,
  UpcomingServiceRow,
} from './database.types';

export * from './database.types';
export type { Role };

export type UUID = string;
export type ISODate = string;

/** Domain aliases — shorter names for the row types used across the UI. */
export type Profile = ProfileRow;
export type Truck = TruckRow;
export type Compliance = TruckComplianceRow;
export type Driver = DriverRow;
export type RentalCompany = RentalCompanyRow;
export type RentalAgreement = RentalAgreementRow;
export type MaintenanceRecord = MaintenanceRecordRow;
export type MaintenancePart = MaintenancePartRow;
export type MaintenanceSchedule = MaintenanceScheduleRow;
export type MileageLog = MileageLogRow;
export type FuelLog = FuelLogRow;
export type FuelEconomy = FuelEconomyRow;
export type DocumentRecord = DocumentRow;
export type ServiceShop = ServiceShopRow;
export type TruckLocation = TruckLocationRow;
export type Invoice = InvoiceRow;
export type InvoiceLineItem = InvoiceLineItemRow;
export type Payment = PaymentRow;
export type Expense = ExpenseRow;
export type NotificationRecord = NotificationRow;
export type TruckKpis = TruckKpiRow;
export type MonthlyFinancials = MonthlyFinancialsRow;
export type MonthlyMileage = MonthlyMileageRow;
export type ExpenseByCategory = ExpenseByCategoryRow;
export type MaintenanceCostByCategory = MaintenanceCostByCategoryRow;
export type UpcomingService = UpcomingServiceRow;
export type ComplianceStatus = ComplianceStatusRow;

/** A maintenance work order with its parts and attachments joined in. */
export interface MaintenanceRecordDetail extends MaintenanceRecord {
  parts: MaintenancePart[];
  documents: DocumentRecord[];
}

/** An invoice with its line items and payments joined in. */
export interface InvoiceDetail extends Invoice {
  line_items: InvoiceLineItem[];
  payments: Payment[];
  rental_company: RentalCompany | null;
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  dueDate: ISODate | null;
  href: string;
  category: 'compliance' | 'maintenance' | 'financial' | 'document' | 'mileage';
}

export interface PaginatedResult<T> {
  rows: T[];
  count: number;
  page: number;
  pageSize: number;
}

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

export interface DateRange {
  from: ISODate;
  to: ISODate;
}
