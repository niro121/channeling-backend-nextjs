'use client';

/**
 * Userwise Cashier — PDF ONLY (A4 portrait).
 * Summary and Detail both match the print / on-screen horizontal payment-column tables.
 */

import jsPDF from 'jspdf';
import autoTable, { type CellDef, type RowInput } from 'jspdf-autotable';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import { formatReceiptAmount } from '@/lib/format-money';
import type {
  CashierSummaryPaymentAmounts,
  CashierSummaryReportLineItem,
  CashierSummaryReportSection,
} from '@/types/report';

const PAYMENT_COLUMNS: { key: keyof CashierSummaryPaymentAmounts; label: string }[] = [
  { key: 'cash', label: 'Cash' },
  { key: 'creditCard', label: 'Credit Card' },
  { key: 'slip', label: 'Slip' },
  { key: 'cheque', label: 'Cheque' },
  { key: 'agent', label: 'Agent' },
  { key: 'agentCredit', label: 'Credit' },
  { key: 'eWallet', label: 'E-wallet' },
];

const AGENCY_BILL_SECTION_KEYS = new Set([
  'agentBilled',
  'agentRefunded',
  'agentCanceled',
  'agentDeposit',
  'agentDepositCanceled',
]);

const CASH_SUMMARY_KEYS: (keyof CashierSummaryPaymentAmounts)[] = [
  'cash',
  'creditCard',
  'cheque',
  'eWallet',
];

/** Same as print/view full-page fixed layout (A4 portrait, tight margins). */
const ROW_PERCENTS = [3.5, 14, 10, 10, 12, 11, 5.64, 5.64, 5.64, 5.64, 5.64, 5.64, 5.66] as const;

/** Totals-only: Total + 7 amounts — stretches across full printable width */
const TOTAL_PERCENTS = [18, 11.7, 11.7, 11.7, 11.7, 11.7, 11.7, 11.8] as const;

function formatAmount(n: number | undefined | null): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0.00';
  return formatReceiptAmount(num);
}

function sumAmounts(
  t: CashierSummaryPaymentAmounts,
  keys: (keyof CashierSummaryPaymentAmounts)[]
): number {
  return keys.reduce((acc, k) => acc + Number(t[k] ?? 0), 0);
}

function sectionHasAnyTotal(section: CashierSummaryReportSection): boolean {
  return PAYMENT_COLUMNS.some((col) => section.totals[col.key] !== 0);
}

/** Matches on-screen `cashierSectionShowDetailRows`. */
function sectionShowRows(mode: 'summary' | 'detail', sectionKey: string): boolean {
  return mode === 'detail' || sectionKey === 'channelRefund';
}

function amountCells(amounts: CashierSummaryPaymentAmounts): string[] {
  return PAYMENT_COLUMNS.map((c) => formatAmount(amounts[c.key]));
}

