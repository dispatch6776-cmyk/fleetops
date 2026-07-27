-- =============================================================================
-- FleetOps · Seed data
--
-- Eighteen months of realistic operating history for one leased Class-8 truck,
-- so every chart, report and alert has something to render on first run.
--
-- Remove it at any time with:
--   delete from public.trucks where id = '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11';
-- (all child rows cascade)
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Company settings
-- ---------------------------------------------------------------------------
update public.app_settings
set company_name = 'Dispatch Holdings LLC',
    company_email = 'billing@dispatchholdings.example',
    company_phone = '(312) 555-0142',
    company_address = '1240 W Randolph St, Chicago, IL 60607',
    timezone = 'America/Chicago',
    invoice_prefix = 'INV',
    invoice_next_number = 1015,
    default_tax_rate = 0,
    alert_days_before = 30
where id;

-- ---------------------------------------------------------------------------
-- The truck
-- ---------------------------------------------------------------------------
insert into public.trucks (
  id, truck_number, vin, license_plate, plate_state, year, make, model, color,
  engine, engine_hours, transmission, odometer, odometer_updated_at, fuel_type,
  tank_capacity_gal, tire_size, tire_installed_miles, tire_life_miles, gvwr_lbs,
  axles, status, purchase_date, purchase_price, current_value, notes
) values (
  '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11',
  'T-101',
  '1FUJGLDR9MLMK4821',
  'P472913',
  'IL',
  2021,
  'Freightliner',
  'Cascadia 126',
  'Steel Grey',
  'Detroit DD15 505 HP',
  9840.5,
  'automated_manual',
  585000,
  now(),
  'diesel',
  240,
  '295/75R22.5',
  512000,
  120000,
  80000,
  3,
  'active',
  '2021-06-18',
  118500.00,
  62000.00,
  'Leased to Midwest Freight Logistics under a monthly agreement. Owner retains maintenance responsibility above $500 per event.'
) on conflict (id) do nothing;

insert into public.truck_compliance (
  truck_id, insurance_provider, insurance_policy_number, insurance_effective_on,
  insurance_expires_on, insurance_monthly_cost, insurance_agent_phone,
  registration_state, registration_number, registration_expires_on,
  registration_annual_cost, dot_number, mc_number, dot_inspection_on,
  dot_inspection_expires_on, ifta_account, ifta_expires_on, eld_provider, eld_device_id
) values (
  '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11',
  'Progressive Commercial', 'PC-88214470',
  current_date - interval '8 months', current_date + interval '4 months', 685.00,
  '(800) 555-0188',
  'IL', 'IL-472913', current_date + interval '52 days', 3210.00,
  '3184920', 'MC-1188420',
  current_date - interval '7 months', current_date + interval '5 months',
  'IL-IFTA-44821', date_trunc('year', current_date) + interval '1 year' - interval '1 day',
  'Motive', 'MTV-4821-KX'
) on conflict (truck_id) do nothing;

-- ---------------------------------------------------------------------------
-- Renter and driver
-- ---------------------------------------------------------------------------
insert into public.rental_companies (
  id, name, contact_name, phone, email, address_line1, city, state, postal_code,
  dot_number, mc_number, notes
) values (
  'a1c3f5e7-9b2d-4a6c-8e0f-3d5b7a9c1e42',
  'Midwest Freight Logistics LLC', 'Ray Okonkwo', '(414) 555-0119',
  'ray@midwestfreight.example', '8820 S Sayre Ave', 'Milwaukee', 'WI', '53214',
  '2884120', 'MC-994210',
  'Pays by ACH on the 1st. Reliable since 2024; one late payment in the period.'
) on conflict (id) do nothing;

