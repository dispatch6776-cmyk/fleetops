-- =============================================================================
-- FleetOps · 0004 · Financials: invoices, line items, payments and expenses
-- Every table here is readable only by Owner and Administrator (see 0008).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id                    uuid primary key default gen_random_uuid(),
  invoice_number        text not null,
  truck_id              uuid not null references public.trucks (id) on delete cascade,
  rental_agreement_id   uuid references public.rental_agreements (id) on delete set null,
  rental_company_id     uuid references public.rental_companies (id) on delete set null,
  status                public.invoice_status not null default 'draft',
  issue_date            date not null default current_date,
  due_date              date not null default (current_date + 15),
  period_start          date,
  period_end            date,
  subtotal              numeric(12, 2) not null default 0,
  tax_rate              numeric(6, 4) not null default 0,
  tax_amount            numeric(12, 2) not null default 0,
  discount_amount       numeric(12, 2) not null default 0,
  total                 numeric(12, 2) not null default 0,
  amount_paid           numeric(12, 2) not null default 0,
  balance               numeric(12, 2) generated always as (total - amount_paid) stored,
  sent_at               timestamptz,
  paid_at               timestamptz,
  notes                 text,
  terms                 text,
  created_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint invoices_number_unique unique (invoice_number),
  constraint invoices_amounts_positive check (
    subtotal >= 0 and tax_amount >= 0 and discount_amount >= 0 and total >= 0 and amount_paid >= 0
  ),
  constraint invoices_due_after_issue check (due_date >= issue_date)
);

create index if not exists invoices_truck_idx on public.invoices (truck_id, issue_date desc);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_outstanding_idx on public.invoices (due_date)
  where status in ('sent', 'partial', 'overdue');

-- ---------------------------------------------------------------------------
-- invoice_line_items
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_line_items (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references public.invoices (id) on delete cascade,
  description   text not null,
  quantity      numeric(10, 2) not null default 1,
  unit_price    numeric(12, 2) not null default 0,
  line_total    numeric(12, 2) generated always as (round(quantity * unit_price, 2)) stored,
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now(),
  constraint line_items_quantity_positive check (quantity > 0)
);

create index if not exists line_items_invoice_idx on public.invoice_line_items (invoice_id, sort_order);

-- ---------------------------------------------------------------------------
-- payments — money received from the renting company
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id                    uuid primary key default gen_random_uuid(),
  truck_id              uuid not null references public.trucks (id) on delete cascade,
  rental_agreement_id   uuid references public.rental_agreements (id) on delete set null,
  invoice_id            uuid references public.invoices (id) on delete set null,
  payment_date          date not null default current_date,
  amount                numeric(12, 2) not null,
  type                  public.payment_type not null default 'rent_monthly',
  method                public.payment_method not null default 'ach',
  reference             text,
  period_start          date,
  period_end            date,
  is_late               boolean not null default false,
  notes                 text,
  recorded_by           uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint payments_amount_nonzero check (amount <> 0)
);

create index if not exists payments_truck_date_idx on public.payments (truck_id, payment_date desc);
create index if not exists payments_invoice_idx on public.payments (invoice_id);
create index if not exists payments_type_idx on public.payments (type);

-- ---------------------------------------------------------------------------
-- expenses — money spent on the truck
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id                  uuid primary key default gen_random_uuid(),
  truck_id            uuid not null references public.trucks (id) on delete cascade,
  expense_date        date not null default current_date,
  category            public.expense_category not null,
  amount              numeric(12, 2) not null,
  vendor              text,
  description         text,
  method              public.payment_method not null default 'card',
  reference           text,
  is_tax_deductible   boolean not null default true,
  is_recurring        boolean not null default false,
  maintenance_id      uuid references public.maintenance_records (id) on delete set null,
  fuel_log_id         uuid references public.fuel_logs (id) on delete set null,
  document_id         uuid references public.documents (id) on delete set null,
  recorded_by         uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint expenses_amount_positive check (amount >= 0)
);

create index if not exists expenses_truck_date_idx on public.expenses (truck_id, expense_date desc);
create index if not exists expenses_category_idx on public.expenses (category, expense_date desc);
create index if not exists expenses_maintenance_idx on public.expenses (maintenance_id);

-- Documents can now reference invoices and expenses.
alter table public.documents drop constraint if exists documents_invoice_id_fkey;
alter table public.documents
  add constraint documents_invoice_id_fkey
  foreign key (invoice_id) references public.invoices (id) on delete set null;

alter table public.documents drop constraint if exists documents_expense_id_fkey;
alter table public.documents
  add constraint documents_expense_id_fkey
  foreign key (expense_id) references public.expenses (id) on delete set null;
