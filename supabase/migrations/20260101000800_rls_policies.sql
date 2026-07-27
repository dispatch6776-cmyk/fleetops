-- =============================================================================
-- FleetOps · 0008 · Row-Level Security
--
-- Model:
--   owner / admin  → everything, including money
--   maintenance    → truck, maintenance, repairs, mileage, non-financial docs
--   mechanic       → maintenance module only
--   viewer         → read-only, non-financial
--
-- The client only ever holds the anon key, so these policies are the real
-- security boundary. The UI permission matrix mirrors them for ergonomics.
-- =============================================================================

alter table public.profiles                enable row level security;
alter table public.trucks                  enable row level security;
alter table public.truck_compliance        enable row level security;
alter table public.drivers                 enable row level security;
alter table public.rental_companies        enable row level security;
alter table public.rental_agreements       enable row level security;
alter table public.maintenance_records     enable row level security;
alter table public.maintenance_parts       enable row level security;
alter table public.maintenance_schedules   enable row level security;
alter table public.mileage_logs            enable row level security;
alter table public.fuel_logs               enable row level security;
alter table public.documents               enable row level security;
alter table public.private_notes           enable row level security;
alter table public.service_shops           enable row level security;
alter table public.truck_locations         enable row level security;
alter table public.invoices                enable row level security;
alter table public.invoice_line_items      enable row level security;
alter table public.payments                enable row level security;
alter table public.expenses                enable row level security;
alter table public.notifications           enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.audit_logs              enable row level security;
alter table public.login_history           enable row level security;
alter table public.app_settings            enable row level security;
alter table public.ai_conversations        enable row level security;
alter table public.ai_messages             enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_authenticated_member());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert on public.profiles
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles
  for delete to authenticated
  using (public.is_admin() and id <> auth.uid());

-- Privilege escalation guard: only an admin may change role or is_active.
create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and not public.is_admin() then
    raise exception 'Only an Owner or Administrator can change roles or deactivate accounts.'
      using errcode = '42501';
  end if;

  -- The last active owner cannot be demoted or disabled.
  if old.role = 'owner'
     and (new.role <> 'owner' or not new.is_active)
     and (select count(*) from public.profiles where role = 'owner' and is_active) <= 1 then
    raise exception 'The last active Owner cannot be demoted or deactivated.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_role_change_trigger on public.profiles;
create trigger guard_profile_role_change_trigger
  before update on public.profiles
  for each row execute function public.guard_profile_role_change();

