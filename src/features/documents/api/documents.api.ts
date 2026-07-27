import { requireSupabase } from '@/lib/supabase';
import { MAX_UPLOAD_BYTES } from '@/lib/constants';
import type { DocumentCategory, DocumentRecord, TablesUpdate } from '@/types';

/** Financial paperwork lives in its own bucket so storage policies can gate it. */
export const FINANCIAL_BUCKET = 'financial-documents';
export const DOCUMENT_BUCKET = 'documents';
export const PHOTO_BUCKET = 'maintenance-photos';

const FINANCIAL_CATEGORIES: DocumentCategory[] = ['invoice', 'receipt', 'lease'];

export function bucketFor(category: DocumentCategory, isFinancial: boolean): string {
  if (isFinancial || FINANCIAL_CATEGORIES.includes(category)) return FINANCIAL_BUCKET;
  if (category === 'photo' || category === 'video') return PHOTO_BUCKET;
  return DOCUMENT_BUCKET;
}

export interface DocumentFilters {
  category?: DocumentCategory | 'all';
  folder?: string | 'all';
  search?: string;
}

export async function listDocuments(
  truckId: string,
  filters: DocumentFilters = {},
): Promise<DocumentRecord[]> {
  const supabase = requireSupabase();
  let query = supabase
    .from('documents')
    .select('*')
    .eq('truck_id', truckId)
    .order('created_at', { ascending: false });

  if (filters.category && filters.category !== 'all') query = query.eq('category', filters.category);
  if (filters.folder && filters.folder !== 'all') query = query.eq('folder', filters.folder);
  if (filters.search) query = query.ilike('title', `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface UploadParams {
  truckId: string;
  file: File;
  title: string;
  category: DocumentCategory;
  folder: string;
  description?: string;
  expiresOn?: string | null;
  issuedOn?: string | null;
  tags?: string[];
  maintenanceId?: string | null;
  invoiceId?: string | null;
  isFinancial?: boolean;
}

function safeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^\w.\- ]/g, '')
    .replace(/\s+/g, '-')
    .slice(-80);
}

/**
 * Uploads the file to Storage, then records the metadata row. If the metadata
 * insert fails the object is removed again so the bucket never accumulates
 * orphans.
 */
export async function uploadDocument(params: UploadParams): Promise<DocumentRecord> {
  const supabase = requireSupabase();

  if (params.file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Files must be smaller than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`);
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('You are not signed in.');

  const isFinancial = params.isFinancial ?? FINANCIAL_CATEGORIES.includes(params.category);
  const bucket = bucketFor(params.category, isFinancial);
  const path = `${params.truckId}/${params.category}/${Date.now()}-${safeName(params.file.name)}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, params.file, {
    cacheControl: '3600',
    upsert: false,
    contentType: params.file.type || 'application/octet-stream',
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from('documents')
    .insert({
      truck_id: params.truckId,
      category: params.category,
      folder: params.folder || 'General',
      title: params.title || params.file.name,
      description: params.description || null,
      storage_bucket: bucket,
      storage_path: path,
      file_name: params.file.name,
      mime_type: params.file.type || null,
      size_bytes: params.file.size,
      issued_on: params.issuedOn || null,
      expires_on: params.expiresOn || null,
      is_financial: isFinancial,
      tags: params.tags ?? [],
      maintenance_id: params.maintenanceId ?? null,
      invoice_id: params.invoiceId ?? null,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from(bucket).remove([path]);
    throw new Error(error.message);
  }

  return data;
}

export async function updateDocument(
  id: string,
  patch: TablesUpdate<'documents'>,
): Promise<DocumentRecord> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('documents').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteDocument(document: DocumentRecord): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('documents').delete().eq('id', document.id);
  if (error) throw new Error(error.message);
  await supabase.storage.from(document.storage_bucket).remove([document.storage_path]);
}

/** Short-lived signed URL for previewing or downloading a private object. */
export async function getSignedUrl(document: DocumentRecord, expiresIn = 300): Promise<string> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.storage
    .from(document.storage_bucket)
    .createSignedUrl(document.storage_path, expiresIn);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function listFolders(truckId: string): Promise<string[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('documents').select('folder').eq('truck_id', truckId);
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((row) => row.folder))].sort();
}