function txLabel(row: CashierSummaryReportLineItem): string {
  const tx =
    row.txCreated instanceof Date
      ? row.txCreated.toLocaleString()
      : String(row.txCreated ?? '—');
  return `${tx}\n${row.shiftLabel ?? '—'}`;
}

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
  const padY = 1.6;
  const boxTop = y;
  const items = summaryItems.length ? summaryItems : [{ label: '—', value: '—' }];
  const cols = 3;
  const colGap = 3;
  const colW = (contentWidth - padX * 2 - colGap * (cols - 1)) / cols;

  type Cell = {
    label: string;
    value: string;
    col: number;
    row: number;
    span: number;
  };
  const cells: Cell[] = [];
  let col = 0;
  let row = 0;
  for (const item of items) {
    const span = item.fullWidth ? cols : 1;
    if (col + span > cols) {
      col = 0;
      row += 1;
    }
    cells.push({
      label: item.label,
      value: item.value || '—',
      col,
      row,
      span,
    });
    col += span;
    if (col >= cols) {
      col = 0;
      row += 1;
    }
  }
  const rowCount = Math.max(...cells.map((c) => c.row)) + 1;
  const labelH = 3.2;
  const valueLineH = 3.4;
  const rowGap = 1.6;
  const rowHeights = Array.from({ length: rowCount }, () => 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  for (const cell of cells) {
    const w = colW * cell.span + colGap * (cell.span - 1);
    const valueLines = doc.splitTextToSize(cell.value, Math.max(8, w));
    rowHeights[cell.row] = Math.max(
      rowHeights[cell.row],
      labelH + valueLines.length * valueLineH
    );
  }

  let bodyH = padY;
  for (let r = 0; r < rowCount; r += 1) {
    bodyH += rowHeights[r] ?? 0;
    if (r < rowCount - 1) bodyH += rowGap;
  }
  bodyH += padY;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(margin, boxTop, contentWidth, bodyH, 'S');

  const rowStarts: number[] = [];
  let rowY = boxTop + padY;
  for (let r = 0; r < rowCount; r += 1) {
    rowStarts[r] = rowY;
    rowY += (rowHeights[r] ?? 0) + (r < rowCount - 1 ? rowGap : 0);
  }

  for (const cell of cells) {
    const x = margin + padX + cell.col * (colW + colGap);
    const w = colW * cell.span + colGap * (cell.span - 1);
    const cy = rowStarts[cell.row] ?? boxTop + padY;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(85, 85, 85);
    doc.text(cell.label.toUpperCase(), x, cy + 2.2);
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const valueLines = doc.splitTextToSize(cell.value, Math.max(8, w));
    doc.text(valueLines, x, cy + 2.2 + labelH);
  }

  return boxTop + bodyH + 3;
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

function lastTableY(doc: jsPDF, fallback: number): number {
  const withTable = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  return withTable.lastAutoTable?.finalY ?? fallback;
}

function ensureRoom(doc: jsPDF, y: number, margin: number, needed: number): number {
  const { height } = pageSize(doc);
  if (y + needed > height - 14) {
    doc.addPage();
    return margin;
  }
  return y;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number, margin: number): number {
  const next = ensureRoom(doc, y, margin, 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(title, margin, next + 3);
  return next + 5;
}

function columnStyles(
  tableWidth: number,
  percents: readonly number[],
  rightFrom: number
): Record<number, { cellWidth: number; halign: 'left' | 'right' | 'center' }> {
  const styles: Record<number, { cellWidth: number; halign: 'left' | 'right' | 'center' }> = {};
  percents.forEach((pct, i) => {
    styles[i] = {
      cellWidth: (tableWidth * pct) / 100,
      halign: i === 0 ? 'center' : i >= rightFrom ? 'right' : 'left',
    };
  });
  return styles;
}

function drawCreditCashFooter(
  doc: jsPDF,
  totals: CashierSummaryPaymentAmounts,
  startY: number,
  margin: number
) {
  const slip = Number(totals.slip);
  const creditCustomer = Number(totals.agentCredit);
  const creditSectionTotal = slip + creditCustomer;
  const cashSectionTotal = sumAmounts(totals, CASH_SUMMARY_KEYS);
  const agentTotal = Number(totals.agent);
  const grandCombined = creditSectionTotal + cashSectionTotal;

  // Keep whole footer together (same intent as print break-inside: avoid)
  let y = ensureRoom(doc, startY, margin, 62);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('CASHIER SUMMARY (CREDIT VS CASH)', margin, y + 3);
  y += 5;

  const headCell = (label: string): CellDef => ({
    content: label,
    colSpan: 2,
    styles: { fontStyle: 'bold', fillColor: [232, 232, 232], halign: 'left' },
  });
  const totalCell = (label: string, value: string): RowInput => [
    { content: label, styles: { fontStyle: 'bold', fillColor: [243, 243, 243] } },
    {
      content: value,
      styles: { fontStyle: 'bold', fillColor: [243, 243, 243], halign: 'right' },
    },
  ];

  const body: RowInput[] = [
    [headCell('Credit Summary')],
    ['Slip Total', formatAmount(slip)],
    ['Credit Total', formatAmount(creditCustomer)],
    totalCell('Total', formatAmount(creditSectionTotal)),
    [headCell('Cash Summary')],
    ['Cash Total', formatAmount(totals.cash)],
    ['Credit Card Total', formatAmount(totals.creditCard)],
    ['Cheque Total', formatAmount(totals.cheque)],
    ['E-wallet Total', formatAmount(totals.eWallet)],
    totalCell('Total', formatAmount(cashSectionTotal)),
    totalCell('Grand Total', formatAmount(grandCombined)),
    ['Agent Total', formatAmount(agentTotal)],
  ];

  const footerWidth = 78;
  autoTable(doc, {
    body,
    startY: y,
    margin: { left: margin, right: margin, bottom: 12 },
    tableWidth: footerWidth,
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: { top: 0.8, right: 1.2, bottom: 0.8, left: 1.2 },
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: footerWidth * 0.62 },
      1: { cellWidth: footerWidth * 0.38, halign: 'right' },
    },
  });
}

type CommonOpts = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  sections: CashierSummaryReportSection[];
  grandTotals: CashierSummaryPaymentAmounts | null;
  fileName?: string;
};

export type DownloadCashierSummaryPdfOptions = CommonOpts & {
  mode: 'summary' | 'detail';
};

