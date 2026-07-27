-- =============================================================================
-- FleetOps · 0006 · Business logic: triggers keep derived data correct no
-- matter which client writes to the database.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- updated_at on every mutable table
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'trucks', 'truck_compliance', 'drivers', 'rental_companies',
    'rental_agreements', 'maintenance_records', 'maintenance_schedules',
    'documents', 'private_notes', 'service_shops', 'invoices', 'payments',
    'expenses', 'notification_preferences', 'app_settings', 'ai_conversations'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- New auth user → profile + notification preferences
-- The first account to sign up becomes the Owner; everyone else defaults to
-- the least-privileged role until an admin promotes them.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.user_role;
  resolved_role  public.user_role;
  is_first_user  boolean;
begin
  select count(*) = 0 into is_first_user from public.profiles;

  begin
    requested_role := nullif(new.raw_user_meta_data ->> 'role', '')::public.user_role;
  exception when others then
    requested_role := null;
  end;

  resolved_role := case
    when is_first_user then 'owner'::public.user_role
    else coalesce(requested_role, 'viewer'::public.user_role)
  end;

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    resolved_role
  )
  on conflict (id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the profile email in sync when the auth email changes.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email, updated_at = now() where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Generic audit trail
-- ---------------------------------------------------------------------------
create or replace function public.audit_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor       uuid := auth.uid();
  actor_mail  text;
  diff        jsonb;
  entity      uuid;
begin
  select email into actor_mail from public.profiles where id = actor;

  if tg_op = 'INSERT' then
    entity := (to_jsonb(new) ->> 'id')::uuid;
    diff := jsonb_build_object('new', to_jsonb(new));
  elsif tg_op = 'UPDATE' then
    entity := (to_jsonb(new) ->> 'id')::uuid;
    select jsonb_object_agg(key, jsonb_build_object('from', old_value, 'to', new_value))
      into diff
    from (
      select key,
             to_jsonb(old) -> key as old_value,
             to_jsonb(new) -> key as new_value
      from jsonb_object_keys(to_jsonb(new)) as key
      where to_jsonb(old) -> key is distinct from to_jsonb(new) -> key
        and key not in ('updated_at', 'created_at')
    ) changed;
    if diff is null then
      return new;  -- nothing meaningful changed
    end if;
  else
    entity := (to_jsonb(old) ->> 'id')::uuid;
    diff := jsonb_build_object('old', to_jsonb(old));
  end if;

  insert into public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, changes)
  values (
    actor,
    actor_mail,
    lower(tg_op)::public.audit_action,
    tg_table_name,
    entity,
    diff
  );

  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'trucks', 'truck_compliance', 'rental_agreements', 'maintenance_records',
    'maintenance_schedules', 'invoices', 'payments', 'expenses', 'documents',
    'profiles', 'drivers', 'rental_companies', 'app_settings'
  ]
  loop
    execute format('drop trigger if exists audit_trigger on public.%I', t);
    execute format(
      'create trigger audit_trigger after insert or update or delete on public.%I
       for each row execute function public.audit_changes()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Mileage: derive miles driven and push the odometer onto the truck
-- ---------------------------------------------------------------------------
create or replace function public.mileage_derive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_odometer integer;
begin
  select odometer into previous_odometer
  from public.mileage_logs
  where truck_id = new.truck_id
    and log_date < new.log_date
  order by log_date desc
  limit 1;

  new.miles_driven := case
    when previous_odometer is null then null
    when new.odometer >= previous_odometer then new.odometer - previous_odometer
    else null
  end;

  return new;
end;
$$;

drop trigger if exists mileage_derive_trigger on public.mileage_logs;
create trigger mileage_derive_trigger
  before insert or update of odometer, log_date on public.mileage_logs
  for each row execute function public.mileage_derive();

create or replace function public.sync_truck_odometer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.trucks
  set odometer = new.odometer,
      odometer_updated_at = now(),
      updated_at = now()
  where id = new.truck_id
    and new.odometer > odometer;
  return new;
end;
$$;

drop trigger if exists sync_truck_odometer_trigger on public.mileage_logs;
create trigger sync_truck_odometer_trigger
  after insert or update of odometer on public.mileage_logs
  for each row execute function public.sync_truck_odometer();

-- ---------------------------------------------------------------------------
-- Fuel: miles since last fill-up and MPG
-- ---------------------------------------------------------------------------
create or replace function public.fuel_derive()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_odometer integer;
begin
  if new.is_def then
    new.miles_since_last := null;
    new.mpg := null;
    return new;
  end if;

  select odometer into previous_odometer
  from public.fuel_logs
  where truck_id = new.truck_id
    and not is_def
    and (fuel_date < new.fuel_date or (fuel_date = new.fuel_date and created_at < coalesce(new.created_at, now())))
    and id is distinct from new.id
  order by fuel_date desc, created_at desc
  limit 1;

  if previous_odometer is not null and new.odometer > previous_odometer then
    new.miles_since_last := new.odometer - previous_odometer;
    new.mpg := case
      when new.gallons > 0 then round((new.miles_since_last / new.gallons)::numeric, 2)
      else null
    end;
  else
    new.miles_since_last := null;
    new.mpg := null;
  end if;

  return new;
end;
$$;

drop trigger if exists fuel_derive_trigger on public.fuel_logs;
create trigger fuel_derive_trigger
  before insert or update of odometer, gallons, fuel_date on public.fuel_logs
  for each row execute function public.fuel_derive();

-- ---------------------------------------------------------------------------
-- Invoices: recompute totals from line items, and status from payments
-- ---------------------------------------------------------------------------
create or replace function public.recalculate_invoice_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
  new_subtotal   numeric(12, 2);
begin
  select coalesce(sum(line_total), 0) into new_subtotal
  from public.invoice_line_items
  where invoice_id = target_invoice;

  update public.invoices
  set subtotal = new_subtotal,
      tax_amount = round(new_subtotal * tax_rate, 2),
      total = round(new_subtotal + (new_subtotal * tax_rate) - discount_amount, 2),
      updated_at = now()
  where id = target_invoice;

  return coalesce(new, old);
end;
$$;

drop trigger if exists invoice_totals_trigger on public.invoice_line_items;
create trigger invoice_totals_trigger
  after insert or update or delete on public.invoice_line_items
  for each row execute function public.recalculate_invoice_totals();

create or replace function public.recalculate_invoice_payments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
  paid           numeric(12, 2);
  invoice_total  numeric(12, 2);
  invoice_due    date;
begin
  if target_invoice is null then
    return coalesce(new, old);
  end if;

  select coalesce(sum(amount), 0) into paid
  from public.payments
  where invoice_id = target_invoice;

  select total, due_date into invoice_total, invoice_due
  from public.invoices
  where id = target_invoice;

  update public.invoices
  set amount_paid = paid,
      paid_at = case when paid >= invoice_total and invoice_total > 0 then now() else null end,
      status = case
        when status = 'void' then 'void'
        when invoice_total > 0 and paid >= invoice_total then 'paid'
        when paid > 0 then 'partial'
        when invoice_due < current_date then 'overdue'
        when status = 'draft' then 'draft'
        else 'sent'
      end,
      updated_at = now()
  where id = target_invoice;

  return coalesce(new, old);
end;
$$;

drop trigger if exists invoice_payment_trigger on public.payments;
create trigger invoice_payment_trigger
  after insert or update or delete on public.payments
  for each row execute function public.recalculate_invoice_payments();

-- Flag payments received after the invoice due date.
create or replace function public.flag_late_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_due date;
begin
  if new.invoice_id is not null then
    select due_date into invoice_due from public.invoices where id = new.invoice_id;
    new.is_late := invoice_due is not null and new.payment_date > invoice_due;
  end if;
  return new;
end;
$$;

drop trigger if exists flag_late_payment_trigger on public.payments;
create trigger flag_late_payment_trigger
  before insert or update of payment_date, invoice_id on public.payments
  for each row execute function public.flag_late_payment();

-- ---------------------------------------------------------------------------
-- Maintenance: mirror completed work orders into expenses, advance schedules
-- and keep the odometer fresh.
-- ---------------------------------------------------------------------------
create or replace function public.sync_maintenance_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_expense uuid;
  target_category  public.expense_category;
begin
  if tg_op = 'DELETE' then
    delete from public.expenses where maintenance_id = old.id;
    return old;
  end if;

  select id into existing_expense from public.expenses where maintenance_id = new.id limit 1;

  if new.status <> 'completed' or new.cost_total <= 0 or new.is_warranty then
    if existing_expense is not null then
      delete from public.expenses where id = existing_expense;
    end if;
    return new;
  end if;

  target_category := case
    when new.type = 'repair' then 'repair'::public.expense_category
    when new.category = 'tires' then 'tires'::public.expense_category
    else 'maintenance'::public.expense_category
  end;

  if existing_expense is null then
    insert into public.expenses (
      truck_id, expense_date, category, amount, vendor, description,
      maintenance_id, recorded_by
    )
    values (
      new.truck_id, new.service_date, target_category, new.cost_total,
      new.shop_name, new.title, new.id, coalesce(new.updated_by, new.created_by)
    );
  else
    update public.expenses
    set expense_date = new.service_date,
        category = target_category,
        amount = new.cost_total,
        vendor = new.shop_name,
        description = new.title,
        updated_at = now()
    where id = existing_expense;
  end if;

  return new;
end;
$$;

drop trigger if exists maintenance_expense_trigger on public.maintenance_records;
create trigger maintenance_expense_trigger
  after insert or update or delete on public.maintenance_records
  for each row execute function public.sync_maintenance_expense();

create or replace function public.advance_maintenance_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  schedule record;
begin
  if new.status <> 'completed' then
    return new;
  end if;

  -- Push the odometer forward if this service recorded a higher reading.
  if new.odometer is not null then
    update public.trucks
    set odometer = new.odometer,
        odometer_updated_at = now(),
        updated_at = now()
    where id = new.truck_id and new.odometer > odometer;
  end if;

  for schedule in
    select * from public.maintenance_schedules
    where truck_id = new.truck_id and category = new.category and is_active
  loop
    update public.maintenance_schedules
    set last_service_odometer = coalesce(new.odometer, last_service_odometer),
        last_service_date = new.service_date,
        next_due_odometer = case
          when schedule.interval_type = 'miles' and new.odometer is not null
            then new.odometer + schedule.interval_miles
          else schedule.next_due_odometer
        end,
        next_due_date = case
          when schedule.interval_type = 'days'
            then (new.service_date + (schedule.interval_days || ' days')::interval)::date
          else schedule.next_due_date
        end,
        updated_at = now()
    where id = schedule.id;
  end loop;

  return new;
end;
$$;

drop trigger if exists advance_schedule_trigger on public.maintenance_records;
create trigger advance_schedule_trigger
  after insert or update of status, odometer, service_date on public.maintenance_records
  for each row execute function public.advance_maintenance_schedule();

-- ---------------------------------------------------------------------------
-- Fuel logs feed the expense ledger too.
-- ---------------------------------------------------------------------------
create or replace function public.sync_fuel_expense()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_expense uuid;
  expense_label    text;
begin
  if tg_op = 'DELETE' then
    delete from public.expenses where fuel_log_id = old.id;
    return old;
  end if;

  expense_label := case when new.is_def then 'DEF purchase' else 'Fuel purchase' end
    || coalesce(' - ' || new.city || ', ' || new.state, '');

  select id into existing_expense from public.expenses where fuel_log_id = new.id limit 1;

  if existing_expense is null then
    insert into public.expenses (
      truck_id, expense_date, category, amount, vendor, description, fuel_log_id, recorded_by
    )
    values (
      new.truck_id,
      new.fuel_date,
      case when new.is_def then 'def'::public.expense_category else 'fuel'::public.expense_category end,
      new.total_cost,
      new.station,
      expense_label,
      new.id,
      new.created_by
    );
  else
    update public.expenses
    set expense_date = new.fuel_date,
        category = case when new.is_def then 'def'::public.expense_category else 'fuel'::public.expense_category end,
        amount = new.total_cost,
        vendor = new.station,
        description = expense_label,
        updated_at = now()
    where id = existing_expense;
  end if;

  return new;
end;
$$;

drop trigger if exists fuel_expense_trigger on public.fuel_logs;
create trigger fuel_expense_trigger
  after insert or update or delete on public.fuel_logs
  for each row execute function public.sync_fuel_expense();

-- ---------------------------------------------------------------------------
-- Invoice numbering from app_settings
-- ---------------------------------------------------------------------------
create or replace function public.next_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  prefix      text;
  next_number integer;
begin
  update public.app_settings
  set invoice_next_number = invoice_next_number + 1
  where id
  returning invoice_prefix, invoice_next_number - 1 into prefix, next_number;

  return format('%s-%s', prefix, lpad(next_number::text, 4, '0'));
end;
$$;

create or replace function public.assign_invoice_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.invoice_number is null or new.invoice_number = '' then
    new.invoice_number := public.next_invoice_number();
  end if;
  return new;
end;
$$;

drop trigger if exists assign_invoice_number_trigger on public.invoices;
create trigger assign_invoice_number_trigger
  before insert on public.invoices
  for each row execute function public.assign_invoice_number();

-- ---------------------------------------------------------------------------
-- One derived expense per source record.
-- ---------------------------------------------------------------------------
create unique index if not exists expenses_maintenance_unique
  on public.expenses (maintenance_id) where maintenance_id is not null;
create unique index if not exists expenses_fuel_log_unique
  on public.expenses (fuel_log_id) where fuel_log_id is not null;