insert into public.drivers (
  id, full_name, phone, email, license_number, license_state,
  license_expires_on, medical_card_expires_on, hire_date, is_active, notes
) values (
  'b2d4f6a8-0c1e-4b7d-9f3a-5e7c9b1d3f64',
  'Marcus Bell', '(414) 555-0177', 'marcus.bell@midwestfreight.example',
  'B4419-8820-1174', 'WI',
  current_date + interval '19 months', current_date + interval '3 months',
  current_date - interval '16 months', true,
  'Primary driver assigned by the renter. DOT medical card renews in three months.'
) on conflict (id) do nothing;

insert into public.rental_agreements (
  id, truck_id, rental_company_id, driver_id, agreement_number, start_date,
  end_date, rate_type, rate_amount, deposit_amount, mileage_allowance,
  overage_rate, payment_day, late_fee_amount, late_fee_grace_days, status, terms
) values (
  'c3e5a7b9-1d2f-4c8e-a0b4-6f8d0c2e4a75',
  '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11',
  'a1c3f5e7-9b2d-4a6c-8e0f-3d5b7a9c1e42',
  'b2d4f6a8-0c1e-4b7d-9f3a-5e7c9b1d3f64',
  'RA-2025-014',
  (date_trunc('month', current_date) - interval '17 months')::date,
  null, 'monthly', 4500.00, 5000.00, 12000, 0.18, 1, 150.00, 3, 'active',
  'Renter covers fuel, tolls and driver expenses. Owner covers scheduled maintenance, insurance and registration. Deposit refundable on return in comparable condition.'
) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Preventive maintenance schedules
-- ---------------------------------------------------------------------------
insert into public.maintenance_schedules (
  truck_id, name, category, interval_type, interval_miles, interval_days,
  last_service_odometer, last_service_date, next_due_odometer, next_due_date,
  notify_miles_before, notify_days_before, estimated_cost
) values
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'Engine oil & filter', 'oil_change',
   'miles', 25000, null, 572000, current_date - interval '35 days', 597000, null, 1500, 14, 425.00),
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'Brake inspection & adjustment', 'brake_service',
   'miles', 60000, null, 548000, current_date - interval '5 months', 608000, null, 3000, 21, 980.00),
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'DPF cleaning', 'dpf',
   'miles', 200000, null, 425000, current_date - interval '15 months', 625000, null, 8000, 30, 1150.00),
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'Annual DOT inspection', 'inspection',
   'days', null, 365, null, current_date - interval '7 months', null, current_date + interval '5 months', 0, 30, 320.00),
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'Drive tire replacement', 'tires',
   'miles', 120000, null, 512000, current_date - interval '9 months', 632000, null, 6000, 30, 3400.00),
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'Transmission service', 'transmission',
   'miles', 150000, null, 480000, current_date - interval '13 months', 630000, null, 5000, 30, 890.00)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Mileage history — weekly odometer readings for 18 months
-- ---------------------------------------------------------------------------
insert into public.mileage_logs (truck_id, log_date, odometer, source, driver_id, notes)
select
  '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11',
  week::date,
  585000 - (
    (extract(epoch from (date_trunc('week', current_date) - week)) / 604800)::int * 2380
  ) + ((random() * 240)::int - 120),
  'eld',
  'b2d4f6a8-0c1e-4b7d-9f3a-5e7c9b1d3f64',
  null
from generate_series(
  date_trunc('week', current_date - interval '18 months'),
  date_trunc('week', current_date),
  interval '1 week'
) as week
on conflict (truck_id, log_date) do nothing;

-- ---------------------------------------------------------------------------
-- Fuel history — a fill-up roughly every five days
-- ---------------------------------------------------------------------------
insert into public.fuel_logs (
  truck_id, fuel_date, odometer, gallons, price_per_gallon, is_def,
  station, city, state, driver_id
)
select
  '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11',
  day::date,
  585000 - ((extract(epoch from (current_date - day)) / 86400)::int * 340),
  round((118 + random() * 26)::numeric, 3),
  round((3.55 + random() * 0.95)::numeric, 3),
  false,
  (array['Pilot Flying J', 'Love''s Travel Stop', 'TA Travel Center', 'Petro Stopping Center'])[1 + floor(random() * 4)::int],
  (array['Effingham', 'Gary', 'Rockford', 'Madison', 'Joliet'])[1 + floor(random() * 5)::int],
  (array['IL', 'IN', 'IL', 'WI', 'IL'])[1 + floor(random() * 5)::int],
  'b2d4f6a8-0c1e-4b7d-9f3a-5e7c9b1d3f64'
