'use client';

/**
 * Handovers Report — PDF ONLY (A4 portrait, matches Print).
 * Columns: No. | Parties | Methods (2-part) | Total | Status
 */

import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { CompletedHandoversReportExportRow } from '@/types/reports/completed-handovers';

const COL_PERCENTS = [5, 20, 30, 12, 33] as const;

function pageSize(doc: jsPDF): { width: number; height: number } {
  return {
    width: doc.internal.pageSize.getWidth(),
    height: doc.internal.pageSize.getHeight(),
  };
}

let cachedLogoDataUrl: string | null | undefined;

async function loadLogoDataUrl(src: string): Promise<string | null> {
  if (cachedLogoDataUrl !== undefined && src === RUHUNU_HOSPITAL_LOGO_SRC) {
    return cachedLogoDataUrl;
  }
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    if (src === RUHUNU_HOSPITAL_LOGO_SRC) cachedLogoDataUrl = dataUrl;
    return dataUrl;
  } catch {
    if (src === RUHUNU_HOSPITAL_LOGO_SRC) cachedLogoDataUrl = null;
    return null;
  }
}

async function drawHeader(
  doc: jsPDF,
  opts: {
    reportName: string;
    summaryItems: BrandedPdfSummaryItem[];
    margin: number;
  }
): Promise<number> {
  const { margin, reportName, summaryItems } = opts;
  const { width: pageWidth } = pageSize(doc);
  let y = margin;

  const logoH = 11;
  const logoMaxW = 44;
  let textX = margin;
  const logoData = await loadLogoDataUrl(RUHUNU_HOSPITAL_LOGO_SRC);
  if (logoData) {
    const logoW = Math.min(logoMaxW, logoH * (526 / 160));
    doc.addImage(logoData, 'PNG', margin, y, logoW, logoH);
    textX = margin + logoW + 3.5;
  }

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(RUHUNU_PRINT_BRAND_NAME.toUpperCase(), textX, y + 4);
  doc.setFontSize(9.5);
  doc.setTextColor(51, 51, 51);
  doc.text(
    doc.splitTextToSize(reportName.toUpperCase(), pageWidth - textX - margin),
    textX,
    y + 8.5
  );
  y += logoH + 1.8;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 2.5;

  const barH = 5;
  const contentWidth = pageWidth - margin * 2;
  doc.setFillColor(232, 232, 232);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(margin, y, contentWidth, barH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('REPORT SUMMARY', margin + 2, y + 3.4);
  y += barH;

  const padX = 2;
  const padY = 1.8;
  const boxTop = y;
  const items = summaryItems.length ? summaryItems : [{ label: '—', value: '—' }];

  let cursorY = boxTop + padY;
  const fullWidthItems = items.filter((i) => i.fullWidth);
  const gridItems = items.filter((i) => !i.fullWidth);

  for (const item of fullWidthItems) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(85, 85, 85);
    doc.text(item.label.toUpperCase(), margin + padX, cursorY + 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(item.value || '—', contentWidth - padX * 2);
    doc.text(lines, margin + padX, cursorY + 5.5);
    cursorY += Math.max(9, 5.5 + lines.length * 3.2);
  }

  if (gridItems.length) {
    const cols = Math.min(3, gridItems.length);
    const colW = (contentWidth - padX * 2) / cols;
    let maxLines = 1;
    gridItems.forEach((item, i) => {
      const col = i % cols;
      const rowIdx = Math.floor(i / cols);
      const x = margin + padX + col * colW;
      const baseY = cursorY + rowIdx * 9;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(85, 85, 85);
      doc.text(item.label.toUpperCase(), x, baseY + 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      const lines = doc.splitTextToSize(item.value || '—', colW - 2);
      doc.text(lines, x, baseY + 5.5);
      maxLines = Math.max(maxLines, rowIdx + 1);
    });
    cursorY += maxLines * 9;
  }

  const boxH = Math.max(10, cursorY - boxTop + padY);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(margin, boxTop, contentWidth, boxH, 'S');
  return boxTop + boxH + 3;
}

function drawFooter(doc: jsPDF, generatedAt: string, margin: number) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    const { width, height } = pageSize(doc);
    const y = height - 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`Generated: ${generatedAt}`, margin, y);
    doc.text(`Page ${i} of ${pageCount}`, width - margin, y, { align: 'right' });
  }
}

function parseAmount(value: string | undefined | null): number {
  if (value == null || value === '') return 0;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function shortDate(value: string | undefined | null): string {
  if (!value || value === '-') return '—';
  return value.replace(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}):\d{2}$/, '$1');
}

type LabeledLine = { label: string; value: string };

function partiesLines(row: CompletedHandoversReportExportRow): LabeledLine[] {
  return [
    { label: 'From', value: row.fromUser || '—' },
    { label: 'To', value: row.toUser || '—' },
    { label: 'Shift', value: shortDate(row.shiftStartedAt) },
  ];
}

function statusLines(row: CompletedHandoversReportExportRow): LabeledLine[] {
  const lines: LabeledLine[] = [
    { label: 'Status', value: row.status || '—' },
    { label: 'Recon', value: row.reconciliationStatus || '—' },
    { label: 'Handed', value: shortDate(row.createdAt) },
    { label: 'Done', value: shortDate(row.completedAt) },
  ];
  const disc = (row.discrepancyReason || '').trim();
  if (disc && disc !== '-') {
    lines.push({ label: 'Disc', value: disc });
  }
  return lines;
}

function labeledHeightText(lines: LabeledLine[]): string {
  return lines.map((l) => `${l.label} ${l.value}`).join('\n');
}