-- ---------------------------------------------------------------------------
-- Fleet reference data — readable by every member, writable by admins
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['trucks', 'truck_compliance', 'drivers', 'truck_locations']
  loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format(
      'create policy %I_select on public.%I for select to authenticated
       using (public.is_authenticated_member())', t, t);

    execute format('drop policy if exists %I_admin_all on public.%I', t, t);
    execute format(
      'create policy %I_admin_all on public.%I for all to authenticated
       using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- Maintenance staff may log a location or update the odometer-bearing truck row
-- indirectly through triggers; direct truck writes stay admin-only.

-- ---------------------------------------------------------------------------
-- Money — Owner and Administrator only, for every operation
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'rental_companies', 'rental_agreements', 'invoices', 'invoice_line_items',
    'payments', 'expenses', 'private_notes', 'fuel_logs'
  ]
  loop
    execute format('drop policy if exists %I_admin_only on public.%I', t, t);
    execute format(
      'create policy %I_admin_only on public.%I for all to authenticated
       using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Maintenance module
-- ---------------------------------------------------------------------------
drop policy if exists maintenance_select on public.maintenance_records;
create policy maintenance_select on public.maintenance_records
  for select to authenticated
  using (public.is_authenticated_member());

drop policy if exists maintenance_insert on public.maintenance_records;
create policy maintenance_insert on public.maintenance_records
  for insert to authenticated
  with check (public.can_edit_maintenance());

drop policy if exists maintenance_update on public.maintenance_records;
create policy maintenance_update on public.maintenance_records
  for update to authenticated
  using (public.can_edit_maintenance())
  with check (public.can_edit_maintenance());

drop policy if exists maintenance_delete on public.maintenance_records;
create policy maintenance_delete on public.maintenance_records
  for delete to authenticated
  using (public.is_admin());

drop policy if exists parts_select on public.maintenance_parts;
create policy parts_select on public.maintenance_parts
  for select to authenticated
  using (public.is_authenticated_member());

drop policy if exists parts_write on public.maintenance_parts;
create policy parts_write on public.maintenance_parts
  for all to authenticated
  using (public.can_edit_maintenance())
  with check (public.can_edit_maintenance());

drop policy if exists schedules_select on public.maintenance_schedules;
create policy schedules_select on public.maintenance_schedules
  for select to authenticated
  using (public.is_authenticated_member());

drop policy if exists schedules_write on public.maintenance_schedules;
create policy schedules_write on public.maintenance_schedules
  for all to authenticated
  using (public.can_edit_maintenance())
  with check (public.can_edit_maintenance());

-- ---------------------------------------------------------------------------
-- Mileage — operations roles (mechanics stay inside maintenance)
-- ---------------------------------------------------------------------------
drop policy if exists mileage_select on public.mileage_logs;
create policy mileage_select on public.mileage_logs
  for select to authenticated
  using (public.can_view_operations());

drop policy if exists mileage_write on public.mileage_logs;
create policy mileage_write on public.mileage_logs
  for all to authenticated
  using (public.current_role_name() in ('owner', 'admin', 'maintenance'))
  with check (public.current_role_name() in ('owner', 'admin', 'maintenance'));

-- ---------------------------------------------------------------------------
-- Documents — financial paperwork is invisible to non-financial roles
-- ---------------------------------------------------------------------------
drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents
  for select to authenticated
  using (
    public.is_admin()
    or (public.is_authenticated_member() and not is_financial)
  );

drop policy if exists documents_insert on public.documents;
create policy documents_insert on public.documents
  for insert to authenticated
  with check (
    public.can_edit_maintenance()
    and (not is_financial or public.is_admin())
    and uploaded_by = auth.uid()
  );

drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents
  for update to authenticated
  using (public.is_admin() or uploaded_by = auth.uid())
  with check (public.is_admin() or (uploaded_by = auth.uid() and not is_financial));

drop policy if exists documents_delete on public.documents;
create policy documents_delete on public.documents
  for delete to authenticated
  using (public.is_admin() or uploaded_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Service shops — everyone reads, maintenance staff curate
-- ---------------------------------------------------------------------------
drop policy if exists shops_select on public.service_shops;
create policy shops_select on public.service_shops
  for select to authenticated
  using (public.is_authenticated_member());

drop policy if exists shops_write on public.service_shops;
create policy shops_write on public.service_shops
  for all to authenticated
  using (public.can_edit_maintenance())
  with check (public.can_edit_maintenance());

-- ---------------------------------------------------------------------------
-- Notifications and preferences — strictly per user
-- ---------------------------------------------------------------------------
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid() or (user_id is null and public.is_authenticated_member()));

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_admin_insert on public.notifications;
create policy notifications_admin_insert on public.notifications
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists notification_prefs_own on public.notification_preferences;
create policy notification_prefs_own on public.notification_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Audit and login history — read-only for admins, append-only for the system
-- ---------------------------------------------------------------------------
drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs
  for select to authenticated
  using (public.is_admin());

drop policy if exists login_history_select on public.login_history;
create policy login_history_select on public.login_history
  for select to authenticated
  using (public.is_admin() or user_id = auth.uid());

drop policy if exists login_history_insert on public.login_history;
create policy login_history_insert on public.login_history
  for insert to authenticated
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------
drop policy if exists settings_select on public.app_settings;
create policy settings_select on public.app_settings
  for select to authenticated
  using (public.is_authenticated_member());

drop policy if exists settings_update on public.app_settings;
create policy settings_update on public.app_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- AI assistant history — private to each user
-- ---------------------------------------------------------------------------
drop policy if exists ai_conversations_own on public.ai_conversations;
create policy ai_conversations_own on public.ai_conversations
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists ai_messages_own on public.ai_messages;
create policy ai_messages_own on public.ai_messages
  for all to authenticated
  using (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ai_conversations c
      where c.id = ai_messages.conversation_id and c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Grants. RLS decides *which rows*; grants decide *which tables* are reachable.
-- `anon` gets nothing — every route in FleetOps requires a session.
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on public.audit_logs from authenticated;
grant select on public.audit_logs to authenticated;
revoke insert, update, delete on public.login_history from authenticated;
grant select, insert on public.login_history to authenticated;

grant execute on all functions in schema public to authenticated;

-- Non-financial reporting views usable by every role.
grant select on public.v_monthly_mileage to authenticated;
grant select on public.v_fuel_economy to authenticated;

revoke all on public.v_monthly_financials from anon;
revoke all on public.v_expense_by_category from anon;
revoke all on public.v_truck_kpis from anon;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
