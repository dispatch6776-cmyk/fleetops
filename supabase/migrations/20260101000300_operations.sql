-- =============================================================================
-- FleetOps · 0003 · Operations: maintenance, parts, schedules, mileage, fuel,
--                   documents, private notes, locations and service shops
-- =============================================================================

-- ---------------------------------------------------------------------------
-- maintenance_records
-- ---------------------------------------------------------------------------
create table if not exists public.maintenance_records (
  id                      uuid primary key default gen_random_uuid(),
  truck_id                uuid not null references public.trucks (id) on delete cascade,
  type                    public.maintenance_type not null default 'preventive',
  category                public.maintenance_category not null,
  status                  public.maintenance_status not null default 'completed',
  title                   text not null,
  description             text,
  service_date            date not null default current_date,
  scheduled_for           date,
  completed_at            timestamptz,
  odometer                integer,
  engine_hours            numeric(10, 1),
  cost_parts              numeric(12, 2) not null default 0,
  cost_labor              numeric(12, 2) not null default 0,
  cost_tax                numeric(12, 2) not null default 0,
  cost_other              numeric(12, 2) not null default 0,
  cost_total              numeric(12, 2) generated always as
                            (cost_parts + cost_labor + cost_tax + cost_other) stored,
  is_warranty             boolean not null default false,
  warranty_expires_on     date,
  warranty_miles          integer,
  shop_id                 uuid,
  shop_name               text,
  shop_phone              text,
  mechanic_name           text,
  invoice_number          text,
  downtime_days           numeric(5, 1),
  next_service_odometer   integer,
  next_service_date       date,
  notes                   text,
  created_by              uuid references public.profiles (id) on delete set null,
  updated_by              uuid references public.profiles (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint maintenance_costs_positive check (
    cost_parts >= 0 and cost_labor >= 0 and cost_tax >= 0 and cost_other >= 0
  ),
  constraint maintenance_odometer_positive check (odometer is null or odometer >= 0)
);

create index if not exists maintenance_truck_date_idx
  on public.maintenance_records (truck_id, service_date desc);
create index if not exists maintenance_status_idx on public.maintenance_records (status);
create index if not exists maintenance_category_idx on public.maintenance_records (category);
create index if not exists maintenance_upcoming_idx
  on public.maintenance_records (scheduled_for)
  where status in ('scheduled', 'in_progress');
create index if not exists maintenance_search_idx on public.maintenance_records
  using gin ((coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(shop_name, ''))
  extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- maintenance_parts — line items on a work order
-- ---------------------------------------------------------------------------
create table if not exists public.maintenance_parts (
  id                      uuid primary key default gen_random_uuid(),
  maintenance_id          uuid not null references public.maintenance_records (id) on delete cascade,
  part_name               text not null,
  part_number             text,
  quantity                numeric(10, 2) not null default 1,
  unit_cost               numeric(12, 2) not null default 0,
  line_total              numeric(12, 2) generated always as (quantity * unit_cost) stored,
  vendor                  text,
  warranty_months         smallint,
  created_at              timestamptz not null default now(),
  constraint parts_quantity_positive check (quantity > 0),
  constraint parts_cost_positive check (unit_cost >= 0)
);

create index if not exists maintenance_parts_record_idx on public.maintenance_parts (maintenance_id);

-- ---------------------------------------------------------------------------
-- maintenance_schedules — recurring preventive maintenance
-- ---------------------------------------------------------------------------
create table if not exists public.maintenance_schedules (
  id                      uuid primary key default gen_random_uuid(),
  truck_id                uuid not null references public.trucks (id) on delete cascade,
  name                    text not null,
  category                public.maintenance_category not null,
  interval_type           public.schedule_interval not null default 'miles',
  interval_miles          integer,
  interval_days           integer,
  interval_engine_hours   integer,
  last_service_odometer   integer,
  last_service_date       date,
  next_due_odometer       integer,
  next_due_date           date,
  notify_miles_before     integer not null default 1000,
  notify_days_before      integer not null default 14,
  estimated_cost          numeric(10, 2),
  is_active               boolean not null default true,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint schedule_interval_present check (
    (interval_type = 'miles' and interval_miles is not null)
    or (interval_type = 'days' and interval_days is not null)
    or (interval_type = 'engine_hours' and interval_engine_hours is not null)
  )
);

create index if not exists schedules_truck_idx on public.maintenance_schedules (truck_id) where is_active;
create index if not exists schedules_due_idx on public.maintenance_schedules (next_due_date) where is_active;

-- ---------------------------------------------------------------------------
-- mileage_logs — odometer readings; miles_driven is derived by trigger
-- ---------------------------------------------------------------------------
create table if not exists public.mileage_logs (
  id              uuid primary key default gen_random_uuid(),
  truck_id        uuid not null references public.trucks (id) on delete cascade,
  log_date        date not null default current_date,
  odometer        integer not null,
  miles_driven    integer,
  engine_hours    numeric(10, 1),
  source          public.mileage_source not null default 'manual',
  driver_id       uuid references public.drivers (id) on delete set null,
  notes           text,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint mileage_odometer_positive check (odometer >= 0),
  constraint mileage_one_per_day unique (truck_id, log_date)
);

create index if not exists mileage_truck_date_idx on public.mileage_logs (truck_id, log_date desc);

-- ---------------------------------------------------------------------------
-- fuel_logs — fuel purchases and economy
-- ---------------------------------------------------------------------------
create table if not exists public.fuel_logs (
  id                  uuid primary key default gen_random_uuid(),
  truck_id            uuid not null references public.trucks (id) on delete cascade,
  fuel_date           date not null default current_date,
  odometer            integer not null,
  gallons             numeric(8, 3) not null,
  price_per_gallon    numeric(8, 3) not null,
  total_cost          numeric(12, 2) generated always as (round(gallons * price_per_gallon, 2)) stored,
  miles_since_last    integer,
  mpg                 numeric(6, 2),
  is_def              boolean not null default false,
  is_full_tank        boolean not null default true,
  station             text,
  city                text,
  state               text,
  driver_id           uuid references public.drivers (id) on delete set null,
  notes               text,
  created_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  constraint fuel_gallons_positive check (gallons > 0),
  constraint fuel_price_positive check (price_per_gallon >= 0),
  constraint fuel_odometer_positive check (odometer >= 0)
);

create index if not exists fuel_truck_date_idx on public.fuel_logs (truck_id, fuel_date desc);
create index if not exists fuel_state_idx on public.fuel_logs (state, fuel_date desc);

-- ---------------------------------------------------------------------------
-- documents — Supabase Storage metadata
-- `is_financial` hides money-related paperwork from non-financial roles.
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id                    uuid primary key default gen_random_uuid(),
  truck_id              uuid references public.trucks (id) on delete cascade,
  category              public.document_category not null default 'other',
  folder                text not null default 'General',
  title                 text not null,
  description           text,
  storage_bucket        text not null default 'documents',
  storage_path          text not null,
  file_name             text not null,
  mime_type             text,
  size_bytes            bigint,
  issued_on             date,
  expires_on            date,
  is_financial          boolean not null default false,
  tags                  text[] not null default '{}',
  maintenance_id        uuid references public.maintenance_records (id) on delete cascade,
  invoice_id            uuid,
  expense_id            uuid,
  uploaded_by           uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint documents_storage_path_unique unique (storage_bucket, storage_path)
);

create index if not exists documents_truck_idx on public.documents (truck_id, created_at desc);
create index if not exists documents_category_idx on public.documents (category);
create index if not exists documents_expiry_idx on public.documents (expires_on) where expires_on is not null;
create index if not exists documents_maintenance_idx on public.documents (maintenance_id);
create index if not exists documents_tags_idx on public.documents using gin (tags);
create index if not exists documents_search_idx on public.documents
  using gin ((title || ' ' || coalesce(description, '') || ' ' || file_name) extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- private_notes — owner/admin-only annotations on any entity.
-- Kept in a separate table so RLS can protect it; column-level secrecy is not
-- expressible with row policies alone.
-- ---------------------------------------------------------------------------
create table if not exists public.private_notes (
  id            uuid primary key default gen_random_uuid(),
  entity_type   text not null,
  entity_id     uuid not null,
  body          text not null,
  author_id     uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint private_notes_entity_type_valid check (
    entity_type in ('truck', 'maintenance', 'invoice', 'expense', 'payment', 'rental_agreement', 'driver')
  )
);

create index if not exists private_notes_entity_idx on public.private_notes (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- service_shops — saved repair shops, dealers and truck stops
-- ---------------------------------------------------------------------------
create table if not exists public.service_shops (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  brand             text,
  category          text not null default 'repair',
  place_id          text,
  phone             text,
  emergency_phone   text,
  website           text,
  address           text,
  city              text,
  state             text,
  postal_code       text,
  latitude          numeric(9, 6),
  longitude         numeric(9, 6),
  hours             jsonb not null default '{}'::jsonb,
  is_24_hours       boolean not null default false,
  rating            numeric(2, 1),
  review_count      integer,
  services          text[] not null default '{}',
  photo_urls        text[] not null default '{}',
  is_favorite       boolean not null default false,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint shops_rating_range check (rating is null or rating between 0 and 5),
  constraint shops_place_unique unique (place_id)
);

create index if not exists shops_location_idx on public.service_shops (latitude, longitude);
create index if not exists shops_category_idx on public.service_shops (category);
create index if not exists shops_favorite_idx on public.service_shops (is_favorite) where is_favorite;

alter table public.maintenance_records
  drop constraint if exists maintenance_records_shop_id_fkey;
alter table public.maintenance_records
  add constraint maintenance_records_shop_id_fkey
  foreign key (shop_id) references public.service_shops (id) on delete set null;

-- ---------------------------------------------------------------------------
-- truck_locations — GPS breadcrumbs for the map module
-- ---------------------------------------------------------------------------
create table if not exists public.truck_locations (
  id            uuid primary key default gen_random_uuid(),
  truck_id      uuid not null references public.trucks (id) on delete cascade,
  recorded_at   timestamptz not null default now(),
  latitude      numeric(9, 6) not null,
  longitude     numeric(9, 6) not null,
  speed_mph     numeric(6, 2),
  heading       numeric(5, 2),
  address       text,
  source        text not null default 'manual',
  constraint location_lat_range check (latitude between -90 and 90),
  constraint location_lng_range check (longitude between -180 and 180)
);

create index if not exists locations_truck_time_idx on public.truck_locations (truck_id, recorded_at desc);