from generate_series(
  current_date - interval '15 months',
  current_date - interval '2 days',
  interval '5 days'
) as day;

-- DEF top-ups, monthly
insert into public.fuel_logs (
  truck_id, fuel_date, odometer, gallons, price_per_gallon, is_def, station, state, driver_id
)
select
  '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11',
  month::date + 12,
  585000 - ((extract(epoch from (current_date - month)) / 86400)::int * 340),
  round((22 + random() * 8)::numeric, 3),
  round((3.10 + random() * 0.40)::numeric, 3),
  true,
  'Love''s Travel Stop',
  'IL',
  'b2d4f6a8-0c1e-4b7d-9f3a-5e7c9b1d3f64'
from generate_series(
  date_trunc('month', current_date - interval '15 months'),
  date_trunc('month', current_date - interval '1 month'),
  interval '1 month'
) as month;

commit;

begin;

-- ---------------------------------------------------------------------------
-- Maintenance history — 18 months of preventive work and repairs.
-- The maintenance trigger mirrors every completed, non-warranty record into
-- the expense ledger automatically.
-- ---------------------------------------------------------------------------
insert into public.maintenance_records (
  truck_id, type, category, status, title, description, service_date, odometer,
  cost_parts, cost_labor, cost_tax, is_warranty, shop_name, shop_phone,
  mechanic_name, invoice_number, downtime_days, notes
) values
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'preventive', 'oil_change', 'completed',
   'Engine oil & filter change', 'Full synthetic 15W-40, oil filter, fuel filters and chassis lube.',
   current_date - interval '35 days', 572000, 268.40, 145.00, 21.60, false,
   'TA Truck Service — Effingham', '(217) 555-0164', 'Dale Whitmore', 'TA-448210', 0.5, null),

  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'repair', 'cooling', 'completed',
   'Radiator hose replacement', 'Upper radiator hose failed on I-57. Replaced hose and clamps, pressure tested, topped off coolant.',
   current_date - interval '2 months', 566500, 184.00, 260.00, 24.20, false,
   'Freightliner of Chicago', '(773) 555-0121', 'Andre Kim', 'FCH-99120', 1.0,
   'Roadside tow covered separately under the roadside expense entry.'),

  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'preventive', 'oil_change', 'completed',
   'Engine oil & filter change', 'Full synthetic 15W-40 with filter package.',
   current_date - interval '4 months', 548000, 262.10, 145.00, 21.20, false,
   'TA Truck Service — Effingham', '(217) 555-0164', 'Dale Whitmore', 'TA-441880', 0.5, null),

  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'preventive', 'brake_service', 'completed',
   'Brake inspection & adjustment', 'All-axle brake inspection, slack adjuster service, drum measurement within spec.',
   current_date - interval '5 months', 542000, 96.00, 420.00, 25.80, false,
   'Midwest Brake & Alignment', '(815) 555-0133', 'Peter Vance', 'MBA-20714', 1.0, null),

  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'repair', 'def_system', 'completed',
   'DEF pump replacement', 'Fault code SPN 3364. Replaced DEF supply pump and filter, cleared codes, road tested 40 miles.',
   current_date - interval '6 months', 536200, 1180.00, 520.00, 88.40, false,
   'Freightliner of Chicago', '(773) 555-0121', 'Andre Kim', 'FCH-98014', 2.0,
   'Second DEF-related repair in twelve months — watch for a pattern.'),

  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'inspection', 'inspection', 'completed',
   'Annual DOT inspection', 'Federal annual inspection. Passed with no defects noted.',
   current_date - interval '7 months', 530000, 0.00, 295.00, 18.20, false,
   'Illinois Truck Inspection Center', '(312) 555-0190', 'Rosa Delgado', 'ITIC-7741', 0.5, null),

  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'preventive', 'oil_change', 'completed',
   'Engine oil & filter change', 'Full synthetic 15W-40 with filter package.',
   current_date - interval '8 months', 524000, 259.80, 145.00, 21.00, false,
   'TA Truck Service — Effingham', '(217) 555-0164', 'Dale Whitmore', 'TA-434102', 0.5, null),

  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'preventive', 'tires', 'completed',
   'Drive tire replacement (8)', 'Eight new drive tires, mounted and balanced, valve stems replaced, old casings returned for credit.',
   current_date - interval '9 months', 512000, 2980.00, 380.00, 210.60, false,
   'Love''s Truck Care — Gary', '(219) 555-0148', 'Tomas Ruiz', 'LTC-55820', 1.0, null),

  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'repair', 'electrical', 'completed',
   'Alternator replacement', 'Charging fault, battery light on dash. Replaced alternator and serpentine belt, load tested batteries.',
   current_date - interval '11 months', 498000, 640.00, 285.00, 46.20, false,
   'Freightliner of Chicago', '(773) 555-0121', 'Andre Kim', 'FCH-94480', 1.5, null),

  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'preventive', 'transmission', 'completed',
   'Transmission service', 'DT12 fluid and filter service, clutch actuator calibration.',
   current_date - interval '13 months', 480000, 520.00, 340.00, 43.00, false,
   'Freightliner of Chicago', '(773) 555-0121', 'Andre Kim', 'FCH-92110', 1.0, null),

  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'warranty', 'turbo', 'completed',
   'Turbo actuator replacement (warranty)', 'Variable geometry turbo actuator replaced under Detroit extended coverage. No owner cost.',
   current_date - interval '15 months', 466000, 0.00, 0.00, 0.00, true,
   'Freightliner of Chicago', '(773) 555-0121', 'Andre Kim', 'FCH-90042', 3.0,
   'Covered by Detroit extended warranty — retained for resale documentation.'),

  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'preventive', 'oil_change', 'completed',
   'Engine oil & filter change', 'Full synthetic 15W-40 with filter package.',
   current_date - interval '16 months', 458000, 254.00, 140.00, 20.40, false,
   'TA Truck Service — Effingham', '(217) 555-0164', 'Dale Whitmore', 'TA-421990', 0.5, null);

