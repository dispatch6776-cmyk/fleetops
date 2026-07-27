-- =============================================================================
-- FleetOps · 0002 · Core entities: profiles, trucks, compliance, drivers,
--                   rental companies and rental agreements
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles — 1:1 with auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null unique,
  full_name     text,
  avatar_url    text,
  phone         text,
  role          public.user_role not null default 'viewer',
  is_active     boolean not null default true,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint profiles_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create index if not exists profiles_role_idx on public.profiles (role) where is_active;
comment on table public.profiles is 'Application user with an assigned role. Created automatically on sign-up.';

-- ---------------------------------------------------------------------------
-- trucks
-- ---------------------------------------------------------------------------
create table if not exists public.trucks (
  id                    uuid primary key default gen_random_uuid(),
  truck_number          text not null,
  vin                   text not null,
  license_plate         text not null,
  plate_state           text,
  year                  smallint not null,
  make                  text not null,
  model                 text not null,
  color                 text,
  engine                text,
  engine_hours          numeric(10, 1),
  transmission          public.transmission_type,
  odometer              integer not null default 0,
  odometer_updated_at   timestamptz,
  fuel_type             public.fuel_type not null default 'diesel',
  tank_capacity_gal     numeric(6, 1),
  tire_size             text,
  tire_installed_miles  integer,
  tire_life_miles       integer default 120000,
  gvwr_lbs              integer,
  axles                 smallint,
  status                public.truck_status not null default 'active',
  purchase_date         date,
  purchase_price        numeric(12, 2),
  current_value         numeric(12, 2),
  photo_url             text,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint trucks_vin_unique unique (vin),
  constraint trucks_number_unique unique (truck_number),
  constraint trucks_vin_length check (char_length(vin) between 11 and 17),
  constraint trucks_year_range check (year between 1950 and extract(year from now())::int + 2),
  constraint trucks_odometer_positive check (odometer >= 0),
  constraint trucks_purchase_price_positive check (purchase_price is null or purchase_price >= 0)
);

create index if not exists trucks_status_idx on public.trucks (status);
create index if not exists trucks_search_idx on public.trucks
  using gin ((truck_number || ' ' || vin || ' ' || license_plate || ' ' || make || ' ' || model) extensions.gin_trgm_ops);

comment on column public.trucks.tire_life_miles is 'Expected tire life, used for the dashboard tire-life gauge.';

-- ---------------------------------------------------------------------------
-- truck_compliance — insurance, registration, DOT, IFTA, ELD (1:1 with truck)
-- ---------------------------------------------------------------------------
create table if not exists public.truck_compliance (
  id                          uuid primary key default gen_random_uuid(),
  truck_id                    uuid not null unique references public.trucks (id) on delete cascade,
  insurance_provider          text,
  insurance_policy_number     text,
  insurance_effective_on      date,
  insurance_expires_on        date,
  insurance_monthly_cost      numeric(10, 2),
  insurance_agent_phone       text,
  registration_state          text,
  registration_number         text,
  registration_expires_on     date,
  registration_annual_cost    numeric(10, 2),
  dot_number                  text,
  mc_number                   text,
  dot_inspection_on           date,
  dot_inspection_expires_on   date,
  ifta_account                text,
  ifta_expires_on             date,
  eld_provider                text,
  eld_device_id               text,
  eld_expires_on              date,
  updated_at                  timestamptz not null default now(),
  constraint compliance_insurance_dates check (
    insurance_effective_on is null or insurance_expires_on is null
    or insurance_expires_on >= insurance_effective_on
  )
);

create index if not exists compliance_insurance_expiry_idx on public.truck_compliance (insurance_expires_on);
create index if not exists compliance_registration_expiry_idx on public.truck_compliance (registration_expires_on);

-- ---------------------------------------------------------------------------
-- drivers
-- ---------------------------------------------------------------------------
create table if not exists public.drivers (
  id                        uuid primary key default gen_random_uuid(),
  full_name                 text not null,
  phone                     text,
  email                     text,
  license_number            text,
  license_state             text,
  license_expires_on        date,
  medical_card_expires_on   date,
  hire_date                 date,
  is_active                 boolean not null default true,
  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists drivers_active_idx on public.drivers (is_active);

-- ---------------------------------------------------------------------------
-- rental_companies — the company/driver renting the truck
-- ---------------------------------------------------------------------------
create table if not exists public.rental_companies (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  contact_name    text,
  phone           text,
  email           text,
  address_line1   text,
  address_line2   text,
  city            text,
  state           text,
  postal_code     text,
  dot_number      text,
  mc_number       text,
  tax_id          text,
  is_active       boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists rental_companies_name_unique on public.rental_companies (lower(name));

-- ---------------------------------------------------------------------------
-- rental_agreements — the lease between the owner and the renting company
-- ---------------------------------------------------------------------------
create table if not exists public.rental_agreements (
  id                    uuid primary key default gen_random_uuid(),
  truck_id              uuid not null references public.trucks (id) on delete cascade,
  rental_company_id     uuid references public.rental_companies (id) on delete set null,
  driver_id             uuid references public.drivers (id) on delete set null,
  agreement_number      text,
  start_date            date not null,
  end_date              date,
  rate_type             public.rate_type not null default 'monthly',
  rate_amount           numeric(12, 2) not null,
  deposit_amount        numeric(12, 2) not null default 0,
  deposit_refunded      boolean not null default false,
  mileage_allowance     integer,
  overage_rate          numeric(8, 4),
  payment_day           smallint,
  late_fee_amount       numeric(10, 2) default 0,
  late_fee_grace_days   smallint default 3,
  status                public.rental_status not null default 'active',
  terms                 text,
  notes                 text,
  created_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint rental_dates_valid check (end_date is null or end_date >= start_date),
  constraint rental_rate_positive check (rate_amount >= 0),
  constraint rental_payment_day_range check (payment_day is null or payment_day between 1 and 31)
);

create index if not exists rental_agreements_truck_idx on public.rental_agreements (truck_id, status);
create index if not exists rental_agreements_dates_idx on public.rental_agreements (start_date desc);

-- Only one active agreement per truck at a time.
create unique index if not exists rental_agreements_one_active_per_truck
  on public.rental_agreements (truck_id)
  where status = 'active';
