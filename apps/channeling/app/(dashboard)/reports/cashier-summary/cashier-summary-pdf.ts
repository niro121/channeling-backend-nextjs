'use client';

/**
 * Userwise Cashier — PDF ONLY (matches Print).
 * Summary is A4 portrait; Detail stays A4 landscape.
 * Same payment-column tables. Detail amount columns stay ≥18mm.
 */

import jsPDF from 'jspdf';
import autoTable, { type CellDef, type RowInput } from 'jspdf-autotable';
import {
  drawBrandedPdfHeader,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import { cashierSummarySectionShowsDetailRows } from '@/lib/cashier-summary-amounts';
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

/** Same min width as print `.ucs-amt` — fits ≥6 digits (e.g. 999,999.00). */
const AMOUNT_COL_MM = 18;

/**
 * Meta column widths matching print (mm):
 * No | Tx | Session | Receipt | Patient | Consultant
 * Print: Tx compact (date/time + user/code); Patient = Consultant.
 */
const META_WIDTHS_MM = [7, 40, 28, 28, 24, 24] as const;

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
  return cashierSummarySectionShowsDetailRows(mode, sectionKey);
}

function amountCells(amounts: CashierSummaryPaymentAmounts): string[] {
  return PAYMENT_COLUMNS.map((c) => formatAmount(amounts[c.key]));
}

function txLabel(row: CashierSummaryReportLineItem): string {
  const tx =
    row.txCreated instanceof Date
      ? row.txCreated.toLocaleString()
      : String(row.txCreated ?? '—');
  // Match print: date/time + user name/code only (no shift start–end range)
  return `${tx}\n${row.shiftUserLabel ?? '—'}`;
}

function pageSize(doc: jsPDF): { width: number; height: number } {
  return {
    width: doc.internal.pageSize.getWidth(),
    height: doc.internal.pageSize.getHeight(),
  };
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
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(title, margin, next + 3);
  return next + 5;
}

function rowTableColumnStyles(
  tableWidth: number,
  portrait = false
): Record<number, { cellWidth: number; halign: 'left' | 'right' | 'center' }> {
  const styles: Record<number, { cellWidth: number; halign: 'left' | 'right' | 'center' }> = {};
  if (portrait) {
    // Same shares as summary print so the 13-column refund table fits A4 portrait.
    const raw = [0.04, 0.13, 0.09, 0.1, 0.08, 0.08, ...Array(PAYMENT_COLUMNS.length).fill(0.0685)];
    const sum = raw.reduce((a, b) => a + b, 0);
    raw.forEach((frac, i) => {
      styles[i] = {
        cellWidth: (frac / sum) * tableWidth,
        halign: i === 0 ? 'center' : i >= META_WIDTHS_MM.length ? 'right' : 'left',
      };
    });
    return styles;
  }
  const amountTotal = AMOUNT_COL_MM * PAYMENT_COLUMNS.length;
  const metaSum = META_WIDTHS_MM.reduce((a, b) => a + b, 0);
  const metaBudget = Math.max(metaSum, tableWidth - amountTotal);
  const scale = metaBudget / metaSum;
  META_WIDTHS_MM.forEach((mm, i) => {
    styles[i] = {
      cellWidth: mm * scale,
      halign: i === 0 ? 'center' : 'left',
    };
  });
  for (let i = 0; i < PAYMENT_COLUMNS.length; i++) {
    styles[META_WIDTHS_MM.length + i] = {
      cellWidth: AMOUNT_COL_MM,
      halign: 'right',
    };
  }
  return styles;
}

