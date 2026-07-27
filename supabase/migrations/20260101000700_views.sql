-- =============================================================================
-- FleetOps · 0007 · Reporting views
--
-- Every view is declared with `security_invoker = on` so the caller's RLS
-- policies apply. Without it a view would run as its owner and silently leak
-- financial rows to non-financial roles.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Monthly income, expense and profit per truck
-- ---------------------------------------------------------------------------
create or replace view public.v_monthly_financials
with (security_invoker = on) as
with months as (
  select
    t.id as truck_id,
    date_trunc('month', gs)::date as month
  from public.trucks t
  cross join lateral generate_series(
    date_trunc('month', coalesce(t.purchase_date, current_date - interval '11 months')),
    date_trunc('month', current_date),
    interval '1 month'
  ) as gs
),
income as (
  select truck_id,
         date_trunc('month', payment_date)::date as month,
         sum(amount) filter (where type not in ('deposit', 'deposit_refund')) as rent_income,
         sum(amount) filter (where type = 'late_fee') as late_fees,
         sum(amount) as total_income
  from public.payments
  group by 1, 2
),
spend as (
  select truck_id,
         date_trunc('month', expense_date)::date as month,
         sum(amount) as total_expenses,
         sum(amount) filter (where category in ('maintenance', 'repair', 'tires')) as maintenance_expenses,
         sum(amount) filter (where category in ('fuel', 'def')) as fuel_expenses,
         sum(amount) filter (where category = 'insurance') as insurance_expenses,
         sum(amount) filter (where category in ('registration', 'permits', 'ifta')) as compliance_expenses,
         sum(amount) filter (where category in ('taxes')) as tax_expenses
  from public.expenses
  group by 1, 2
),
miles as (
  select truck_id,
         date_trunc('month', log_date)::date as month,
         sum(coalesce(miles_driven, 0)) as miles_driven
  from public.mileage_logs
  group by 1, 2
)
select
  m.truck_id,
  m.month,
  coalesce(i.total_income, 0)::numeric(12, 2)          as income,
  coalesce(i.rent_income, 0)::numeric(12, 2)           as rent_income,
  coalesce(i.late_fees, 0)::numeric(12, 2)             as late_fees,
  coalesce(s.total_expenses, 0)::numeric(12, 2)        as expenses,
  coalesce(s.maintenance_expenses, 0)::numeric(12, 2)  as maintenance_expenses,
  coalesce(s.fuel_expenses, 0)::numeric(12, 2)         as fuel_expenses,
  coalesce(s.insurance_expenses, 0)::numeric(12, 2)    as insurance_expenses,
  coalesce(s.compliance_expenses, 0)::numeric(12, 2)   as compliance_expenses,
  coalesce(s.tax_expenses, 0)::numeric(12, 2)          as tax_expenses,
  (coalesce(i.total_income, 0) - coalesce(s.total_expenses, 0))::numeric(12, 2) as profit,
  case
    when coalesce(i.total_income, 0) > 0
      then round(((coalesce(i.total_income, 0) - coalesce(s.total_expenses, 0)) / i.total_income) * 100, 1)
    else null
  end as margin_percent,
  coalesce(mi.miles_driven, 0)::integer as miles_driven,
  case
    when coalesce(mi.miles_driven, 0) > 0
      then round((coalesce(s.total_expenses, 0) / mi.miles_driven)::numeric, 3)
    else null
  end as cost_per_mile
from months m
left join income i on i.truck_id = m.truck_id and i.month = m.month
left join spend  s on s.truck_id = m.truck_id and s.month = m.month
left join miles mi on mi.truck_id = m.truck_id and mi.month = m.month;

comment on view public.v_monthly_financials is
  'Month-by-month P&L per truck. Visible only to roles allowed to read payments and expenses.';

-- ---------------------------------------------------------------------------
-- Expense breakdown by category (all time and current year)
-- ---------------------------------------------------------------------------
create or replace view public.v_expense_by_category
with (security_invoker = on) as
select
  truck_id,
  category,
  count(*)                                        as entry_count,
  sum(amount)::numeric(12, 2)                     as total,
  sum(amount) filter (
    where expense_date >= date_trunc('year', current_date)
  )::numeric(12, 2)                               as ytd_total,
  sum(amount) filter (
    where expense_date >= date_trunc('month', current_date)
  )::numeric(12, 2)                               as mtd_total,
  avg(amount)::numeric(12, 2)                     as average,
  max(expense_date)                               as last_expense_on
