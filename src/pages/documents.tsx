import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Download,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderOpen,
  Grid2x2,
  List,
  Trash2,
  Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable, type Column } from '@/components/common/data-table';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { PermissionGate } from '@/components/common/permission-gate';
import { UploadDialog } from '@/features/documents/components/upload-dialog';
import {
  useDocumentMutations,
  useDocumentOpener,
  useDocuments,
  useFolders,
} from '@/features/documents/hooks';
import { useActiveTruck } from '@/features/trucks/hooks';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { DOCUMENT_CATEGORY_LABELS, toOptions } from '@/lib/constants';
import { daysUntil, formatDate } from '@/lib/format';
import { formatBytes, cn } from '@/lib/utils';
import type { DocumentCategory, DocumentRecord } from '@/types';

function iconFor(document: DocumentRecord) {
  const mime = document.mime_type ?? '';
  if (mime.startsWith('image/')) return FileImage;
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
    return FileSpreadsheet;
  }
  if (mime.includes('zip')) return FileArchive;
  return FileText;
}

export default function DocumentsPage() {
  const { truck, truckId } = useActiveTruck();
  const [searchParams] = useSearchParams();
  // Deep link from global search (`/documents?q=<title>`) pre-fills the box;
  // the title is specific enough that it also visually highlights the match.
  const [search, setSearch] = useState(() => searchParams.get('q')?.replace(/\+/g, ' ') ?? '');
  const [category, setCategory] = useState<DocumentCategory | 'all'>('all');
  const [folder, setFolder] = useState<string>('all');
  const [uploadOpen, setUploadOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 250);
  const filters = useMemo(
    () => ({ category, folder, search: debouncedSearch || undefined }),
    [category, folder, debouncedSearch],
  );

  const documents = useDocuments(truckId, filters);
  const folders = useFolders(truckId);
  const opener = useDocumentOpener();
  const mutations = useDocumentMutations(truckId);

  const rows = documents.data ?? [];
  const expiringSoon = rows.filter((row) => {
    const days = daysUntil(row.expires_on);
    return days != null && days <= 30;
  });

  const columns: Column<DocumentRecord>[] = [
    {
      id: 'title',
      header: 'Document',
      value: (row) => row.title,
      cell: (row) => {
        const Icon = iconFor(row);
        return (
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{row.title}</p>
              <p className="truncate text-xs text-muted-foreground">{row.file_name}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'category',
      header: 'Category',
      value: (row) => DOCUMENT_CATEGORY_LABELS[row.category],
      cell: (row) => <Badge variant="neutral">{DOCUMENT_CATEGORY_LABELS[row.category]}</Badge>,
    },
    {
      id: 'folder',
      header: 'Folder',
      value: (row) => row.folder,
      cell: (row) => <span className="text-muted-foreground">{row.folder}</span>,
    },
    {
      id: 'expires',
      header: 'Expires',
      value: (row) => row.expires_on,
      cell: (row) => {
        const days = daysUntil(row.expires_on);
        if (!row.expires_on) return <span className="text-muted-foreground">—</span>;
        return (
          <Badge variant={days != null && days < 0 ? 'danger' : days != null && days <= 30 ? 'warning' : 'neutral'}>
            {formatDate(row.expires_on)}
          </Badge>
        );
      },
    },
    {
      id: 'size',
      header: 'Size',
      align: 'right',
      value: (row) => Number(row.size_bytes ?? 0),
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.size_bytes ? formatBytes(Number(row.size_bytes)) : '—'}
        </span>
      ),
    },
    {
      id: 'uploaded',
      header: 'Uploaded',
      value: (row) => row.created_at,
      cell: (row) => <span className="whitespace-nowrap">{formatDate(row.created_at)}</span>,
    },
    {
      id: 'actions',
      header: '',
      sortable: false,
      align: 'right',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Open ${row.title}`}
            onClick={(event) => {
              event.stopPropagation();
              opener.mutate(row);
            }}
          >
            <Download />
          </Button>
          <PermissionGate permission="documents.delete">
            <ConfirmDialog
              destructive
              title={`Delete “${row.title}”?`}
              description="The file is removed from storage as well. This cannot be undone."
              confirmLabel="Delete document"
              onConfirm={() => mutations.remove.mutateAsync(row)}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${row.title}`}>
                  <Trash2 />
                </Button>
              }
            />
          </PermissionGate>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document center"
        description={
          truck
            ? `Insurance, registration, inspections, receipts and photos for ${truck.truck_number}.`
            : 'Insurance, registration, inspections, receipts and photos.'
        }
        actions={
          <PermissionGate permission="documents.upload">
            <Button onClick={() => setUploadOpen(true)}>
              <Upload />
              Upload
            </Button>
          </PermissionGate>
        }
      />

      {expiringSoon.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/40 bg-warning-soft/50 px-4 py-3 text-sm">
          <Badge variant="warning">{expiringSoon.length}</Badge>
          <span className="font-medium">
            {expiringSoon.length === 1 ? 'A document expires' : 'Documents expire'} within 30 days:
          </span>
          <span className="text-muted-foreground">
            {expiringSoon.map((row) => row.title).slice(0, 3).join(', ')}
            {expiringSoon.length > 3 ? ` and ${expiringSoon.length - 3} more` : ''}
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs"
          placeholder="Search documents…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search documents"
        />
        <NativeSelect
          className="w-44"
          aria-label="Filter by category"
          value={category}
          onChange={(event) => setCategory(event.target.value as DocumentCategory | 'all')}
          options={[{ value: 'all', label: 'All categories' }, ...toOptions(DOCUMENT_CATEGORY_LABELS)]}
        />
        <NativeSelect
          className="w-40"
          aria-label="Filter by folder"
          value={folder}
          onChange={(event) => setFolder(event.target.value)}
          options={[
            { value: 'all', label: 'All folders' },
            ...(folders.data ?? []).map((name) => ({ value: name, label: name })),
          ]}
        />
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="size-3.5" aria-hidden />
          {rows.length} documents
        </span>
      </div>

      <Tabs defaultValue="grid">
        <TabsList>
          <TabsTrigger value="grid">
            <Grid2x2 />
            Grid
          </TabsTrigger>
          <TabsTrigger value="list">
            <List />
            List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid">
          {documents.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonCard key={index} className="h-36" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No documents yet"
              description="Upload insurance certificates, registration, inspection reports, shop invoices and repair photos."
              action={
                <PermissionGate permission="documents.upload">
                  <Button onClick={() => setUploadOpen(true)}>
                    <Upload />
                    Upload your first document
                  </Button>
                </PermissionGate>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rows.map((row) => {
                const Icon = iconFor(row);
                const days = daysUntil(row.expires_on);
                return (
                  <Card
                    key={row.id}
                    className="group flex h-full flex-col justify-between p-4 transition-shadow hover:shadow-pop"
                  >
                    <CardContent className="space-y-3 p-0">
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            'flex size-10 items-center justify-center rounded-xl',
                            row.is_financial ? 'bg-warning-soft text-warning' : 'bg-primary/10 text-primary',
                          )}
                        >
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Open ${row.title}`}
                            onClick={() => opener.mutate(row)}
                          >
                            <Download />
                          </Button>
                          <PermissionGate permission="documents.delete">
                            <ConfirmDialog
                              destructive
                              title={`Delete “${row.title}”?`}
                              description="The file is removed from storage as well."
                              confirmLabel="Delete"
                              onConfirm={() => mutations.remove.mutateAsync(row)}
                              trigger={
                                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${row.title}`}>
                                  <Trash2 />
                                </Button>
                              }
                            />
                          </PermissionGate>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="line-clamp-2 text-sm font-medium">{row.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.folder} · {row.size_bytes ? formatBytes(Number(row.size_bytes)) : '—'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="neutral">{DOCUMENT_CATEGORY_LABELS[row.category]}</Badge>
                        {row.expires_on ? (
                          <Badge
                            variant={
                              days != null && days < 0 ? 'danger' : days != null && days <= 30 ? 'warning' : 'neutral'
                            }
                          >
                            {days != null && days < 0 ? 'Expired' : `Expires ${formatDate(row.expires_on)}`}
                          </Badge>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list">
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(row) => row.id}
            loading={documents.isLoading}
            searchable={false}
            onRowClick={(row) => opener.mutate(row)}
            emptyTitle="No documents match your filters"
            initialSort={{ columnId: 'uploaded', direction: 'desc' }}
          />
        </TabsContent>
      </Tabs>

      {truckId ? (
        <UploadDialog
          truckId={truckId}
          folders={folders.data ?? []}
          open={uploadOpen}
          onOpenChange={setUploadOpen}
        />
      ) : null}
    </div>
  );
}