/** Totals-only: Total label + 7 amount cols. Portrait shares match summary print (16% / 12%). */
function totalsOnlyColumnStyles(
  tableWidth: number,
  portrait = false
): Record<number, { cellWidth: number; halign: 'left' | 'right' | 'center' }> {
  if (portrait) {
    const raw = [0.16, ...Array(PAYMENT_COLUMNS.length).fill(0.12)];
    const sum = raw.reduce((a, b) => a + b, 0);
    const styles: Record<number, { cellWidth: number; halign: 'left' | 'right' | 'center' }> = {};
    raw.forEach((frac, i) => {
      styles[i] = {
        cellWidth: (frac / sum) * tableWidth,
        halign: i === 0 ? 'left' : 'right',
      };
    });
    return styles;
  }
  const amountTotal = AMOUNT_COL_MM * PAYMENT_COLUMNS.length;
  const labelWidth = Math.max(24, tableWidth - amountTotal);
  const styles: Record<number, { cellWidth: number; halign: 'left' | 'right' | 'center' }> = {
    0: { cellWidth: labelWidth, halign: 'left' },
  };
  for (let i = 0; i < PAYMENT_COLUMNS.length; i++) {
    styles[i + 1] = { cellWidth: AMOUNT_COL_MM, halign: 'right' };
  }
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
    margin: { left: margin, right: margin, bottom: 14 },
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

/** Wide tables matching print. Summary portrait; Detail landscape. */
function drawBodyTables(
  doc: jsPDF,
  mode: 'summary' | 'detail',
  sections: CashierSummaryReportSection[],
  startY: number,
  margin: number,
  tableWidth: number
): number {
  let y = startY;
  const portrait = mode === 'summary';
  const rowStyles = rowTableColumnStyles(tableWidth, portrait);
  const totalStyles = totalsOnlyColumnStyles(tableWidth, portrait);
  const lastAmountCol = META_WIDTHS_MM.length + PAYMENT_COLUMNS.length - 1;
  const lastTotalsCol = PAYMENT_COLUMNS.length;

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
        margin: { left: margin, right: margin, bottom: 14 },
        tableWidth,
        showHead: 'everyPage',
        styles: {
          font: 'helvetica',
          fontSize: portrait ? 6 : 6.5,
          cellPadding: { top: 0.8, right: 0.9, bottom: 0.8, left: 0.9 },
          overflow: 'linebreak',
          valign: 'top',
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [232, 232, 232],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 6,
          valign: 'middle',
          halign: 'left',
          lineColor: [0, 0, 0],
          lineWidth: 0.3,
        },
        columnStyles: rowStyles,
        didParseCell: (hook) => {
          if (hook.section === 'body' && hook.row.index === body.length - 1) {
            hook.cell.styles.fontStyle = 'bold';
            hook.cell.styles.fillColor = [243, 243, 243];
          }
          // Keep outer column borders visible
          if (hook.column.index === 0 || hook.column.index === lastAmountCol) {
            hook.cell.styles.lineWidth = 0.35;
          }
        },
      });
    } else {
      autoTable(doc, {
        head: [['Total', ...PAYMENT_COLUMNS.map((c) => c.label)]],
        body: [['Total', ...amountCells(section.totals)]],
        startY: y,
        margin: { left: margin, right: margin, bottom: 14 },
        tableWidth,
        styles: {
          font: 'helvetica',
          fontSize: 6.5,
          cellPadding: { top: 0.8, right: 0.9, bottom: 0.8, left: 0.9 },
          overflow: 'linebreak',
          valign: 'middle',
          textColor: [0, 0, 0],
          lineColor: [0, 0, 0],
          lineWidth: 0.3,
          fontStyle: 'bold',
        },
        headStyles: {
          fillColor: [232, 232, 232],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 6,
          valign: 'middle',
          lineColor: [0, 0, 0],
          lineWidth: 0.3,
        },
        columnStyles: totalStyles,
        didParseCell: (hook) => {
          if (hook.column.index === lastTotalsCol) {
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
  // Match print: 5mm side margins, shared branded header.
  // Summary is A4 portrait; Detail stays A4 landscape.
  const margin = 5;
  const doc = new jsPDF({
    orientation: opts.mode === 'summary' ? 'p' : 'l',
    format: 'a4',
  });
  const { width: pageWidth } = pageSize(doc);
  const tableWidth = pageWidth - margin * 2;

  let y = await drawBrandedPdfHeader(doc, {
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
