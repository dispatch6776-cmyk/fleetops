import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { downloadBlob } from '@/lib/utils';
import { formatDate } from '@/lib/format';

const BRAND = rgb(0.13, 0.39, 0.92);
const INK = rgb(0.09, 0.12, 0.18);
const MUTED = rgb(0.45, 0.5, 0.58);
const HAIRLINE = rgb(0.87, 0.89, 0.92);

const PAGE_WIDTH = 841.89; // A4 landscape
const PAGE_HEIGHT = 595.28;
const MARGIN = 40;
const ROW_HEIGHT = 18;

export interface ReportColumn {
  header: string;
  width: number;
  align?: 'left' | 'right';
}

export interface ReportSummaryItem {
  label: string;
  value: string;
}

export interface ReportSpec {
  title: string;
  subtitle: string;
  companyName: string;
  period: string;
  summary: ReportSummaryItem[];
  columns: ReportColumn[];
  rows: string[][];
  footnote?: string;
}

/** Builds a paginated landscape A4 report with a summary band and data table. */
export async function buildReportPdf(spec: ReportSpec): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(spec.title);
  pdf.setProducer('FleetOps');

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const totalWidth = spec.columns.reduce((sum, column) => sum + column.width, 0);
  const scale = (PAGE_WIDTH - MARGIN * 2) / totalWidth;
  const widths = spec.columns.map((column) => column.width * scale);

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursor = PAGE_HEIGHT - MARGIN;

  const write = (
    value: string,
    x: number,
    y: number,
    options: { size?: number; bold?: boolean; color?: typeof INK; align?: 'left' | 'right'; maxWidth?: number } = {},
  ) => {
    const size = options.size ?? 9;
    const font = options.bold ? bold : regular;
    let text = value;
    if (options.maxWidth) {
      while (font.widthOfTextAtSize(text, size) > options.maxWidth && text.length > 3) {
        text = `${text.slice(0, -4)}...`;
      }
    }
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: options.align === 'right' ? x - width : x,
      y,
      size,
      font,
      color: options.color ?? INK,
    });
  };

  const drawHeader = () => {
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 5, width: PAGE_WIDTH, height: 5, color: BRAND });
    write(spec.companyName, MARGIN, PAGE_HEIGHT - MARGIN + 4, { size: 9, color: MUTED });
    write(spec.title, MARGIN, PAGE_HEIGHT - MARGIN - 14, { size: 16, bold: true });
    write(spec.subtitle, MARGIN, PAGE_HEIGHT - MARGIN - 28, { size: 9, color: MUTED });
    write(spec.period, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - MARGIN - 14, {
      size: 9,
      color: MUTED,
      align: 'right',
    });
    write(`Generated ${formatDate(new Date())}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - MARGIN - 28, {
      size: 8,
      color: MUTED,
      align: 'right',
    });
    cursor = PAGE_HEIGHT - MARGIN - 48;
  };

  const drawTableHeader = () => {
    page.drawRectangle({
      x: MARGIN,
      y: cursor - 5,
      width: PAGE_WIDTH - MARGIN * 2,
      height: 20,
      color: rgb(0.96, 0.97, 0.99),
    });
    let x = MARGIN + 6;
    spec.columns.forEach((column, index) => {
      const columnWidth = widths[index];
      write(column.header.toUpperCase(), column.align === 'right' ? x + columnWidth - 12 : x, cursor, {
        size: 7.5,
        bold: true,
        color: MUTED,
        align: column.align === 'right' ? 'right' : 'left',
        maxWidth: columnWidth - 10,
      });
      x += columnWidth;
    });
    cursor -= 22;
  };

  const newPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawHeader();
    drawTableHeader();
  };

  drawHeader();

  // Summary band
  if (spec.summary.length) {
    const boxWidth = (PAGE_WIDTH - MARGIN * 2 - (spec.summary.length - 1) * 8) / spec.summary.length;
    spec.summary.forEach((item, index) => {
      const x = MARGIN + index * (boxWidth + 8);
      page.drawRectangle({
        x,
        y: cursor - 34,
        width: boxWidth,
        height: 42,
        color: rgb(0.97, 0.98, 1),
        borderColor: HAIRLINE,
        borderWidth: 0.75,
      });
      write(item.label.toUpperCase(), x + 10, cursor - 4, { size: 7, color: MUTED, bold: true });
      write(item.value, x + 10, cursor - 22, { size: 13, bold: true });
    });
    cursor -= 56;
  }

  drawTableHeader();

  for (const row of spec.rows) {
    if (cursor < MARGIN + 30) newPage();

    let x = MARGIN + 6;
    row.forEach((cell, index) => {
      const column = spec.columns[index];
      const columnWidth = widths[index];
      write(cell, column?.align === 'right' ? x + columnWidth - 12 : x, cursor, {
        size: 8.5,
        align: column?.align === 'right' ? 'right' : 'left',
        maxWidth: columnWidth - 10,
      });
      x += columnWidth;
    });

    page.drawLine({
      start: { x: MARGIN, y: cursor - 6 },
      end: { x: PAGE_WIDTH - MARGIN, y: cursor - 6 },
      thickness: 0.5,
      color: HAIRLINE,
    });
    cursor -= ROW_HEIGHT;
  }

  // Footer on every page
  const pages = pdf.getPages();
  pages.forEach((current, index) => {
    current.drawText(`FleetOps · page ${index + 1} of ${pages.length}`, {
      x: PAGE_WIDTH - MARGIN - 110,
      y: MARGIN - 18,
      size: 7.5,
      font: regular,
      color: MUTED,
    });
    if (spec.footnote) {
      current.drawText(spec.footnote, {
        x: MARGIN,
        y: MARGIN - 18,
        size: 7.5,
        font: regular,
        color: MUTED,
      });
    }
  });

  return pdf.save();
}

export async function downloadReportPdf(spec: ReportSpec, filename: string) {
  const bytes = await buildReportPdf(spec);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  downloadBlob(
    new Blob([buffer], { type: 'application/pdf' }),
    `${filename}-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}
