-- =============================================================================
-- FleetOps · 0009 · Storage buckets and object policies
--
-- Four buckets, split by who is allowed to see the contents:
--   documents            operational paperwork  (all members read)
--   financial-documents  invoices, receipts     (Owner/Administrator only)
--   maintenance-photos   repair photos          (all members read)
--   avatars              profile pictures       (public read)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('documents', 'documents', false, 26214400,
   array['application/pdf','image/png','image/jpeg','image/webp','image/heic',
         'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'text/csv','text/plain']),
  ('financial-documents', 'financial-documents', false, 26214400,
   array['application/pdf','image/png','image/jpeg','image/webp','text/csv',
         'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('maintenance-photos', 'maintenance-photos', false, 52428800,
   array['image/png','image/jpeg','image/webp','image/heic','video/mp4','video/quicktime']),
  ('avatars', 'avatars', true, 2097152,
   array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = excluded.public;

-- ---------------------------------------------------------------------------
-- documents bucket — every member reads, maintenance-capable roles upload
-- ---------------------------------------------------------------------------
drop policy if exists "documents read" on storage.objects;
create policy "documents read" on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and public.is_authenticated_member());

drop policy if exists "documents upload" on storage.objects;
create policy "documents upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and public.can_edit_maintenance() and owner = auth.uid());

drop policy if exists "documents update" on storage.objects;
create policy "documents update" on storage.objects
  for update to authenticated
  using (bucket_id = 'documents' and (public.is_admin() or owner = auth.uid()));

drop policy if exists "documents delete" on storage.objects;
create policy "documents delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and (public.is_admin() or owner = auth.uid()));

-- ---------------------------------------------------------------------------
-- financial-documents bucket — Owner and Administrator only
-- ---------------------------------------------------------------------------
drop policy if exists "financial documents all" on storage.objects;
create policy "financial documents all" on storage.objects
  for all to authenticated
  using (bucket_id = 'financial-documents' and public.is_admin())
  with check (bucket_id = 'financial-documents' and public.is_admin());

-- ---------------------------------------------------------------------------
-- maintenance-photos bucket
-- ---------------------------------------------------------------------------
drop policy if exists "maintenance photos read" on storage.objects;
create policy "maintenance photos read" on storage.objects
  for select to authenticated
  using (bucket_id = 'maintenance-photos' and public.is_authenticated_member());

drop policy if exists "maintenance photos write" on storage.objects;
create policy "maintenance photos write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'maintenance-photos' and public.can_edit_maintenance() and owner = auth.uid());

drop policy if exists "maintenance photos modify" on storage.objects;
create policy "maintenance photos modify" on storage.objects
  for update to authenticated
  using (bucket_id = 'maintenance-photos' and (public.is_admin() or owner = auth.uid()));

drop policy if exists "maintenance photos delete" on storage.objects;
create policy "maintenance photos delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'maintenance-photos' and (public.is_admin() or owner = auth.uid()));

-- ---------------------------------------------------------------------------
-- avatars bucket — public read, users manage their own file
-- ---------------------------------------------------------------------------
drop policy if exists "avatars read" on storage.objects;
create policy "avatars read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists "avatars write own" on storage.objects;
create policy "avatars write own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and owner = auth.uid()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());
