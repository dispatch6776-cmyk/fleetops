import writeXlsxFile, { type Row, type SheetData } from 'write-excel-file';
import Papa from 'papaparse';
import { downloadBlob } from '@/lib/utils';

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number | Date | null | undefined;
  width?: number;
  /** Formats the Excel cell; CSV always uses the raw value. */
  type?: 'string' | 'number' | 'currency' | 'date';
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Exports rows to a CSV file. */
export function exportCsv<T>(rows: T[], columns: ExportColumn<T>[], filename: string) {
  const data = rows.map((row) => {
    const record: Record<string, unknown> = {};
    for (const column of columns) {
      const value = column.value(row);
      record[column.header] = value instanceof Date ? value.toISOString().slice(0, 10) : (value ?? '');
    }
    return record;
  });

  const csv = Papa.unparse(data, { quotes: true });
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${filename}-${stamp()}.csv`);
}

/** Exports rows to a formatted .xlsx workbook. */
export async function exportExcel<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sheetName = 'Export',
) {
  // Every cell needs an explicit `type` (even the plain-string header row) —
  // write-excel-file's TS types can't discriminate `value`'s type from the
  // object shape alone, and an omitted `type` makes the whole row fail to
  // match `Row`/`SheetData` instead of just losing formatting.
  const header: Row = columns.map((column) => ({
    value: column.header,
    type: String,
    fontWeight: 'bold' as const,
    backgroundColor: '#EEF2FF',
    align: 'left' as const,
  }));

  const body: SheetData = rows.map((row) =>
    columns.map((column): Row[number] => {
      const value = column.value(row);
      if (value == null || value === '') return { value: undefined, type: String };
      switch (column.type) {
        case 'number':
          return { value: Number(value), type: Number, format: '#,##0.##' };
        case 'currency':
          return { value: Number(value), type: Number, format: '$#,##0.00' };
        case 'date':
          return { value: value instanceof Date ? value : new Date(String(value)), type: Date, format: 'mm/dd/yyyy' };
        default:
          return { value: String(value), type: String };
      }
    }),
  );

  await writeXlsxFile([header, ...body], {
    columns: columns.map((column) => ({ width: column.width ?? 18 })),
    fileName: `${filename}-${stamp()}.xlsx`,
    sheet: sheetName,
  });
}

/** Parses an uploaded CSV file into typed rows. */
export function parseCsv<T extends Record<string, string>>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (result: { data: unknown[]; errors: { message: string }[] }) => {
        if (result.errors.length) {
          reject(new Error(result.errors[0].message));
          return;
        }
        resolve(result.data as T[]);
      },
      error: (error: Error) => reject(error),
    });
  });
}
