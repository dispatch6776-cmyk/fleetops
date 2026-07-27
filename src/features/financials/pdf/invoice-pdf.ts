import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { downloadBlob } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { AppSettingsRow, InvoiceDetail, Truck } from '@/types';

const BRAND = rgb(0.13, 0.39, 0.92);
const INK = rgb(0.09, 0.12, 0.18);
const MUTED = rgb(0.45, 0.5, 0.58);
const HAIRLINE = rgb(0.85, 0.87, 0.9);

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;

function money(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Renders a print-ready A4 invoice with pdf-lib — no server round-trip and no
 * headless browser required.
 */
export async function buildInvoicePdf({
  invoice,
  settings,
  truck,
}: {
  invoice: InvoiceDetail;
  settings: AppSettingsRow | null;
  truck: Truck | null;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${invoice.invoice_number}`);
  pdf.setProducer('FleetOps');
  pdf.setCreator('FleetOps');

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let cursor = PAGE_HEIGHT - MARGIN;

  const text = (
    value: string,
    x: number,
    y: number,
    options: {
      size?: number;
      font?: typeof regular;
      color?: typeof INK;
      align?: 'left' | 'right';
    } = {},
  ) => {
    const size = options.size ?? 10;
    const font = options.font ?? regular;
    const width = font.widthOfTextAtSize(value, size);
    page.drawText(value, {
      x: options.align === 'right' ? x - width : x,
      y,
      size,
      font,
      color: options.color ?? INK,
    });
  };

  const line = (y: number) =>
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.75,
      color: HAIRLINE,
    });

  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 6, width: PAGE_WIDTH, height: 6, color: BRAND });

  text(settings?.company_name ?? 'FleetOps', MARGIN, cursor - 12, { size: 16, font: bold });
  cursor -= 30;
  for (const detail of [settings?.company_address, settings?.company_phone, settings?.company_email]) {
    if (!detail) continue;
    text(detail, MARGIN, cursor, { size: 9, color: MUTED });
    cursor -= 12;
  }

  let metaY = PAGE_HEIGHT - MARGIN - 12;
  text('INVOICE', PAGE_WIDTH - MARGIN, metaY, { size: 18, font: bold, color: BRAND, align: 'right' });
  metaY -= 22;
  text(invoice.invoice_number, PAGE_WIDTH - MARGIN, metaY, { size: 11, font: bold, align: 'right' });
  metaY -= 16;
  text(`Issued ${formatDate(invoice.issue_date)}`, PAGE_WIDTH - MARGIN, metaY, {
    size: 9,
    color: MUTED,
    align: 'right',
  });
  metaY -= 12;
  text(`Due ${formatDate(invoice.due_date)}`, PAGE_WIDTH - MARGIN, metaY, {
    size: 9,
    color: MUTED,
    align: 'right',
  });
  metaY -= 12;
  text(`Status: ${invoice.status.toUpperCase()}`, PAGE_WIDTH - MARGIN, metaY, {
    size: 9,
    font: bold,
    color: invoice.status === 'paid' ? rgb(0.08, 0.55, 0.36) : MUTED,
    align: 'right',
  });

  cursor = Math.min(cursor, metaY) - 24;
  line(cursor);
  cursor -= 22;

  text('BILL TO', MARGIN, cursor, { size: 8, font: bold, color: MUTED });
  text('EQUIPMENT', PAGE_WIDTH / 2 + 10, cursor, { size: 8, font: bold, color: MUTED });
  cursor -= 15;

  const company = invoice.rental_company;
  const billTo = [
    company?.name,
    company?.contact_name,
    [company?.address_line1, company?.city, company?.state, company?.postal_code]
      .filter(Boolean)
      .join(', '),
    company?.phone,
    company?.email,
  ].filter(Boolean) as string[];

  const equipment = truck
    ? [
        `${truck.year} ${truck.make} ${truck.model}`,
        `Unit ${truck.truck_number}`,
        `VIN ${truck.vin}`,
        `Plate ${truck.license_plate}${truck.plate_state ? ` (${truck.plate_state})` : ''}`,
      ]
    : [];

  const rows = Math.max(billTo.length, equipment.length);
  for (let index = 0; index < rows; index += 1) {
    if (billTo[index]) {
      text(billTo[index], MARGIN, cursor, { size: 9.5, font: index === 0 ? bold : regular });
    }
    if (equipment[index]) {
      text(equipment[index], PAGE_WIDTH / 2 + 10, cursor, {
        size: 9.5,
        font: index === 0 ? bold : regular,
        color: index === 0 ? INK : MUTED,
      });
    }
    cursor -= 13;
  }

  if (invoice.period_start && invoice.period_end) {
    cursor -= 6;
    text(
      `Service period: ${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}`,
      MARGIN,
      cursor,
      { size: 9, color: MUTED },
    );
    cursor -= 14;
  }

  cursor -= 10;

  const colQty = PAGE_WIDTH - MARGIN - 250;
  const colPrice = PAGE_WIDTH - MARGIN - 140;
  const colTotal = PAGE_WIDTH - MARGIN;

  page.drawRectangle({
    x: MARGIN,
    y: cursor - 6,
    width: PAGE_WIDTH - MARGIN * 2,
    height: 22,
    color: rgb(0.96, 0.97, 0.99),
  });
  text('DESCRIPTION', MARGIN + 8, cursor, { size: 8, font: bold, color: MUTED });
  text('QTY', colQty, cursor, { size: 8, font: bold, color: MUTED, align: 'right' });
  text('UNIT PRICE', colPrice, cursor, { size: 8, font: bold, color: MUTED, align: 'right' });
  text('AMOUNT', colTotal - 8, cursor, { size: 8, font: bold, color: MUTED, align: 'right' });
  cursor -= 24;

  for (const item of invoice.line_items ?? []) {
    const description =
      item.description.length > 58 ? `${item.description.slice(0, 55)}...` : item.description;
    text(description, MARGIN + 8, cursor, { size: 10 });
    text(String(Number(item.quantity)), colQty, cursor, { size: 10, align: 'right' });
    text(money(item.unit_price), colPrice, cursor, { size: 10, align: 'right' });
    text(money(item.line_total), colTotal - 8, cursor, { size: 10, font: bold, align: 'right' });
    cursor -= 18;
    line(cursor + 6);
  }

  cursor -= 12;

  const totals: [string, string, boolean][] = [['Subtotal', money(invoice.subtotal), false]];
  if (Number(invoice.discount_amount) > 0) {
    totals.push(['Discount', `-${money(invoice.discount_amount)}`, false]);
  }
  if (Number(invoice.tax_amount) > 0) {
    totals.push([
      `Tax (${(Number(invoice.tax_rate) * 100).toFixed(2)}%)`,
      money(invoice.tax_amount),
      false,
    ]);
  }
  totals.push(['Total', money(invoice.total), true]);
  totals.push(['Amount paid', money(invoice.amount_paid), false]);
  totals.push(['Balance due', money(invoice.balance), true]);

  for (const [label, value, emphasise] of totals) {
    text(label, colPrice, cursor, {
      size: emphasise ? 11 : 10,
      font: emphasise ? bold : regular,
      color: emphasise ? INK : MUTED,
      align: 'right',
    });
    text(value, colTotal - 8, cursor, {
      size: emphasise ? 11 : 10,
      font: emphasise ? bold : regular,
      align: 'right',
    });
    cursor -= emphasise ? 20 : 16;
  }

  if (invoice.payments?.length) {
    cursor -= 8;
    text('PAYMENTS APPLIED', MARGIN, cursor, { size: 8, font: bold, color: MUTED });
    cursor -= 14;
    for (const payment of invoice.payments) {
      text(
        `${formatDate(payment.payment_date)} · ${payment.method.toUpperCase()}${
          payment.reference ? ` · ${payment.reference}` : ''
        }`,
        MARGIN,
        cursor,
        { size: 9, color: MUTED },
      );
      text(money(payment.amount), colTotal - 8, cursor, { size: 9, align: 'right' });
      cursor -= 13;
    }
  }

  const footerY = MARGIN + 40;
  line(footerY + 26);
  const terms = invoice.terms ?? settings?.invoice_terms ?? '';
  if (terms) {
    const wrapped = terms.match(/.{1,110}(\s|$)/g) ?? [terms];
    let termY = footerY + 12;
    for (const chunk of wrapped.slice(0, 3)) {
      text(chunk.trim(), MARGIN, termY, { size: 8, color: MUTED });
      termY -= 10;
    }
  }
  text(`Generated by FleetOps · ${formatDate(new Date())}`, PAGE_WIDTH - MARGIN, footerY - 14, {
    size: 8,
    color: MUTED,
    align: 'right',
  });

  return pdf.save();
}

export async function downloadInvoicePdf(params: {
  invoice: InvoiceDetail;
  settings: AppSettingsRow | null;
  truck: Truck | null;
}) {
  const bytes = await buildInvoicePdf(params);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  downloadBlob(
    new Blob([buffer], { type: 'application/pdf' }),
    `${params.invoice.invoice_number}.pdf`,
  );
}