-- Scheduled, not yet performed
insert into public.maintenance_records (
  truck_id, type, category, status, title, description, service_date,
  scheduled_for, odometer, cost_parts, cost_labor, shop_name, notes
) values
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'preventive', 'oil_change', 'scheduled',
   'Engine oil & filter change', 'Next interval service — due at 597,000 miles.',
   current_date + interval '9 days', current_date + interval '9 days', null, 270.00, 145.00,
   'TA Truck Service — Effingham', 'Booked for the morning slot.'),
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'repair', 'suspension', 'in_progress',
   'Air bag leak — rear axle', 'Slow air leak detected on the right rear air bag. Parts on order.',
   current_date - interval '2 days', current_date + interval '3 days', 584200, 310.00, 220.00,
   'Midwest Brake & Alignment', 'Renter reports ride height dropping overnight.');

-- ---------------------------------------------------------------------------
-- Fixed operating expenses (fuel and maintenance are generated by triggers)
-- ---------------------------------------------------------------------------
insert into public.expenses (truck_id, expense_date, category, amount, vendor, description, method, is_tax_deductible, is_recurring)
select
  '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11',
  (month + interval '2 days')::date,
  'insurance', 685.00, 'Progressive Commercial',
  'Commercial auto & cargo insurance premium', 'ach', true, true
