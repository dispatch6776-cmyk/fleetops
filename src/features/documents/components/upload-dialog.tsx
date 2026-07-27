import { useRef, useState, type DragEvent } from 'react';
import { FileUp, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { DOCUMENT_CATEGORY_LABELS, toOptions } from '@/lib/constants';
import { formatBytes, cn } from '@/lib/utils';
import { useDocumentMutations } from '../hooks';
import type { DocumentCategory } from '@/types';

export function UploadDialog({
  truckId,
  folders,
  maintenanceId,
  open,
  onOpenChange,
}: {
  truckId: string;
  folders: string[];
  maintenanceId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { upload } = useDocumentMutations(truckId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [meta, setMeta] = useState({
    title: '',
    category: 'other' as DocumentCategory,
    folder: 'General',
    description: '',
    issued_on: '',
    expires_on: '',
  });

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list);
    setFiles((current) => [...current, ...next]);
    if (!meta.title && next[0]) {
      setMeta((current) => ({ ...current, title: next[0].name.replace(/\.[^.]+$/, '') }));
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  async function submit() {
    if (files.length === 0) {
      toast.error('Choose at least one file');
      return;
    }

    for (const [index, file] of files.entries()) {
      await upload.mutateAsync({
        truckId,
        file,
        title: files.length === 1 ? meta.title || file.name : `${meta.title || 'Document'} (${index + 1})`,
        category: meta.category,
        folder: meta.folder || 'General',
        description: meta.description || undefined,
        issuedOn: meta.issued_on || null,
        expiresOn: meta.expires_on || null,
        maintenanceId: maintenanceId ?? null,
      });
    }

    setFiles([]);
    setMeta({
      title: '',
      category: 'other',
      folder: 'General',
      description: '',
      issued_on: '',
      expires_on: '',
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload documents</DialogTitle>
          <DialogDescription>
            Invoices, receipts and leases are stored in a separate, owner-only bucket automatically.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
            dragging ? 'border-primary bg-primary/5' : 'border-border bg-surface-muted/40',
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileUp className="size-5" aria-hidden />
          </span>
          <p className="text-sm font-medium">Drag files here</p>
          <p className="text-xs text-muted-foreground">
            PDF, images, Word, Excel or CSV — up to 25 MB each
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => addFiles(event.target.files)}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            Browse files
          </Button>
        </div>

        {files.length > 0 ? (
          <ul className="space-y-1.5">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">{file.name}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                  <button
                    type="button"
                    onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                    aria-label={`Remove ${file.name}`}
                    className="rounded p-0.5 hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Title" htmlFor="doc_title" required>
            <Input
              id="doc_title"
              value={meta.title}
              onChange={(event) => setMeta({ ...meta, title: event.target.value })}
            />
          </FormField>
          <FormField label="Category" htmlFor="doc_category" required>
            <NativeSelect
              id="doc_category"
              value={meta.category}
              onChange={(event) =>
                setMeta({ ...meta, category: event.target.value as DocumentCategory })
              }
              options={toOptions(DOCUMENT_CATEGORY_LABELS)}
            />
          </FormField>
          <FormField label="Folder" htmlFor="doc_folder" hint="Group related paperwork together.">
            <Input
              id="doc_folder"
              list="folder-options"
              value={meta.folder}
              onChange={(event) => setMeta({ ...meta, folder: event.target.value })}
            />
            <datalist id="folder-options">
              {folders.map((folder) => (
                <option key={folder} value={folder} />
              ))}
            </datalist>
          </FormField>
          <FormField label="Issued on" htmlFor="doc_issued">
            <Input
              id="doc_issued"
              type="date"
              value={meta.issued_on}
              onChange={(event) => setMeta({ ...meta, issued_on: event.target.value })}
            />
          </FormField>
          <FormField
            label="Expires on"
            htmlFor="doc_expires"
            hint="Adds a renewal alert 30 days ahead."
          >
            <Input
              id="doc_expires"
              type="date"
              value={meta.expires_on}
              onChange={(event) => setMeta({ ...meta, expires_on: event.target.value })}
            />
          </FormField>
          <FormField label="Description" htmlFor="doc_description" className="sm:col-span-2">
            <Textarea
              id="doc_description"
              rows={2}
              value={meta.description}
              onChange={(event) => setMeta({ ...meta, description: event.target.value })}
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={upload.isPending || files.length === 0}>
            {upload.isPending ? <Loader2 className="animate-spin" /> : <FileUp />}
            Upload {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''}` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