/** Two-part Methods cell matching print. */
function methodsText(row: {
  cash: string;
  card: string;
  slip: string;
  cheque: string;
  credit: string;
  eWallet: string;
}): string {
  const left = [
    `Cash ${row.cash}`,
    `Card ${row.card}`,
    `Slip ${row.slip}`,
    `Cheque ${row.cheque}`,
  ];
  const right = [`Credit ${row.credit}`, `E-wallet ${row.eWallet}`];
  const pad = 20;
  const lines: string[] = [];
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i += 1) {
    const L = (left[i] ?? '').padEnd(pad, ' ');
    const R = right[i] ?? '';
    lines.push(R ? `${L}${R}` : (left[i] ?? ''));
  }
  return lines.join('\n');
}

type CellMeta = {
  chrParties?: LabeledLine[];
  chrStatus?: LabeledLine[];
};

export type DownloadCompletedHandoversPdfOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: CompletedHandoversReportExportRow[];
  fileName?: string;
};

export async function downloadCompletedHandoversReportPdf({
  reportName,
  summaryItems,
  generatedAt,
  rows,
  fileName = 'handovers-report.pdf',
}: DownloadCompletedHandoversPdfOptions): Promise<void> {
  const margin = 8;
  const doc = new jsPDF({ orientation: 'p', format: 'a4' });
  const { width: pageWidth } = pageSize(doc);
  const tableWidth = pageWidth - margin * 2;

  const startY = await drawHeader(doc, { reportName, summaryItems, margin });

  const totals = rows.reduce(
    (acc, r) => {
      acc.cash += parseAmount(r.cash);
      acc.card += parseAmount(r.card);
      acc.slip += parseAmount(r.slip);
      acc.cheque += parseAmount(r.cheque);
      acc.credit += parseAmount(r.credit);
      acc.eWallet += parseAmount(r.eWallet);
      acc.total += parseAmount(r.total);
      return acc;
    },
    { cash: 0, card: 0, slip: 0, cheque: 0, credit: 0, eWallet: 0, total: 0 }
  );

  const totalMethods = {
    cash: formatAmount(totals.cash),
    card: formatAmount(totals.card),
    slip: formatAmount(totals.slip),
    cheque: formatAmount(totals.cheque),
    credit: formatAmount(totals.credit),
    eWallet: formatAmount(totals.eWallet),
  };

  const columnStyles: Record<
    number,
    Partial<{ cellWidth: number; halign: 'left' | 'right' | 'center' }>
  > = {};
  COL_PERCENTS.forEach((pct, i) => {
    columnStyles[i] = {
      cellWidth: (tableWidth * pct) / 100,
      halign: i === 0 ? 'center' : i === 3 ? 'right' : 'left',
    };
  });

  const body: RowInput[] = [
    ...rows.map((r, i) => [
      r.no || String(i + 1),
      labeledHeightText(partiesLines(r)),
      methodsText(r),
      r.total || '0.00',
      labeledHeightText(statusLines(r)),
    ]),
    ['', 'Total', methodsText(totalMethods), formatAmount(totals.total), ''],
  ];

  autoTable(doc, {
    head: [['No.', 'Parties', 'Methods', 'Total', 'Status']],
    body,
    startY,
    margin: { left: margin, right: margin, bottom: 12 },
    tableWidth,
    showHead: 'everyPage',
    styles: {
      font: 'helvetica',
      fontSize: 6,
      cellPadding: { top: 0.8, right: 0.7, bottom: 0.8, left: 0.7 },
      overflow: 'linebreak',
      valign: 'top',
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [232, 232, 232],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 5.75,
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles,
    didParseCell: (hook) => {
      if (hook.section !== 'body') return;
      if (hook.row.index === body.length - 1) {
        hook.cell.styles.fontStyle = 'bold';
        hook.cell.styles.fillColor = [243, 243, 243];
        return;
      }
      const row = rows[hook.row.index];
      if (!row) return;
      if (hook.column.index === 1) {
        (hook.cell as typeof hook.cell & CellMeta).chrParties = partiesLines(row);
      }
      if (hook.column.index === 4) {
        (hook.cell as typeof hook.cell & CellMeta).chrStatus = statusLines(row);
      }
    },
    willDrawCell: (hook) => {
      const meta = hook.cell as typeof hook.cell & CellMeta;
      if (meta.chrParties || meta.chrStatus) {
        hook.cell.text = [];
      }
    },
    didDrawCell: (hook) => {
      const meta = hook.cell as typeof hook.cell & CellMeta;
      const lines = meta.chrParties ?? meta.chrStatus;
      if (!lines?.length) return;

      const padX = Number(hook.cell.padding('left') ?? 0.7);
      const padY = Number(hook.cell.padding('top') ?? 0.8);
      const fontSize = Number(hook.cell.styles.fontSize ?? 6);
      const lineH = fontSize * 0.4;
      const maxW = hook.cell.width - padX - Number(hook.cell.padding('right') ?? 0.7);
      let y = hook.cell.y + padY + fontSize * 0.28;

      doc.setTextColor(0, 0, 0);
      for (const { label, value } of lines) {
        const labelText = `${label} `;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fontSize);
        const labelW = doc.getTextWidth(labelText);
        doc.text(labelText, hook.cell.x + padX, y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(fontSize);
        const valueLines = doc.splitTextToSize(value || '—', Math.max(4, maxW - labelW));
        doc.text(valueLines, hook.cell.x + padX + labelW, y);
        y += lineH * Math.max(1, valueLines.length);
      }
    },
  });

  drawFooter(doc, generatedAt, margin);
  doc.save(fileName);
}
