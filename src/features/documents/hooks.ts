import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { queryKeys } from '@/app/query-client';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { DocumentRecord, TablesUpdate } from '@/types';
import {
  deleteDocument,
  getSignedUrl,
  listDocuments,
  listFolders,
  updateDocument,
  uploadDocument,
  type DocumentFilters,
  type UploadParams,
} from './api/documents.api';

export function useDocuments(truckId: string | null, filters: DocumentFilters = {}) {
  return useQuery({
    queryKey: queryKeys.documents(truckId ?? 'none', JSON.stringify(filters)),
    queryFn: () => listDocuments(truckId as string, filters),
    enabled: Boolean(truckId) && isSupabaseConfigured,
  });
}

export function useFolders(truckId: string | null) {
  return useQuery({
    queryKey: [...queryKeys.documents(truckId ?? 'none'), 'folders'],
    queryFn: () => listFolders(truckId as string),
    enabled: Boolean(truckId) && isSupabaseConfigured,
  });
}

export function useDocumentMutations(truckId: string | null) {
  const queryClient = useQueryClient();

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['documents'] });
    if (truckId) void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(truckId) });
  }

  const upload = useMutation({
    mutationFn: (params: UploadParams) => uploadDocument(params),
    onSuccess: () => {
      toast.success('Document uploaded');
      invalidate();
    },
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'documents'> }) =>
      updateDocument(id, patch),
    onSuccess: () => {
      toast.success('Document updated');
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: (document: DocumentRecord) => deleteDocument(document),
    onSuccess: () => {
      toast.success('Document deleted');
      invalidate();
    },
  });

  return { upload, update, remove };
}

/** Opens a private document in a new tab using a short-lived signed URL. */
export function useDocumentOpener() {
  return useMutation({
    mutationFn: (document: DocumentRecord) => getSignedUrl(document),
    onSuccess: (url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Could not open the document');
    },
  });
}