from public.expenses
group by truck_id, category;

-- ---------------------------------------------------------------------------
-- Maintenance cost by category, with anomaly inputs for the AI assistant
-- ---------------------------------------------------------------------------
create or replace view public.v_maintenance_cost_by_category
with (security_invoker = on) as
select
  truck_id,
  category,
  count(*)                            as service_count,
  sum(cost_total)::numeric(12, 2)     as total_cost,
  avg(cost_total)::numeric(12, 2)     as average_cost,
  stddev_pop(cost_total)::numeric(12, 2) as stddev_cost,
  max(cost_total)::numeric(12, 2)     as max_cost,
  min(service_date)                   as first_service_on,
  max(service_date)                   as last_service_on
from public.maintenance_records
where status = 'completed'
group by truck_id, category;

-- ---------------------------------------------------------------------------
-- Monthly mileage and fuel economy
-- ---------------------------------------------------------------------------
-- Deliberately NOT security_invoker: it exposes only non-financial aggregates
-- so operations roles can see fuel economy without gaining access to fuel cost
-- rows. Access is controlled by the GRANT in migration 0008.
create or replace view public.v_monthly_mileage as
with monthly as (
  select
    l.truck_id,
    date_trunc('month', l.log_date)::date          as month,
    sum(coalesce(l.miles_driven, 0))::integer      as miles_driven,
    round(avg(nullif(l.miles_driven, 0))::numeric, 1) as avg_daily_miles,
    max(l.odometer)                                as ending_odometer,
    count(*)                                       as log_count
  from public.mileage_logs l
  group by l.truck_id, date_trunc('month', l.log_date)
)
select
  monthly.truck_id,
  monthly.month,
  monthly.miles_driven,
  monthly.avg_daily_miles,
  monthly.ending_odometer,
  monthly.log_count,
  (
    select round(avg(f.mpg)::numeric, 2)
    from public.fuel_logs f
    where f.truck_id = monthly.truck_id
      and date_trunc('month', f.fuel_date) = monthly.month
      and f.mpg is not null
  )                                              as avg_mpg,
  (
    select coalesce(sum(f.gallons), 0)::numeric(10, 2)
    from public.fuel_logs f
    where f.truck_id = monthly.truck_id
      and date_trunc('month', f.fuel_date) = monthly.month
      and not f.is_def
  )                                              as gallons_purchased
from monthly;

-- ---------------------------------------------------------------------------
-- Upcoming and overdue services, unified across schedules and work orders
-- ---------------------------------------------------------------------------
create or replace view public.v_upcoming_services
with (security_invoker = on) as
select
  s.id,
  s.truck_id,
  s.name,
  s.category,
  s.interval_type,
  s.next_due_date,
  s.next_due_odometer,
  s.estimated_cost,
  t.odometer                                                as current_odometer,
  (s.next_due_date - current_date)                          as days_remaining,
  (s.next_due_odometer - t.odometer)                        as miles_remaining,
  case
    when s.next_due_date is not null and s.next_due_date < current_date then 'overdue'
    when s.next_due_odometer is not null and t.odometer >= s.next_due_odometer then 'overdue'
    when s.next_due_date is not null and s.next_due_date <= current_date + s.notify_days_before then 'due_soon'
    when s.next_due_odometer is not null
      and t.odometer >= s.next_due_odometer - s.notify_miles_before then 'due_soon'
    else 'scheduled'
  end                                                       as urgency
from public.maintenance_schedules s
join public.trucks t on t.id = s.truck_id
where s.is_active;

-- ---------------------------------------------------------------------------
-- Compliance countdown (insurance, registration, DOT, IFTA)
-- ---------------------------------------------------------------------------
create or replace view public.v_compliance_status
with (security_invoker = on) as
select
  c.truck_id,
  'insurance'   as item,
  c.insurance_provider          as reference,
  c.insurance_expires_on        as expires_on,
  (c.insurance_expires_on - current_date) as days_remaining
