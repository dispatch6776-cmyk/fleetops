-- =============================================================================
-- FleetOps · 0001 · Extensions, enumerated types and helper functions
-- =============================================================================

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;
create extension if not exists "btree_gist" with schema extensions;

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.user_role as enum ('owner', 'admin', 'maintenance', 'mechanic', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.truck_status as enum ('active', 'inactive', 'in_repair', 'out_of_service');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.fuel_type as enum ('diesel', 'def_diesel', 'gasoline', 'cng', 'lng', 'electric', 'hybrid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transmission_type as enum ('manual', 'automatic', 'automated_manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.maintenance_type as enum ('preventive', 'repair', 'warranty', 'recall', 'inspection', 'upgrade');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.maintenance_status as enum ('scheduled', 'in_progress', 'completed', 'deferred', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.maintenance_category as enum (
    'oil_change', 'brake_service', 'transmission', 'engine', 'turbo', 'cooling',
    'battery', 'electrical', 'tires', 'alignment', 'suspension', 'steering',
    'lights', 'def_system', 'dpf', 'exhaust', 'drivetrain', 'clutch', 'air_system',
    'hvac', 'body', 'trailer', 'inspection', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.schedule_interval as enum ('miles', 'days', 'engine_hours');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rate_type as enum ('daily', 'weekly', 'monthly', 'per_mile', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rental_status as enum ('pending', 'active', 'ended', 'terminated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_type as enum (
    'rent_monthly', 'rent_weekly', 'rent_daily', 'deposit', 'deposit_refund',
    'late_fee', 'damage_fee', 'mileage_overage', 'reimbursement', 'custom'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash', 'check', 'ach', 'wire', 'card', 'zelle', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.expense_category as enum (
    'maintenance', 'repair', 'tires', 'fuel', 'def', 'insurance', 'registration',
    'permits', 'ifta', 'tolls', 'parking', 'taxes', 'loan_payment', 'lease_payment',
    'accounting', 'roadside', 'towing', 'equipment', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_status as enum ('draft', 'sent', 'partial', 'paid', 'overdue', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.document_category as enum (
    'insurance', 'registration', 'title', 'lease', 'rental_agreement', 'invoice',
    'receipt', 'dot', 'inspection', 'permit', 'ifta', 'photo', 'video', 'warranty', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.mileage_source as enum ('manual', 'eld', 'import', 'fuel_log', 'maintenance');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_severity as enum ('critical', 'warning', 'info', 'success');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum (
    'maintenance_due', 'maintenance_overdue', 'insurance_expiring', 'registration_expiring',
    'inspection_due', 'payment_due', 'payment_late', 'document_missing', 'document_expiring',
    'mileage_missing', 'cost_anomaly', 'system'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.audit_action as enum ('insert', 'update', 'delete', 'login', 'logout', 'export', 'download', 'invite');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Helper functions used by every RLS policy.
-- SECURITY DEFINER + a locked search_path avoids recursive policy evaluation
-- when a policy needs to read `profiles`.
--
-- `profiles` itself isn't created until migration 0002 — these functions are
-- only ever called from 0008 onward, but Postgres validates `language sql`
-- function bodies against the catalog at CREATE time by default
-- (`check_function_bodies`), so a forward reference to a not-yet-existing
-- table would otherwise fail on a fresh database. Deferring that check for
-- just this block (restored immediately after) is the standard fix and
-- doesn't require reordering the migrations.
-- ---------------------------------------------------------------------------

set check_function_bodies = off;

create or replace function public.current_role_name()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid() and p.is_active
  limit 1;
$$;

comment on function public.current_role_name() is
  'Role of the signed-in user, or NULL when unauthenticated/deactivated.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() in ('owner', 'admin'), false);
$$;

comment on function public.is_admin() is
  'True for Owner and Administrator — the only roles allowed to see financial data.';

create or replace function public.can_edit_maintenance()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() in ('owner', 'admin', 'maintenance', 'mechanic'), false);
$$;

create or replace function public.can_view_operations()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() in ('owner', 'admin', 'maintenance', 'viewer'), false);
$$;

create or replace function public.is_authenticated_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role_name() is not null;
$$;

-- Generic `updated_at` maintenance.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

set check_function_bodies = on;