from generate_series(
  date_trunc('month', current_date - interval '17 months'),
  date_trunc('month', current_date),
  interval '1 month'
) as month;

insert into public.expenses (truck_id, expense_date, category, amount, vendor, description, method, is_tax_deductible, is_recurring)
values
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', (current_date - interval '10 months')::date,
   'registration', 3210.00, 'Illinois Secretary of State', 'Annual apportioned plate renewal', 'card', true, true),
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', (current_date - interval '4 months')::date,
   'permits', 550.00, 'FMCSA', 'UCR and permit renewals', 'card', true, true),
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', (current_date - interval '2 months')::date,
   'towing', 780.00, 'I-57 Heavy Recovery', 'Tow after radiator hose failure', 'card', true, false),
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', (current_date - interval '12 months')::date,
   'taxes', 550.00, 'IRS', 'Form 2290 heavy highway vehicle use tax', 'ach', true, true),
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', (current_date - interval '5 months')::date,
   'accounting', 420.00, 'Ledgerworks CPA', 'Quarterly bookkeeping and IFTA filing', 'ach', true, true);

insert into public.expenses (truck_id, expense_date, category, amount, vendor, description, method, is_tax_deductible, is_recurring)
select
  '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11',
  (quarter + interval '20 days')::date,
  'ifta', round((180 + random() * 120)::numeric, 2), 'Illinois Department of Revenue',
  'IFTA quarterly fuel tax settlement', 'ach', true, true
from generate_series(
  date_trunc('quarter', current_date - interval '15 months'),
  date_trunc('quarter', current_date - interval '3 months'),
  interval '3 months'
) as quarter;

commit;

begin;

-- ---------------------------------------------------------------------------
-- Invoices for the last six billing periods.
-- invoice_number is assigned by the assign_invoice_number() trigger; totals are
-- recalculated from the line items by recalculate_invoice_totals().
-- ---------------------------------------------------------------------------
with periods as (
  select
    gs::date                                              as period_start,
    (gs + interval '1 month' - interval '1 day')::date     as period_end,
    row_number() over (order by gs)                        as seq,
    count(*) over ()                                       as total
  from generate_series(
    date_trunc('month', current_date - interval '5 months'),
    date_trunc('month', current_date),
    interval '1 month'
  ) as gs
),
created as (
  insert into public.invoices (
    truck_id, rental_agreement_id, rental_company_id, status, issue_date,
    due_date, period_start, period_end, notes, terms
  )
  select
    '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11',
    'c3e5a7b9-1d2f-4c8e-a0b4-6f8d0c2e4a75',
    'a1c3f5e7-9b2d-4a6c-8e0f-3d5b7a9c1e42',
    'sent',
    p.period_start,
    p.period_start + 15,
    p.period_start,
    p.period_end,
    'Monthly equipment rental — Freightliner Cascadia T-101',
    'Payment due within 15 days. Late payments incur a $150 fee after a 3-day grace period.'
  from periods p
  returning id, period_start
)
insert into public.invoice_line_items (invoice_id, description, quantity, unit_price, sort_order)
select c.id, 'Monthly truck rental — T-101 (2021 Freightliner Cascadia)', 1, 4500.00, 0
from created c;

-- Mileage overage billed on the busiest month.
insert into public.invoice_line_items (invoice_id, description, quantity, unit_price, sort_order)
select i.id, 'Mileage overage — 1,240 miles @ $0.18', 1240, 0.18, 1
from public.invoices i
where i.truck_id = '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11'
  and i.period_start = (date_trunc('month', current_date - interval '3 months'))::date;

-- Late fee applied to the month the renter paid past due.
insert into public.invoice_line_items (invoice_id, description, quantity, unit_price, sort_order)
select i.id, 'Late payment fee', 1, 150.00, 2
from public.invoices i
where i.truck_id = '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11'
  and i.period_start = (date_trunc('month', current_date - interval '2 months'))::date;

