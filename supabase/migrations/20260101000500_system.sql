-- =============================================================================
-- FleetOps · 0005 · System: notifications, preferences, audit trail,
--                   login history, settings and AI assistant history
-- =============================================================================

create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles (id) on delete cascade,
  type          public.notification_type not null,
  severity      public.notification_severity not null default 'info',
  title         text not null,
  body          text,
  href          text,
  entity_type   text,
  entity_id     uuid,
  due_date      date,
  read_at       timestamptz,
  emailed_at    timestamptz,
  dedupe_key    text,
  created_at    timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;
create unique index if not exists notifications_dedupe_idx
  on public.notifications (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), dedupe_key)
  where dedupe_key is not null;

create table if not exists public.notification_preferences (
  user_id                 uuid primary key references public.profiles (id) on delete cascade,
  email_enabled           boolean not null default true,
  browser_enabled         boolean not null default true,
  maintenance_alerts      boolean not null default true,
  compliance_alerts       boolean not null default true,
  payment_alerts          boolean not null default true,
  document_alerts         boolean not null default true,
  weekly_digest           boolean not null default true,
  quiet_hours_start       smallint,
  quiet_hours_end         smallint,
  updated_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- audit_logs — immutable trail written by triggers and the application
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id            bigint generated always as identity primary key,
  actor_id      uuid references public.profiles (id) on delete set null,
  actor_email   text,
  action        public.audit_action not null,
  entity_type   text not null,
  entity_id     uuid,
  summary       text,
  changes       jsonb,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz not null default now()
);

create index if not exists audit_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_entity_idx on public.audit_logs (entity_type, entity_id);
create index if not exists audit_actor_idx on public.audit_logs (actor_id, created_at desc);

create table if not exists public.login_history (
  id            bigint generated always as identity primary key,
  user_id       uuid references public.profiles (id) on delete set null,
  email         text not null,
  succeeded     boolean not null default true,
  ip_address    inet,
  user_agent    text,
  city          text,
  country       text,
  created_at    timestamptz not null default now()
);

create index if not exists login_history_user_idx on public.login_history (user_id, created_at desc);
create index if not exists login_history_created_idx on public.login_history (created_at desc);

-- ---------------------------------------------------------------------------
-- app_settings — single row of tenant-wide configuration
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id                        boolean primary key default true,
  company_name              text not null default 'FleetOps',
  company_email             text,
  company_phone             text,
  company_address           text,
  logo_url                  text,
  currency                  text not null default 'USD',
  timezone                  text not null default 'America/Chicago',
  distance_unit             text not null default 'mi',
  invoice_prefix            text not null default 'INV',
  invoice_next_number       integer not null default 1001,
  invoice_terms             text default 'Payment due within 15 days of the invoice date.',
  default_tax_rate          numeric(6, 4) not null default 0,
  fiscal_year_start_month   smallint not null default 1,
  alert_days_before         smallint not null default 30,
  updated_at                timestamptz not null default now(),
  constraint app_settings_single_row check (id),
  constraint app_settings_currency_len check (char_length(currency) = 3)
);

insert into public.app_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- AI assistant history
-- ---------------------------------------------------------------------------
create table if not exists public.ai_conversations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  title         text not null default 'New conversation',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.ai_conversations (id) on delete cascade,
  role              text not null check (role in ('user', 'assistant', 'system')),
  content           text not null,
  context           jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists ai_messages_conversation_idx
  on public.ai_messages (conversation_id, created_at);
create index if not exists ai_conversations_user_idx
  on public.ai_conversations (user_id, updated_at desc);
