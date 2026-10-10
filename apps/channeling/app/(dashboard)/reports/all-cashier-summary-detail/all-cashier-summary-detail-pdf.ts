'use client';

/**
 * All Cashier Summary and Detail — PDF ONLY (matches Print / screen).
 * Summary is A4 portrait; Detail stays A4 landscape.
 * Horizontal payment columns (Cash … E-wallet), not compact stacked Payments.
 */

import jsPDF from 'jspdf';
import autoTable, { type CellDef } from 'jspdf-autotable';
import {
  drawBrandedPdfHeader,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type {
  AllCashierUserDetailRow,
  AllCashierUserSummaryRow,
  CashierSummaryPaymentAmounts,
} from '@/types/report';
import {
  ACS_AMOUNT_COL_MM,
  ACS_DETAIL_META_AFTER_MM,
  ACS_DETAIL_META_BEFORE_MM,
  ACS_DETAIL_WIDE_HEADERS,
  ACS_PAYMENT_COLUMNS,
  ACS_SUMMARY_META_AFTER_MM,
  ACS_SUMMARY_META_BEFORE_MM,
  ACS_SUMMARY_WIDE_HEADERS,
  amountCells,
  buildAcsDetailUserWideRows,
  buildAcsSummaryWideRows,
  type AcsDetailWideRow,
  type AcsShiftMarkLine,
  type AcsSummaryWideRow,
} from './all-cashier-summary-detail-export-config';

function pageSize(doc: jsPDF): { width: number; height: number } {
  return {
    width: doc.internal.pageSize.getWidth(),
    height: doc.internal.pageSize.getHeight(),
  };
}

function lastTableY(doc: jsPDF, fallback: number): number {
  const prev = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable;
  return typeof prev?.finalY === 'number' ? prev.finalY : fallback;
}

type ShiftMarkRow = {
  shiftMarks?: AcsShiftMarkLine[];
  isTotal?: boolean;
  isUserTotal?: boolean;
  isGrandTotal?: boolean;
};

function isShiftMarkRow(
  row: ShiftMarkRow | undefined
): row is ShiftMarkRow & { shiftMarks: AcsShiftMarkLine[] } {
  return Boolean(row?.shiftMarks?.length) && !row?.isTotal && !row?.isUserTotal && !row?.isGrandTotal;
}

function hideShiftMarkText(
  hookData: { section: string; column: { index: number }; cell: { styles: { textColor: unknown } } },
  row: ShiftMarkRow | undefined,
  shiftsCol: number
) {
  if (hookData.section !== 'body' || hookData.column.index !== shiftsCol || !isShiftMarkRow(row)) return;
  hookData.cell.styles.textColor = [255, 255, 255];
}

/** Print Checked By column: dotted signature line, not a text value. */
function drawCheckedByLine(
  doc: jsPDF,
  hookData: {
    section: string;
    column: { index: number };
    cell: { x: number; y: number; width: number; height: number };
  },
  row: ShiftMarkRow | undefined,
  checkedByCol: number
) {
  if (hookData.section !== 'body' || hookData.column.index !== checkedByCol) return;
  if (!row || row.isTotal || row.isUserTotal || row.isGrandTotal) return;
  const y = hookData.cell.y + hookData.cell.height - 2.4;
  const x1 = hookData.cell.x + 1.6;
  const x2 = hookData.cell.x + hookData.cell.width - 1.6;
  doc.setDrawColor(70, 70, 70);
  doc.setLineWidth(0.35);
  doc.setLineDashPattern([0.5, 0.6], 0);
  doc.line(x1, y, x2, y);
  doc.setLineDashPattern([], 0);
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
  doc.setFontSize(6.5);
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

/** Summary print shares, scaled to the portrait page width. */
function buildSummaryPortraitColumnStyles(
  tableWidth: number
): Record<number, { cellWidth: number; halign: 'left' | 'right' | 'center' }> {
  const raw = [0.04, 0.14, 0.06, ...Array(ACS_PAYMENT_COLUMNS.length).fill(0.065), 0.18, 0.125];
  const sum = raw.reduce((a, b) => a + b, 0);
  const amountStart = ACS_SUMMARY_META_BEFORE_MM.length;
  const styles: Record<number, { cellWidth: number; halign: 'left' | 'right' | 'center' }> = {};
  raw.forEach((frac, i) => {
    const isAmount = i >= amountStart && i < amountStart + ACS_PAYMENT_COLUMNS.length;
    styles[i] = {
      cellWidth: (frac / sum) * tableWidth,
      halign: i === 0 ? 'center' : isAmount || i === 2 ? 'right' : 'left',
    };
  });
  return styles;
}

function buildColumnStyles(
  tableWidth: number,
  beforeMm: readonly number[],
  afterMm: readonly number[],
  amountStartIndex: number
): Record<number, { cellWidth: number; halign: 'left' | 'right' | 'center' }> {
  const amountTotal = ACS_AMOUNT_COL_MM * ACS_PAYMENT_COLUMNS.length;
  const metaSum = [...beforeMm, ...afterMm].reduce((a, b) => a + b, 0);
  const metaBudget = Math.max(metaSum, tableWidth - amountTotal);
  const scale = metaBudget / metaSum;
  const styles: Record<number, { cellWidth: number; halign: 'left' | 'right' | 'center' }> = {};
  let col = 0;
  beforeMm.forEach((mm, i) => {
    styles[col] = {
      cellWidth: mm * scale,
      halign: i === 0 ? 'center' : col === amountStartIndex - 1 ? 'right' : 'left',
    };
    col += 1;
  });
  for (let i = 0; i < ACS_PAYMENT_COLUMNS.length; i++) {
    styles[col] = { cellWidth: ACS_AMOUNT_COL_MM, halign: 'right' };
    col += 1;
  }
  afterMm.forEach((mm) => {
    styles[col] = { cellWidth: mm * scale, halign: 'left' };
    col += 1;
  });
  return styles;
}

/** Same sign-off as summary print: under the table, not on a blank page. */
function drawSummarySignOff(doc: jsPDF, afterY: number, margin: number) {
  const { width, height } = pageSize(doc);
  const gap = 18;
  let y = afterY + gap;
  if (y > height - 16) {
    if (height - 16 - afterY >= 8) {
      y = height - 16;
    } else {
      doc.addPage();
      y = margin + gap;
    }
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  const blockRight = margin + (width - margin * 2) * 0.86;
  doc.text('Approved By ...........', margin, y);
  doc.text('Authorised By ...........', blockRight, y, { align: 'right' });
}

function drawFooter(doc: jsPDF, generatedAt: string, margin: number) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    const { width, height } = pageSize(doc);
    const y = height - 8;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(margin, y - 3.5, width - margin, y - 3.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
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
  // Match print: 5mm side margins, shared branded header.
  // Summary is A4 portrait; Detail stays A4 landscape.
  const margin = 5;
  const doc = new jsPDF({
    orientation: opts.mode === 'summary' ? 'p' : 'l',
    format: 'a4',
  });
  const { width: pageWidth } = pageSize(doc);
  const tableWidth = pageWidth - margin * 2;

  const startY = await drawBrandedPdfHeader(doc, {
    reportName: opts.reportName,
    summaryItems: opts.summaryItems,
    margin,
  });

  const commonStyles = {
    font: 'helvetica' as const,
    fontSize: 6.5,
    cellPadding: { top: 0.8, right: 0.9, bottom: 0.8, left: 0.9 },
    overflow: 'linebreak' as const,
    valign: 'top' as const,
    textColor: [0, 0, 0] as [number, number, number],
    lineColor: [0, 0, 0] as [number, number, number],
    lineWidth: 0.3,
  };
  const headStyles = {
    fillColor: [232, 232, 232] as [number, number, number],
    textColor: [0, 0, 0] as [number, number, number],
    fontStyle: 'bold' as const,
    fontSize: 6,
    valign: 'middle' as const,
    lineColor: [0, 0, 0] as [number, number, number],
    lineWidth: 0.3,
  };
  const tableMargin = { left: margin, right: margin, bottom: 14 };

  if (opts.mode === 'summary') {
    const wideRows = buildAcsSummaryWideRows(
      opts.summaryRows,
      opts.grandTotals,
      opts.totalReceipts
    );
    const amountStart = ACS_SUMMARY_META_BEFORE_MM.length;
    const shiftsCol = amountStart + ACS_PAYMENT_COLUMNS.length;
    const checkedByCol = shiftsCol + 1;
    const lastCol = shiftsCol + ACS_SUMMARY_META_AFTER_MM.length - 1;
    const columnStyles = buildSummaryPortraitColumnStyles(tableWidth);
    columnStyles[checkedByCol] = { ...columnStyles[checkedByCol], halign: 'center' };

    autoTable(doc, {
      head: [Array.from(ACS_SUMMARY_WIDE_HEADERS)],
      body: wideRows.map((r) => {
        if (!r.isTotal) return r.cells;
        // Print total spans No + User + Receipts, then the seven amounts.
        return [
          {
            content: 'Total',
            colSpan: 3,
            styles: { halign: 'left' as const, fontStyle: 'bold' as const },
          },
          ...r.cells.slice(amountStart, shiftsCol),
          '',
          '',
        ];
      }),
      startY,
      margin: tableMargin,
      tableWidth,
      showHead: 'everyPage',
      styles: { ...commonStyles, fontSize: 6.5, minCellHeight: 10 },
      headStyles,
      columnStyles,
      didParseCell: (hookData) => {
        const row = wideRows[hookData.row.index] as AcsSummaryWideRow | undefined;
        const isAmount =
          hookData.column.index >= amountStart && hookData.column.index < shiftsCol;
        if (isAmount) {
          hookData.cell.styles.fontSize = 6;
          hookData.cell.styles.overflow = 'hidden';
        }
        if (hookData.section === 'body' && row?.isTotal) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [243, 243, 243];
          hookData.cell.styles.minCellHeight = 6;
        }
        if (hookData.column.index === 0 || hookData.column.index === lastCol) {
          hookData.cell.styles.lineWidth = 0.35;
        }
        hideShiftMarkText(hookData, row, shiftsCol);
      },
      didDrawCell: (hookData) => {
        const row = wideRows[hookData.row.index];
        drawShiftMarkText(doc, hookData, row, shiftsCol);
        drawCheckedByLine(doc, hookData, row, checkedByCol);
      },
    });
    drawSummarySignOff(doc, lastTableY(doc, startY), margin);
  } else {
    // Match print: separate table per user, then Grand Total table
    const amountStart = ACS_DETAIL_META_BEFORE_MM.length;
    const shiftsCol = amountStart + ACS_PAYMENT_COLUMNS.length;
    const lastCol = shiftsCol + ACS_DETAIL_META_AFTER_MM.length - 1;
    const columnStyles = buildColumnStyles(
      tableWidth,
      ACS_DETAIL_META_BEFORE_MM,
      ACS_DETAIL_META_AFTER_MM,
      amountStart
    );
    columnStyles[3] = { ...columnStyles[3], halign: 'right' };

    let y = startY;
    opts.detailRows.forEach((user, idx) => {
      const wideRows = buildAcsDetailUserWideRows(user, idx);
      autoTable(doc, {
        head: [Array.from(ACS_DETAIL_WIDE_HEADERS)],
        body: wideRows.map((r) => r.cells),
        startY: y,
        margin: tableMargin,
        tableWidth,
        showHead: 'everyPage',
        styles: commonStyles,
        headStyles,
        columnStyles,
        didParseCell: (hookData) => {
          const row = wideRows[hookData.row.index] as AcsDetailWideRow | undefined;
          if (hookData.section === 'body' && row?.isUserTotal) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fillColor = [247, 247, 247];
          }
          if (hookData.column.index === 0 || hookData.column.index === lastCol) {
            hookData.cell.styles.lineWidth = 0.35;
          }
          hideShiftMarkText(hookData, row, shiftsCol);
        },
        didDrawCell: (hookData) => {
          drawShiftMarkText(doc, hookData, wideRows[hookData.row.index], shiftsCol);
        },
      });
      y = lastTableY(doc, y) + 3.5;
    });

    if (opts.grandTotals) {
      const paymentHeads: CellDef[] = ACS_PAYMENT_COLUMNS.map((c) => ({
        content: c.label,
        styles: { halign: 'right' },
      }));
      const paymentVals: CellDef[] = amountCells(opts.grandTotals).map((v) => ({
        content: v,
        styles: { halign: 'right', fontStyle: 'bold' },
      }));
      autoTable(doc, {
        head: [[
          { content: 'Grand Total', colSpan: 4, styles: { halign: 'left', fontStyle: 'bold' } },
          ...paymentHeads,
          { content: '' },
          { content: '' },
        ]],
        body: [[
          { content: 'Total', colSpan: 4, styles: { halign: 'left', fontStyle: 'bold' } },
          ...paymentVals,
          { content: '' },
          { content: '' },
        ]],
        startY: y,
        margin: tableMargin,
        tableWidth,
        styles: { ...commonStyles, fontStyle: 'bold', valign: 'middle' },
        headStyles,
        columnStyles,
        didParseCell: (hookData) => {
          if (hookData.section === 'body') {
            hookData.cell.styles.fillColor = [243, 243, 243];
          }
          if (hookData.column.index === 0 || hookData.column.index === lastCol) {
            hookData.cell.styles.lineWidth = 0.35;
          }
        },
      });
    }

    // Match screen/print: Total receipts in report
    y = lastTableY(doc, y) + 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    const bannerH = 7;
    doc.setFillColor(247, 247, 247);
    doc.rect(margin, y, tableWidth, bannerH, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.text('Total receipts in report: ', margin + 2, y + 4.6);
    const labelW = doc.getTextWidth('Total receipts in report: ');
    doc.setFont('helvetica', 'bold');
    doc.text(String(opts.totalReceipts), margin + 2 + labelW, y + 4.6);
  }

  drawFooter(doc, opts.generatedAt, margin);
  doc.save(opts.fileName ?? 'all-cashier-summary-detail.pdf');
}