-- ---------------------------------------------------------------------------
-- Rent payments: 17 months of history. The five oldest invoiced months are
-- settled; the current month is still outstanding.
-- ---------------------------------------------------------------------------
insert into public.payments (
  truck_id, rental_agreement_id, invoice_id, payment_date, amount, type, method,
  reference, period_start, period_end, notes
)
select
  '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11',
  'c3e5a7b9-1d2f-4c8e-a0b4-6f8d0c2e4a75',
  i.id,
  case
    when i.period_start = (date_trunc('month', current_date - interval '2 months'))::date
      then i.period_start + 21          -- the late one
    else i.period_start + 2
  end,
  4500.00,
  'rent_monthly',
  'ach',
  'ACH-' || to_char(i.period_start, 'YYYYMM'),
  i.period_start,
  i.period_end,
  null
from public.invoices i
where i.truck_id = '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11'
  and i.period_start < date_trunc('month', current_date)::date;

-- Older, pre-invoicing rent history (months 6–17 back)
insert into public.payments (
  truck_id, rental_agreement_id, payment_date, amount, type, method, reference,
  period_start, period_end
)
select
  '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11',
  'c3e5a7b9-1d2f-4c8e-a0b4-6f8d0c2e4a75',
  (month + interval '2 days')::date,
  4500.00,
  'rent_monthly',
  'ach',
  'ACH-' || to_char(month, 'YYYYMM'),
  month::date,
  (month + interval '1 month' - interval '1 day')::date
from generate_series(
  date_trunc('month', current_date - interval '17 months'),
  date_trunc('month', current_date - interval '6 months'),
  interval '1 month'
) as month;

-- Security deposit and the late fee actually collected
insert into public.payments (
  truck_id, rental_agreement_id, payment_date, amount, type, method, reference, notes
) values
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'c3e5a7b9-1d2f-4c8e-a0b4-6f8d0c2e4a75',
   (date_trunc('month', current_date - interval '17 months'))::date, 5000.00, 'deposit', 'wire',
   'WIRE-DEP-001', 'Refundable security deposit held for the duration of the lease.'),
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'c3e5a7b9-1d2f-4c8e-a0b4-6f8d0c2e4a75',
   (date_trunc('month', current_date - interval '2 months') + interval '21 days')::date,
   150.00, 'late_fee', 'ach', 'ACH-LATEFEE-01', 'Late fee for the overdue rent payment.'),
  ('5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', 'c3e5a7b9-1d2f-4c8e-a0b4-6f8d0c2e4a75',
   (date_trunc('month', current_date - interval '3 months') + interval '6 days')::date,
   223.20, 'mileage_overage', 'ach', 'ACH-OVER-01', '1,240 miles over the 12,000-mile monthly allowance.');

-- ---------------------------------------------------------------------------
-- Last known position (Joliet, IL — I-80 corridor)
-- ---------------------------------------------------------------------------
insert into public.truck_locations (truck_id, recorded_at, latitude, longitude, speed_mph, heading, address, source)
values (
  '5b9f7d64-2f21-4f3c-9d7e-1c0a8b6d2e11', now() - interval '42 minutes',
  41.525031, -88.081725, 62.0, 274.0, 'I-80 W near Joliet, IL', 'eld'
);

commit;

-- ---------------------------------------------------------------------------
-- Sanity summary (visible in the Supabase SQL editor output)
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.trucks)               as trucks,
  (select count(*) from public.maintenance_records)  as maintenance_records,
  (select count(*) from public.mileage_logs)         as mileage_logs,
  (select count(*) from public.fuel_logs)            as fuel_logs,
  (select count(*) from public.expenses)             as expenses,
  (select count(*) from public.payments)             as payments,
  (select count(*) from public.invoices)             as invoices,
  (select round(sum(amount), 2) from public.payments) as gross_income,
  (select round(sum(amount), 2) from public.expenses) as total_expenses;
