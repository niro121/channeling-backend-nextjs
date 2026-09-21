'use client';

/**
 * Cash Book — PDF ONLY (A4 portrait).
 * Matches on-screen report columns (no No. column):
 * Date | Journal # | Account | Description | Type | Debit | Credit | Balance
 */

import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { CashBookReportExportRow } from '@/types/reports/cash-book';

const COL_PERCENTS = [14, 9, 16, 19, 10, 10, 10, 12] as const;

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

function isOpeningRow(row: CashBookReportExportRow): boolean {
  return /^opening\s*balance$/i.test((row.description || '').trim());
}

function isClosingRow(row: CashBookReportExportRow): boolean {
  return /^closing\s*balance$/i.test((row.description || '').trim());
}

function cellOrDash(value: string | undefined | null): string {
  if (value == null || value === '') return '-';
  return value;
}

function moneyOrDash(value: string | undefined | null): string {
  if (value == null || value === '' || value === '-') return '-';
  return value;
}

export type DownloadCashBookPdfOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: CashBookReportExportRow[];
  /** Period start used for Opening Balance date (matches on-screen row). */
  openingDateLabel?: string;
  fileName?: string;
};

export async function downloadCashBookReportPdf({
  reportName,
  summaryItems,
  generatedAt,
  rows,
  openingDateLabel,
  fileName = 'cash-book.pdf',
}: DownloadCashBookPdfOptions): Promise<void> {
  const margin = 8;
  const doc = new jsPDF({ orientation: 'p', format: 'a4' });
  const { width: pageWidth } = pageSize(doc);
  const tableWidth = pageWidth - margin * 2;

  const startY = await drawHeader(doc, { reportName, summaryItems, margin });

  const columnStyles: Record<
    number,
    Partial<{ cellWidth: number; halign: 'left' | 'right' | 'center' }>
  > = {};
  COL_PERCENTS.forEach((pct, i) => {
    columnStyles[i] = {
      cellWidth: (tableWidth * pct) / 100,
      halign: i >= 5 ? 'right' : 'left',
    };
  });

  const body: RowInput[] = rows.map((r) => {
    if (isClosingRow(r)) {
      return [
        {
          content: 'Closing Balance',
          colSpan: 7,
          styles: { halign: 'left', fontStyle: 'bold' },
        },
        moneyOrDash(r.balance),
      ];
    }
    if (isOpeningRow(r)) {
      return [
        cellOrDash(r.date || openingDateLabel),
        '-',
        '-',
        'Opening Balance',
        '-',
        '-',
        '-',
        moneyOrDash(r.balance),
      ];
    }
    return [
      cellOrDash(r.date),
      cellOrDash(r.journalNo),
      cellOrDash(r.account),
      cellOrDash(r.description),
      cellOrDash(r.paymentType),
      moneyOrDash(r.debit),
      moneyOrDash(r.credit),
      moneyOrDash(r.balance),
    ];
  });

  autoTable(doc, {
    head: [['Date', 'Journal #', 'Account', 'Description', 'Type', 'Debit', 'Credit', 'Balance']],
    body,
    startY,
    margin: { left: margin, right: margin, bottom: 12 },
    tableWidth,
    showHead: 'everyPage',
    styles: {
      font: 'helvetica',
      fontSize: 5.5,
      cellPadding: { top: 0.7, right: 0.55, bottom: 0.7, left: 0.55 },
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
      fontSize: 5.25,
      valign: 'middle',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles,
    didParseCell: (hook) => {
      if (hook.section !== 'body') return;
      const row = rows[hook.row.index];
      if (!row) return;
      if (isOpeningRow(row) || isClosingRow(row)) {
        hook.cell.styles.fontStyle = 'bold';
        hook.cell.styles.fillColor = [243, 243, 243];
      }
    },
  });

  drawFooter(doc, generatedAt, margin);
  doc.save(fileName);
}