/** Portrait wide tables matching print / screen view (Summary + Detail). */
function drawBodyTables(
  doc: jsPDF,
  mode: 'summary' | 'detail',
  sections: CashierSummaryReportSection[],
  startY: number,
  margin: number,
  tableWidth: number
): number {
  let y = startY;
  const rowStyles = columnStyles(tableWidth, ROW_PERCENTS, 6);
  const totalStyles = columnStyles(tableWidth, TOTAL_PERCENTS, 1);

  for (const section of sections) {
    const withRows = sectionShowRows(mode, section.key) && section.rows.length > 0;
    const hasTotals = sectionHasAnyTotal(section);
    if (!withRows && !hasTotals) continue;

    y = drawSectionTitle(doc, section.title, y, margin);
    const isIncomeExpense = section.key === 'incomeExpense';
    const isAgency = AGENCY_BILL_SECTION_KEYS.has(section.key);

    if (withRows) {
      const partyHead = isIncomeExpense ? 'Name' : isAgency ? 'Agency' : 'Patient';
      const secondHead = isIncomeExpense ? 'Type' : 'Consultant';
      const body: string[][] = section.rows.map((row, idx) => [
        String(idx + 1),
        txLabel(row),
        row.sessionDateTime ?? '—',
        `${row.receiptId || '—'}\n${row.billId ?? '—'}`,
        isIncomeExpense ? (row.name ?? '—') : (row.patient ?? '—'),
        isIncomeExpense ? (row.type ?? '—') : (row.consultant ?? '—'),
        ...amountCells(row),
      ]);
      body.push([
        '',
        'Total',
        '',
        '',
        '',
        '',
        ...amountCells(section.totals),
      ]);

      autoTable(doc, {
        head: [[
          'No.',
          'Tx Created / Shift',
          'Session Date/Time',
          'Receipt ID / Bill ID',
          partyHead,
          secondHead,
          ...PAYMENT_COLUMNS.map((c) => c.label),
        ]],
        body,
        startY: y,
        margin: { left: margin, right: margin, bottom: 11 },
        tableWidth,
        showHead: 'everyPage',
        styles: {
          font: 'helvetica',
          fontSize: 7,
          cellPadding: { top: 0.9, right: 0.9, bottom: 0.9, left: 0.9 },
          overflow: 'linebreak',
          valign: 'top',
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.25,
        },
        headStyles: {
          fillColor: [232, 232, 232],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 6.5,
          valign: 'middle',
          halign: 'left',
          lineColor: [0, 0, 0],
          lineWidth: 0.25,
        },
        columnStyles: rowStyles,
        didParseCell: (hook) => {
          if (hook.section === 'body' && hook.row.index === body.length - 1) {
            hook.cell.styles.fontStyle = 'bold';
            hook.cell.styles.fillColor = [243, 243, 243];
          }
          // Keep last-column border visible (Windows print/PDF engines)
          if (hook.column.index === ROW_PERCENTS.length - 1) {
            hook.cell.styles.lineWidth = 0.35;
          }
        },
      });
    } else {
      autoTable(doc, {
        head: [['Total', ...PAYMENT_COLUMNS.map((c) => c.label)]],
        body: [['Total', ...amountCells(section.totals)]],
        startY: y,
        margin: { left: margin, right: margin, bottom: 11 },
        tableWidth,
        styles: {
          font: 'helvetica',
          fontSize: 7,
          cellPadding: { top: 0.9, right: 0.9, bottom: 0.9, left: 0.9 },
          overflow: 'linebreak',
          valign: 'middle',
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.25,
          fontStyle: 'bold',
        },
        headStyles: {
          fillColor: [232, 232, 232],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 6.5,
          valign: 'middle',
          lineColor: [0, 0, 0],
          lineWidth: 0.25,
        },
        columnStyles: totalStyles,
        didParseCell: (hook) => {
          if (hook.column.index === TOTAL_PERCENTS.length - 1) {
            hook.cell.styles.lineWidth = 0.35;
          }
        },
      });
    }

    y = lastTableY(doc, y) + 4;
  }

  return y;
}

export async function downloadCashierSummaryReportPdf(
  opts: DownloadCashierSummaryPdfOptions
): Promise<void> {
  // Match print: tight side margins so tables use full page width
  const margin = 5;
  const doc = new jsPDF({ orientation: 'p', format: 'a4' });
  const { width: pageWidth } = pageSize(doc);
  const tableWidth = pageWidth - margin * 2;

  let y = await drawHeader(doc, {
    reportName: opts.reportName,
    summaryItems: opts.summaryItems,
    margin,
  });

  y = drawBodyTables(doc, opts.mode, opts.sections, y, margin, tableWidth);

  if (opts.grandTotals) {
    drawCreditCashFooter(doc, opts.grandTotals, y, margin);
  }

  drawFooter(doc, opts.generatedAt, margin);
  doc.save(opts.fileName ?? 'cashier-summary.pdf');
}
