'use client';

/**
 * All Cashier Summary and Detail — PDF ONLY (A4 portrait, matches Print).
 * Summary & Detail: compact categorized columns (payments stacked).
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type {
  AllCashierUserDetailRow,
  AllCashierUserSummaryRow,
  CashierSummaryPaymentAmounts,
} from '@/types/report';
import {
  ACS_DETAIL_PDF_COL_PERCENTS,
  ACS_DETAIL_PDF_HEADERS,
  ACS_SUMMARY_PDF_COL_PERCENTS,
  ACS_SUMMARY_PDF_HEADERS,
  acsDetailPdfCompactRow,
  acsSummaryPdfCompactRow,
  buildAcsDetailCompactRows,
  buildAcsSummaryCompactRows,
  type AcsShiftMarkLine,
} from './all-cashier-summary-detail-export-config';

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
  const cols = Math.min(3, items.length);
  const colW = (contentWidth - padX * 2) / cols;
  let maxLines = 1;
  items.forEach((item, i) => {
    const col = i % cols;
    const rowIdx = Math.floor(i / cols);
    const x = margin + padX + col * colW;
    const baseY = boxTop + padY + rowIdx * 9;
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
  const boxH = Math.max(10, padY * 2 + maxLines * 9);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(margin, boxTop, contentWidth, boxH, 'S');
  return boxTop + boxH + 3;
}

type ShiftMarkRow = {
  shiftMarks?: AcsShiftMarkLine[];
  isTotal?: boolean;
  isUserTotal?: boolean;
  isGrandTotal?: boolean;
};

function isShiftMarkRow(row: ShiftMarkRow | undefined): row is ShiftMarkRow & { shiftMarks: AcsShiftMarkLine[] } {
  return Boolean(row?.shiftMarks?.length) && !row?.isTotal && !row?.isUserTotal && !row?.isGrandTotal;
}

/** Keep the plain text so the row is tall enough, then paint status lines in color. */
function hideShiftMarkText(
  hookData: { section: string; column: { index: number }; cell: { styles: { textColor: unknown } } },
  row: ShiftMarkRow | undefined,
  shiftsCol: number
) {
  if (hookData.section !== 'body' || hookData.column.index !== shiftsCol || !isShiftMarkRow(row)) return;
  hookData.cell.styles.textColor = [255, 255, 255];
}

function drawShiftMarkText(
  doc: jsPDF,
  hookData: {
    section: string;
    column: { index: number };
    cell: { x: number; y: number; width: number };
  },
  row: ShiftMarkRow | undefined,
  shiftsCol: number
) {
  if (hookData.section !== 'body' || hookData.column.index !== shiftsCol || !isShiftMarkRow(row)) return;
  let y = hookData.cell.y + 3.1;
  const x = hookData.cell.x + 0.9;
  const maxW = Math.max(8, hookData.cell.width - 1.8);
  doc.setFontSize(6);
  for (const line of row.shiftMarks) {
    if (line.tone === 'handed') doc.setTextColor(21, 128, 61);
    else if (line.tone === 'open') doc.setTextColor(220, 38, 38);
    else doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    const wrapped = doc.splitTextToSize(line.text, maxW) as string[];
    doc.text(wrapped, x, y);
    y += wrapped.length * 2.55;
  }
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

type CommonOpts = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  fileName?: string;
  grandTotals: CashierSummaryPaymentAmounts | null;
  totalReceipts: number;
};

export type DownloadAcsSummaryPdfOptions = CommonOpts & {
  mode: 'summary';
  summaryRows: AllCashierUserSummaryRow[];
};

export type DownloadAcsDetailPdfOptions = CommonOpts & {
  mode: 'detail';
  detailRows: AllCashierUserDetailRow[];
};

export type DownloadAllCashierSummaryDetailPdfOptions =
  | DownloadAcsSummaryPdfOptions
  | DownloadAcsDetailPdfOptions;

export async function downloadAllCashierSummaryDetailReportPdf(
  opts: DownloadAllCashierSummaryDetailPdfOptions
): Promise<void> {
  const margin = 8;
  const doc = new jsPDF({ orientation: 'p', format: 'a4' });
  const { width: pageWidth } = pageSize(doc);
  const tableWidth = pageWidth - margin * 2;

  const startY = await drawHeader(doc, {
    reportName: opts.reportName,
    summaryItems: opts.summaryItems,
    margin,
  });

  if (opts.mode === 'summary') {
    const compactRows = buildAcsSummaryCompactRows(
      opts.summaryRows,
      opts.grandTotals,
      opts.totalReceipts
    );
    const columnStyles: Record<
      number,
      Partial<{ cellWidth: number; halign: 'left' | 'right' | 'center' }>
    > = {};
    ACS_SUMMARY_PDF_COL_PERCENTS.forEach((pct, i) => {
      columnStyles[i] = {
        cellWidth: (tableWidth * pct) / 100,
        halign: i === 0 ? 'center' : i === 2 ? 'right' : 'left',
      };
    });

    autoTable(doc, {
      head: [Array.from(ACS_SUMMARY_PDF_HEADERS)],
      body: compactRows.map(acsSummaryPdfCompactRow),
      startY,
      margin: { left: margin, right: margin, bottom: 12 },
      tableWidth,
      showHead: 'everyPage',
      styles: {
        font: 'helvetica',
        fontSize: 6.25,
        cellPadding: { top: 1, right: 0.9, bottom: 1, left: 0.9 },
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
        fontSize: 6,
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      columnStyles,
      didParseCell: (hookData) => {
        const row = compactRows[hookData.row.index];
        if (hookData.section !== 'body' || !row) return;
        if (row.isTotal) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [243, 243, 243];
        }
        hideShiftMarkText(hookData, row, 4);
      },
      didDrawCell: (hookData) => {
        drawShiftMarkText(doc, hookData, compactRows[hookData.row.index], 4);
      },
    });
  } else {
    const compactRows = buildAcsDetailCompactRows(
      opts.detailRows,
      opts.grandTotals,
      opts.totalReceipts
    );
    const columnStyles: Record<
      number,
      Partial<{ cellWidth: number; halign: 'left' | 'right' | 'center' }>
    > = {};
    ACS_DETAIL_PDF_COL_PERCENTS.forEach((pct, i) => {
      columnStyles[i] = {
        cellWidth: (tableWidth * pct) / 100,
        halign: i === 0 ? 'center' : i === 3 ? 'right' : 'left',
      };
    });

    autoTable(doc, {
      head: [Array.from(ACS_DETAIL_PDF_HEADERS)],
      body: compactRows.map(acsDetailPdfCompactRow),
      startY,
      margin: { left: margin, right: margin, bottom: 12 },
      tableWidth,
      showHead: 'everyPage',
      styles: {
        font: 'helvetica',
        fontSize: 6.25,
        cellPadding: { top: 1, right: 0.9, bottom: 1, left: 0.9 },
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
        fontSize: 6,
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
      },
      columnStyles,
      didParseCell: (hookData) => {
        const row = compactRows[hookData.row.index];
        if (hookData.section !== 'body' || !row) return;
        if (row.isGrandTotal) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [243, 243, 243];
        } else if (row.isUserTotal) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [247, 247, 247];
        }
        hideShiftMarkText(hookData, row, 5);
      },
      didDrawCell: (hookData) => {
        drawShiftMarkText(doc, hookData, compactRows[hookData.row.index], 5);
      },
    });
  }

  drawFooter(doc, opts.generatedAt, margin);
  doc.save(opts.fileName ?? 'all-cashier-summary-detail.pdf');
}
