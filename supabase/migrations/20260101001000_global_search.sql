-- =============================================================================
-- FleetOps · 0010 · Global search
--
-- One function that fans out across every searchable entity (truck, invoice,
-- repair/maintenance, mileage & fuel, document, service shop) and returns a
-- unified result set for the command palette and the /search page.
--
-- Deliberately declared WITHOUT `security definer`: it runs as the calling
-- user, so every underlying `select` is still filtered by that table's RLS
-- policy. A mechanic runs the same function as an owner and simply gets fewer
-- rows back — there is no separate "search permission" to keep in sync with
-- the rest of the security model.
-- =============================================================================

create or replace function public.global_search(p_query text, p_truck_id uuid default null, p_limit_per_type int default 6)
returns table (
  entity_type text,
  entity_id uuid,
  title text,
  subtitle text,
  href text,
  occurred_on date
)
language sql
stable
security invoker
set search_path = public
as $$
  with needle as (
    select nullif(trim(p_query), '') as term
  ),
  trucks_r as (
    select
      'truck'::text as entity_type,
      t.id as entity_id,
      t.truck_number || ' · ' || t.year::text || ' ' || t.make || ' ' || t.model as title,
      coalesce(t.vin, t.license_plate, t.status::text) as subtitle,
      '/truck' as href,
      null::date as occurred_on
    from public.trucks t, needle n
    where n.term is not null
      and (p_truck_id is null or t.id = p_truck_id)
      and (
        t.truck_number ilike '%' || n.term || '%'
        or t.vin ilike '%' || n.term || '%'
        or t.license_plate ilike '%' || n.term || '%'
        or t.make ilike '%' || n.term || '%'
        or t.model ilike '%' || n.term || '%'
      )
    order by t.truck_number
    limit p_limit_per_type
  ),
  invoices_r as (
    select
      'invoice'::text,
      i.id,
      'Invoice ' || i.invoice_number,
      i.status::text || ' · ' || to_char(i.total, 'FM$999,999,990.00'),
      '/invoices?open=' || i.id::text,
      i.issue_date
    from public.invoices i, needle n
    where n.term is not null
      and (p_truck_id is null or i.truck_id = p_truck_id)
      and (
        i.invoice_number ilike '%' || n.term || '%'
        or i.notes ilike '%' || n.term || '%'
        or i.status::text ilike '%' || n.term || '%'
      )
    order by i.issue_date desc
    limit p_limit_per_type
  ),
  maintenance_r as (
    select
      'maintenance'::text,
      m.id,
      m.title,
      m.category::text || ' · ' || coalesce(m.shop_name, m.mechanic_name, 'unassigned'),
      '/repairs?open=' || m.id::text,
      m.service_date
    from public.maintenance_records m, needle n
    where n.term is not null
      and (p_truck_id is null or m.truck_id = p_truck_id)
      and (
        m.title ilike '%' || n.term || '%'
        or m.description ilike '%' || n.term || '%'
        or m.shop_name ilike '%' || n.term || '%'
        or m.mechanic_name ilike '%' || n.term || '%'
        or m.invoice_number ilike '%' || n.term || '%'
      )
    order by m.service_date desc
    limit p_limit_per_type
  ),
  mileage_r as (
    select
      'mileage'::text,
      ml.id,
      to_char(ml.log_date, 'FMMon DD, YYYY') || ' · ' || to_char(ml.odometer, 'FM999,999,999') || ' mi',
      coalesce(ml.notes, 'Odometer log'),
      '/mileage',
      ml.log_date
    from public.mileage_logs ml, needle n
    where n.term is not null
      and (p_truck_id is null or ml.truck_id = p_truck_id)
      and ml.notes ilike '%' || n.term || '%'
    order by ml.log_date desc
    limit p_limit_per_type
  ),
  fuel_r as (
    select
      'mileage'::text,
      f.id,
      coalesce(f.station, 'Fuel stop') || ' · ' || to_char(f.gallons, 'FM999,990.0') || ' gal',
      coalesce(f.state, '') || ' · ' || to_char(f.fuel_date, 'FMMon DD, YYYY'),
      '/mileage',
      f.fuel_date
    from public.fuel_logs f, needle n
    where n.term is not null
      and (p_truck_id is null or f.truck_id = p_truck_id)
      and (f.station ilike '%' || n.term || '%' or f.notes ilike '%' || n.term || '%')
    order by f.fuel_date desc
    limit p_limit_per_type
  ),
  documents_r as (
    select
      'document'::text,
      d.id,
      d.title,
      d.category::text || ' · ' || d.folder,
      '/documents?q=' || replace(d.title, ' ', '+'),
      d.created_at::date
    from public.documents d, needle n
    where n.term is not null
      and (p_truck_id is null or d.truck_id = p_truck_id)
      and (
        d.title ilike '%' || n.term || '%'
        or d.file_name ilike '%' || n.term || '%'
        or d.folder ilike '%' || n.term || '%'
      )
    order by d.created_at desc
    limit p_limit_per_type
  ),
  shops_r as (
    select
      'shop'::text,
      s.id,
      s.name,
      coalesce(s.city || ', ' || s.state, s.address, s.category),
      '/map',
      null::date
    from public.service_shops s, needle n
    where n.term is not null
      and (
        s.name ilike '%' || n.term || '%'
        or s.city ilike '%' || n.term || '%'
        or s.brand ilike '%' || n.term || '%'
      )
    order by s.name
    limit p_limit_per_type
  )
  select * from trucks_r
  union all select * from invoices_r
  union all select * from maintenance_r
  union all select * from mileage_r
  union all select * from fuel_r
  union all select * from documents_r
  union all select * from shops_r;
$$;

grant execute on function public.global_search(text, uuid, int) to authenticated;

comment on function public.global_search is
  'Fans out a search term across trucks, invoices, maintenance/repairs, mileage & fuel, documents and service shops. Runs as the caller (security invoker) so RLS on each underlying table still applies — no separate search permission to maintain.';