from public.truck_compliance c where c.insurance_expires_on is not null
union all
select c.truck_id, 'registration', c.registration_state, c.registration_expires_on,
       (c.registration_expires_on - current_date)
from public.truck_compliance c where c.registration_expires_on is not null
union all
select c.truck_id, 'dot_inspection', c.dot_number, c.dot_inspection_expires_on,
       (c.dot_inspection_expires_on - current_date)
from public.truck_compliance c where c.dot_inspection_expires_on is not null
union all
select c.truck_id, 'ifta', c.ifta_account, c.ifta_expires_on,
       (c.ifta_expires_on - current_date)
from public.truck_compliance c where c.ifta_expires_on is not null
union all
select d.truck_id, 'document:' || d.category::text, d.title, d.expires_on,
       (d.expires_on - current_date)
from public.documents d where d.expires_on is not null and d.truck_id is not null;

-- ---------------------------------------------------------------------------
-- Rolling KPI snapshot used by the dashboard
-- ---------------------------------------------------------------------------
create or replace view public.v_truck_kpis
with (security_invoker = on) as
select
  t.id                                        as truck_id,
  t.odometer,
  t.status,
  (
    select coalesce(sum(p.amount), 0)::numeric(12, 2)
    from public.payments p
    where p.truck_id = t.id
      and p.payment_date >= date_trunc('month', current_date)
  )                                           as income_mtd,
  (
    select coalesce(sum(e.amount), 0)::numeric(12, 2)
    from public.expenses e
    where e.truck_id = t.id
      and e.expense_date >= date_trunc('month', current_date)
  )                                           as expenses_mtd,
  (
    select coalesce(sum(p.amount), 0)::numeric(12, 2)
    from public.payments p
    where p.truck_id = t.id
      and p.payment_date >= date_trunc('year', current_date)
  )                                           as income_ytd,
  (
    select coalesce(sum(e.amount), 0)::numeric(12, 2)
    from public.expenses e
    where e.truck_id = t.id
      and e.expense_date >= date_trunc('year', current_date)
  )                                           as expenses_ytd,
  (
    select coalesce(sum(i.balance), 0)::numeric(12, 2)
    from public.invoices i
    where i.truck_id = t.id and i.status in ('sent', 'partial', 'overdue')
  )                                           as outstanding_balance,
  (
    select coalesce(sum(l.miles_driven), 0)::integer
    from public.mileage_logs l
    where l.truck_id = t.id
      and l.log_date >= date_trunc('month', current_date)
  )                                           as miles_mtd,
  (
    select round(avg(f.mpg)::numeric, 2)
    from public.fuel_logs f
    where f.truck_id = t.id
      and f.fuel_date >= current_date - interval '90 days'
      and f.mpg is not null
  )                                           as avg_mpg_90d,
  (
    select min(s.next_due_date)
    from public.maintenance_schedules s
    where s.truck_id = t.id and s.is_active and s.next_due_date is not null
  )                                           as next_service_date,
  (
    select min(s.next_due_odometer)
    from public.maintenance_schedules s
    where s.truck_id = t.id and s.is_active and s.next_due_odometer is not null
  )                                           as next_service_odometer,
  c.insurance_expires_on,
  c.registration_expires_on,
  c.dot_inspection_expires_on,
  case
    when t.tire_installed_miles is not null and t.tire_life_miles > 0
      then greatest(0, round(100 - ((t.odometer - t.tire_installed_miles)::numeric / t.tire_life_miles) * 100, 0))
    else null
  end                                         as tire_life_percent
from public.trucks t
left join public.truck_compliance c on c.truck_id = t.id;

-- ---------------------------------------------------------------------------
-- Fuel economy without money — safe for Maintenance, Mechanic and Viewer.
-- Not security_invoker by design (see v_monthly_mileage above).
-- ---------------------------------------------------------------------------
create or replace view public.v_fuel_economy as
select
  f.id,
  f.truck_id,
  f.fuel_date,
  f.odometer,
  f.gallons,
  f.miles_since_last,
  f.mpg,
  f.is_def,
  f.is_full_tank,
  f.station,
  f.city,
  f.state
from public.fuel_logs f;
