'use client';

/**
 * Userwise Cashier — Excel ONLY (matches Print / PDF).
 * Summary page setup is A4 portrait; Detail stays A4 landscape.
 * Same horizontal payment-column tables.
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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

/** Detail landscape widths: Tx wide, Receipt narrower, Consultant wider; amounts ≥12. */
const ROW_WIDTHS = [5, 36, 19, 19, 11, 12, 12, 12, 12, 12, 12, 12, 12];

/**
 * Equal columns that sum to an A4 portrait page. Logical columns are merges
 * of these, using the same shares as summary print.
 */
const SUMMARY_GRID = 20;
const SUMMARY_GRID_WIDTH = 4;
const SUMMARY_TOTALS_SHARES = [16, 12, 12, 12, 12, 12, 12, 12];
const SUMMARY_LINE_SHARES = [4, 13, 9, 10, 8, 8, 6.85, 6.85, 6.85, 6.85, 6.85, 6.85, 6.85];

function columnSpans(shares: number[], columns: number): number[] {
  const sum = shares.reduce((total, share) => total + share, 0);
  const exact = shares.map((share) => (share / sum) * columns);
  const spans = exact.map((value) => Math.max(0, Math.floor(value)));
  let remaining = columns - spans.reduce((total, span) => total + span, 0);
  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index);
  for (const item of order) {
    if (remaining <= 0) break;
    spans[item.index] += 1;
    remaining -= 1;
  }
  for (let i = 0; i < spans.length; i += 1) {
    if (spans[i]! >= 1) continue;
    const donor = spans.findIndex((span, index) => index !== i && span > 1);
    if (donor >= 0) {
      spans[donor] -= 1;
      spans[i] = 1;
    }
  }
  return spans;
}

const SUMMARY_TOTALS_SPANS = columnSpans(SUMMARY_TOTALS_SHARES, SUMMARY_GRID);
const SUMMARY_LINE_SPANS = columnSpans(SUMMARY_LINE_SHARES, SUMMARY_GRID);

let cachedLogoBase64: string | null | undefined;

async function loadLogoBase64(src: string): Promise<string | null> {
  if (cachedLogoBase64 !== undefined && src === RUHUNU_HOSPITAL_LOGO_SRC) {
    return cachedLogoBase64;
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
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1]! : dataUrl;
    if (src === RUHUNU_HOSPITAL_LOGO_SRC) cachedLogoBase64 = base64;
    return base64;
  } catch {
    if (src === RUHUNU_HOSPITAL_LOGO_SRC) cachedLogoBase64 = null;
    return null;
  }
}

function colLetter(index1Based: number): string {
  let n = index1Based;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
};

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

function cellValue(raw: string | undefined | null): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  return raw;
}

async function drawBrandedHeader(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  opts: {
    reportName: string;
    summaryItems: BrandedPdfSummaryItem[];
    colCount: number;
    /** First column of the report title, past the logo on a narrow portrait grid. */
    titleStartCol?: number;
  }
): Promise<number> {
  const { reportName, summaryItems, colCount } = opts;
  const lastCol = colLetter(colCount);
  let row = 1;
  let titleStartCol = 1;
  let hasLogo = false;

  const logoBase64 = await loadLogoBase64(RUHUNU_HOSPITAL_LOGO_SRC);
  if (logoBase64) {
    const imageId = workbook.addImage({ base64: logoBase64, extension: 'png' });
    sheet.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 140, height: 42 } });
    sheet.getRow(1).height = 18;
    sheet.getRow(2).height = 18;
    hasLogo = true;
    titleStartCol = opts.titleStartCol ?? Math.min(3, colCount);
  }

  sheet.mergeCells(row, titleStartCol, row, colCount);
  sheet.getCell(row, titleStartCol).value = RUHUNU_PRINT_BRAND_NAME.toUpperCase();
  sheet.getCell(row, titleStartCol).font = { bold: true, size: 14, name: 'Arial' };
  row += 1;

  sheet.mergeCells(row, titleStartCol, row, colCount);
  sheet.getCell(row, titleStartCol).value = reportName.toUpperCase();
  sheet.getCell(row, titleStartCol).font = {
    bold: true,
    size: 10,
    name: 'Arial',
    color: { argb: 'FF555555' },
  };
  row += 1;

  if (!hasLogo) {
    sheet.getRow(1).height = 18;
    sheet.getRow(2).height = 16;
  }

  row += 1;
  sheet.mergeCells(`A${row}:${lastCol}${row}`);
  sheet.getCell(row, 1).border = {
    bottom: { style: 'medium', color: { argb: 'FF000000' } },
  };
  row += 2;

  sheet.mergeCells(`A${row}:${lastCol}${row}`);
  const summaryTitle = sheet.getCell(row, 1);
  summaryTitle.value = 'REPORT SUMMARY';
  summaryTitle.font = { bold: true, size: 8, name: 'Arial' };
  summaryTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
  summaryTitle.border = thinBorder;
  for (let c = 2; c <= colCount; c++) {
    sheet.getCell(row, c).border = thinBorder;
    sheet.getCell(row, c).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8E8E8' },
    };
  }
  sheet.getRow(row).height = 16;
  row += 1;

  const summaryStartRow = row;
  const summaryCols = 3;
  /** Spread summary fields across the sheet so Period / Generated At are not stuck in the narrow No. column. */
  const baseSpan = Math.floor(colCount / summaryCols);
  const remSpan = colCount % summaryCols;
  const slotSpans = Array.from(
    { length: summaryCols },
    (_, i) => Math.max(1, baseSpan + (i < remSpan ? 1 : 0))
  );
  let itemCol = 0;
  let itemRow = 0;
  let slotIndex = 0;

  const placePair = (
    label: string,
    value: string,
    excelCol: number,
    endCol: number,
    excelRow: number
  ) => {
    if (endCol > excelCol) {
      sheet.mergeCells(excelRow, excelCol, excelRow, endCol);
      sheet.mergeCells(excelRow + 1, excelCol, excelRow + 1, endCol);
    }
    sheet.getCell(excelRow, excelCol).value = label.toUpperCase();
    sheet.getCell(excelRow, excelCol).font = {
      size: 7,
      name: 'Arial',
      color: { argb: 'FF666666' },
    };
    const valueCell = sheet.getCell(excelRow + 1, excelCol);
    valueCell.value = value || '—';
    valueCell.font = { bold: true, size: 9, name: 'Arial' };
    valueCell.alignment = { wrapText: true, vertical: 'top' };

    const mergedWidth = Array.from(
      { length: endCol - excelCol + 1 },
      (_, i) => Number(sheet.getColumn(excelCol + i).width ?? 12)
    ).reduce((a, b) => a + b, 0);
    const approxCharsPerLine = Math.max(12, Math.floor(mergedWidth * 1.1));
    const text = value || '—';
    const hardLines = text.split('\n');
    let lineCount = 0;
    for (const hard of hardLines) {
      lineCount += Math.max(1, Math.ceil(hard.length / approxCharsPerLine));
    }
    const currentH = sheet.getRow(excelRow + 1).height || 16;
    sheet.getRow(excelRow + 1).height = Math.max(currentH, 16, lineCount * 14);
  };

  for (const item of summaryItems) {
    if (item.fullWidth) {
      if (itemCol > 0) {
        itemCol = 0;
        itemRow += 2;
        slotIndex = 0;
      }
      placePair(item.label, item.value || '—', 1, colCount, summaryStartRow + itemRow);
      itemCol = 0;
      itemRow += 2;
      slotIndex = 0;
      continue;
    }

    let span = slotSpans[slotIndex] ?? 1;
    if (itemCol + span > colCount) {
      itemCol = 0;
      itemRow += 2;
      slotIndex = 0;
      span = slotSpans[0] ?? 1;
    }
    const excelRow = summaryStartRow + itemRow;
    const excelCol = itemCol + 1;
    const endCol = Math.min(excelCol + span - 1, colCount);
    placePair(item.label, item.value || '—', excelCol, endCol, excelRow);
    itemCol += span;
    slotIndex += 1;
    if (slotIndex >= summaryCols || itemCol >= colCount) {
      itemCol = 0;
      itemRow += 2;
      slotIndex = 0;
    }
  }

  const summaryRowsUsed = Math.max(
    2,
    itemRow + (itemCol > 0 || slotIndex > 0 ? 2 : 0)
  );
  const summaryEndRow = summaryStartRow + summaryRowsUsed - 1;
  for (let r = summaryStartRow; r <= summaryEndRow; r++) {
    for (let c = 1; c <= colCount; c++) {
      const cell = sheet.getCell(r, c);
      const border: Partial<ExcelJS.Borders> = { ...(cell.border ?? {}) };
      if (r === summaryStartRow) border.top = { style: 'thin', color: { argb: 'FF000000' } };
      if (r === summaryEndRow) border.bottom = { style: 'thin', color: { argb: 'FF000000' } };
      if (c === 1) border.left = { style: 'thin', color: { argb: 'FF000000' } };
      if (c === colCount) border.right = { style: 'thin', color: { argb: 'FF000000' } };
      cell.border = border;
    }
  }
  return summaryEndRow + 2;
}

function writeHeaderRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  headers: Array<string | null>,
  rightFrom = 99,
  height = 18
): number {
  for (let c = 0; c < headers.length; c++) {
    const cell = sheet.getCell(row, c + 1);
    cell.value = headers[c] ?? null;
    cell.font = { bold: true, size: 6, name: 'Arial' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
    cell.border = thinBorder;
    cell.alignment = {
      vertical: 'middle',
      horizontal: c === 0 ? 'left' : c >= rightFrom ? 'right' : 'left',
      wrapText: true,
    };
  }
  sheet.getRow(row).height = height;
  return row + 1;
}

function writeDataRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  values: Array<string | null>,
  opts?: { bold?: boolean; fill?: string; rightFrom?: number; height?: number; shrinkFrom?: number }
): number {
  const rightFrom = opts?.rightFrom ?? 99;
  for (let c = 0; c < values.length; c++) {
    const shrink = opts?.shrinkFrom != null && c >= opts.shrinkFrom;
    const cell = sheet.getCell(row, c + 1);
    cell.value = cellValue(values[c]);
    cell.numFmt = '@';
    cell.font = { size: 7, name: 'Arial', bold: Boolean(opts?.bold) };
    cell.border = thinBorder;
    cell.alignment = {
      vertical: 'top',
      horizontal: c === 0 ? 'center' : c >= rightFrom ? 'right' : 'left',
      wrapText: !shrink,
      shrinkToFit: shrink,
    };
    if (opts?.fill) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
    }
  }
  sheet.getRow(row).height = opts?.height ?? 16;
  return row + 1;
}

function writeSpannedRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  cells: Array<{
    value: string | number | ExcelJS.CellRichTextValue | null;
    span: number;
    bold?: boolean;
    fill?: string;
    align?: 'left' | 'right' | 'center';
    shrink?: boolean;
    fontSize?: number;
  }>,
  height: number
): number {
  let col = 1;
  for (const spec of cells) {
    const span = Math.max(1, spec.span);
    const end = col + span - 1;
    if (end > col) sheet.mergeCells(row, col, row, end);
    const cell = sheet.getCell(row, col);
    cell.value = spec.value ?? null;
    if (typeof spec.value !== 'object' || spec.value === null) cell.numFmt = '@';
    cell.font = { size: spec.fontSize ?? 7, name: 'Arial', bold: Boolean(spec.bold) };
    cell.alignment = {
      vertical: 'middle',
      horizontal: spec.align ?? 'left',
      wrapText: !spec.shrink,
      shrinkToFit: Boolean(spec.shrink),
    };
    const fill = spec.fill
      ? { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: spec.fill } }
      : undefined;
    for (let c = col; c <= end; c += 1) {
      const merged = sheet.getCell(row, c);
      merged.border = thinBorder;
      if (fill) merged.fill = fill;
    }
    col = end + 1;
  }
  sheet.getRow(row).height = height;
  return row + 1;
}

function writeSectionTitle(
  sheet: ExcelJS.Worksheet,
  row: number,
  title: string,
  colCount: number
): number {
  sheet.mergeCells(row, 1, row, colCount);
  const cell = sheet.getCell(row, 1);
  cell.value = title;
  cell.font = { bold: true, size: 9, name: 'Arial' };
  sheet.getRow(row).height = 16;
  return row + 1;
}

function writeCreditCashFooter(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  totals: CashierSummaryPaymentAmounts,
  layout?: { labelEndCol: number; valueCol: number; valueEndCol: number; footerEndCol: number }
): number {
  const slip = Number(totals.slip);
  const creditCustomer = Number(totals.agentCredit);
  const creditSectionTotal = slip + creditCustomer;
  const cashSectionTotal = sumAmounts(totals, CASH_SUMMARY_KEYS);
  const agentTotal = Number(totals.agent);
  const grandCombined = creditSectionTotal + cashSectionTotal;

  // Main table col A is narrow (No.); merge A–B for labels, put values in C
  // so names like "Credit Card Total" / "Grand Total" are fully visible.
  const labelEndCol = layout?.labelEndCol ?? 2;
  const valueCol = layout?.valueCol ?? 3;
  const valueEndCol = layout?.valueEndCol ?? valueCol;
  const footerEndCol = layout?.footerEndCol ?? 3;

  let row = startRow;
  sheet.mergeCells(row, 1, row, footerEndCol);
  sheet.getCell(row, 1).value = 'CASHIER SUMMARY (CREDIT VS CASH)';
  sheet.getCell(row, 1).font = { bold: true, size: 8, name: 'Arial' };
  row += 1;

  const writePair = (
    label: string,
    value: string,
    opts?: { bold?: boolean; fill?: string; header?: boolean }
  ) => {
    if (opts?.header) {
      sheet.mergeCells(row, 1, row, footerEndCol);
      const cell = sheet.getCell(row, 1);
      cell.value = label;
      cell.font = { bold: true, size: 8, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      cell.border = thinBorder;
      for (let c = 2; c <= footerEndCol; c++) {
        sheet.getCell(row, c).border = thinBorder;
        sheet.getCell(row, c).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8E8E8' },
        };
      }
    } else {
      if (labelEndCol > 1) sheet.mergeCells(row, 1, row, labelEndCol);
      if (valueEndCol > valueCol) sheet.mergeCells(row, valueCol, row, valueEndCol);
      const left = sheet.getCell(row, 1);
      const right = sheet.getCell(row, valueCol);
      left.value = label;
      right.value = value;
      left.numFmt = '@';
      right.numFmt = '@';
      left.font = { size: 8, name: 'Arial', bold: Boolean(opts?.bold) };
      right.font = { size: 8, name: 'Arial', bold: Boolean(opts?.bold) };
      left.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
      right.alignment = { horizontal: 'right', vertical: 'middle', shrinkToFit: true, wrapText: false };
      const fill = opts?.fill
        ? { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: opts.fill } }
        : undefined;
      for (let c = 1; c <= labelEndCol; c += 1) {
        const cell = sheet.getCell(row, c);
        cell.border = thinBorder;
        if (fill) cell.fill = fill;
      }
      for (let c = valueCol; c <= valueEndCol; c += 1) {
        const cell = sheet.getCell(row, c);
        cell.border = thinBorder;
        if (fill) cell.fill = fill;
      }
    }
    sheet.getRow(row).height = 16;
    row += 1;
  };

  writePair('Credit Summary', '', { header: true });
  writePair('Slip Total', formatAmount(slip));
  writePair('Credit Total', formatAmount(creditCustomer));
  writePair('Total', formatAmount(creditSectionTotal), { bold: true, fill: 'FFF3F3F3' });
  writePair('Cash Summary', '', { header: true });
  writePair('Cash Total', formatAmount(totals.cash));
  writePair('Credit Card Total', formatAmount(totals.creditCard));
  writePair('Cheque Total', formatAmount(totals.cheque));
  writePair('E-wallet Total', formatAmount(totals.eWallet));
  writePair('Total', formatAmount(cashSectionTotal), { bold: true, fill: 'FFF3F3F3' });
  writePair('Grand Total', formatAmount(grandCombined), { bold: true, fill: 'FFF3F3F3' });
  writePair('Agent Total', formatAmount(agentTotal), { bold: true });

  return row;
}

export type DownloadCashierSummaryExcelOptions = {
  mode: 'summary' | 'detail';
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  sections: CashierSummaryReportSection[];
  grandTotals: CashierSummaryPaymentAmounts | null;
  fileName?: string;
  sheetName?: string;
};

export async function downloadCashierSummaryReportExcel(
  opts: DownloadCashierSummaryExcelOptions
): Promise<void> {
  const isPortrait = opts.mode === 'summary';
  const columnWidths = isPortrait
    ? Array.from({ length: SUMMARY_GRID }, () => SUMMARY_GRID_WIDTH)
    : ROW_WIDTHS;
  const colCount = columnWidths.length;
  const lastCol = colLetter(colCount);
  const pageOrientation = isPortrait ? 'portrait' : 'landscape';
  const fileName = opts.fileName ?? 'cashier-summary.xlsx';
  const safeSheetName = (
    opts.sheetName || (opts.mode === 'detail' ? 'Cashier Detail' : 'Cashier Summary')
  )
    .replace(/[:\\/?*\[\]]/g, ' ')
    .slice(0, 31);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = RUHUNU_PRINT_BRAND_NAME;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(safeSheetName, {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: pageOrientation,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: false,
      margins: {
        left: 0.39,
        right: 0.39,
        top: 0.24,
        bottom: 0.55,
        header: 0.15,
        footer: 0.3,
      },
    },
  });

  for (let i = 0; i < colCount; i++) {
    sheet.getColumn(i + 1).width = columnWidths[i] ?? 10;
  }

  let row = await drawBrandedHeader(workbook, sheet, {
    reportName: opts.reportName,
    summaryItems: opts.summaryItems,
    colCount,
    titleStartCol: isPortrait ? 6 : undefined,
  });

  for (const section of opts.sections) {
    const withRows = sectionShowRows(opts.mode, section.key) && section.rows.length > 0;
    const hasTotals = sectionHasAnyTotal(section);
    if (!withRows && !hasTotals) continue;

    row = writeSectionTitle(sheet, row, section.title, colCount);
    const isIncomeExpense = section.key === 'incomeExpense';
    const isAgency = AGENCY_BILL_SECTION_KEYS.has(section.key);

    if (isPortrait && withRows) {
      const partyHead = isIncomeExpense ? 'Name' : isAgency ? 'Agency' : 'Patient';
      const secondHead = isIncomeExpense ? 'Type' : 'Consultant';
      const lineHeads = [
        'No.',
        'Tx Created / Shift',
        'Session Date/Time',
        'Receipt ID / Bill ID',
        partyHead,
        secondHead,
        ...PAYMENT_COLUMNS.map((c) => c.label),
      ];
      row = writeSpannedRow(
        sheet,
        row,
        lineHeads.map((label, index) => ({
          value: label,
          span: SUMMARY_LINE_SPANS[index] ?? 1,
          bold: true,
          fill: 'FFE8E8E8',
          align: index === 0 ? 'center' : index >= 6 ? 'right' : 'left',
          fontSize: 6,
        })),
        22
      );
      section.rows.forEach((r, idx) => {
        const values = [
          String(idx + 1),
          txLabel(r),
          r.sessionDateTime ?? '—',
          `${r.receiptId || '—'}\n${r.billId ?? '—'}`,
          isIncomeExpense ? (r.name ?? '—') : (r.patient ?? '—'),
          isIncomeExpense ? (r.type ?? '—') : (r.consultant ?? '—'),
          ...amountCells(r),
        ];
        row = writeSpannedRow(
          sheet,
          row,
          values.map((value, index) => ({
            value,
            span: SUMMARY_LINE_SPANS[index] ?? 1,
            align: index === 0 ? 'center' : index >= 6 ? 'right' : 'left',
            shrink: index >= 6,
          })),
          28
        );
      });
      const metaSpan = SUMMARY_LINE_SPANS.slice(0, 6).reduce((total, span) => total + span, 0);
      row = writeSpannedRow(
        sheet,
        row,
        [
          { value: 'Total', span: metaSpan, bold: true, fill: 'FFF3F3F3', align: 'left' },
          ...amountCells(section.totals).map((value, index) => ({
            value,
            span: SUMMARY_LINE_SPANS[6 + index] ?? 1,
            bold: true,
            fill: 'FFF3F3F3',
            align: 'right' as const,
            shrink: true,
          })),
        ],
        18
      );
    } else if (isPortrait) {
      const labels = ['Total', ...PAYMENT_COLUMNS.map((c) => c.label)];
      const amounts = ['Total', ...amountCells(section.totals)];
      row = writeSpannedRow(
        sheet,
        row,
        labels.map((label, index) => ({
          value: label,
          span: SUMMARY_TOTALS_SPANS[index] ?? 1,
          bold: true,
          fill: 'FFE8E8E8',
          align: index === 0 ? 'left' : 'right',
          fontSize: 6,
        })),
        18
      );
      row = writeSpannedRow(
        sheet,
        row,
        amounts.map((value, index) => ({
          value,
          span: SUMMARY_TOTALS_SPANS[index] ?? 1,
          bold: true,
          fill: 'FFF3F3F3',
          align: index === 0 ? 'left' : 'right',
          shrink: index > 0,
        })),
        18
      );
    } else if (withRows) {
      const partyHead = isIncomeExpense ? 'Name' : isAgency ? 'Agency' : 'Patient';
      const secondHead = isIncomeExpense ? 'Type' : 'Consultant';
      row = writeHeaderRow(
        sheet,
        row,
        [
          'No.',
          'Tx Created / Shift',
          'Session Date/Time',
          'Receipt ID / Bill ID',
          partyHead,
          secondHead,
          ...PAYMENT_COLUMNS.map((c) => c.label),
        ],
        6,
        isPortrait ? 32 : 18
      );
      section.rows.forEach((r, idx) => {
        row = writeDataRow(
          sheet,
          row,
          [
            String(idx + 1),
            txLabel(r),
            r.sessionDateTime ?? '—',
            `${r.receiptId || '—'}\n${r.billId ?? '—'}`,
            isIncomeExpense ? (r.name ?? '—') : (r.patient ?? '—'),
            isIncomeExpense ? (r.type ?? '—') : (r.consultant ?? '—'),
            ...amountCells(r),
          ],
          { rightFrom: 6, height: 28, shrinkFrom: isPortrait ? 6 : undefined }
        );
      });
      // Match print: Total spans first 6 columns, then 7 payment amounts.
      // Merge after writing so the empty cells do not clear the Total label.
      const totalRow = row;
      row = writeDataRow(
        sheet,
        row,
        ['Total', null, null, null, null, null, ...amountCells(section.totals)],
        { bold: true, fill: 'FFF3F3F3', rightFrom: 6, shrinkFrom: isPortrait ? 6 : undefined }
      );
      sheet.mergeCells(totalRow, 1, totalRow, 6);
      sheet.getCell(totalRow, 1).value = 'Total';
      sheet.getCell(totalRow, 1).alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: true,
      };
    } else {
      // Detail totals-only: Total spans the first 6 columns, then the payment amounts.
      const totalsHeaderRow = row;
      row = writeHeaderRow(
        sheet,
        row,
        ['Total', null, null, null, null, null, ...PAYMENT_COLUMNS.map((c) => c.label)],
        6,
        isPortrait ? 32 : 18
      );
      sheet.mergeCells(totalsHeaderRow, 1, totalsHeaderRow, 6);
      sheet.getCell(totalsHeaderRow, 1).value = 'Total';
      sheet.getCell(totalsHeaderRow, 1).alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: true,
      };
      const totalsDataRow = row;
      row = writeDataRow(
        sheet,
        row,
        ['Total', null, null, null, null, null, ...amountCells(section.totals)],
        { bold: true, fill: 'FFF3F3F3', rightFrom: 6, shrinkFrom: isPortrait ? 6 : undefined }
      );
      sheet.mergeCells(totalsDataRow, 1, totalsDataRow, 6);
      sheet.getCell(totalsDataRow, 1).value = 'Total';
      sheet.getCell(totalsDataRow, 1).alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: true,
      };
    }
    row += 1;
  }

  if (opts.grandTotals) {
    row = writeCreditCashFooter(
      sheet,
      row,
      opts.grandTotals,
      isPortrait
        ? { labelEndCol: 6, valueCol: 7, valueEndCol: 9, footerEndCol: 9 }
        : undefined
    );
  }

  row += 1;
  sheet.mergeCells(`A${row}:${lastCol}${row}`);
  sheet.getCell(row, 1).value = `Generated: ${opts.generatedAt}`;
  sheet.getCell(row, 1).font = { bold: true, size: 9, name: 'Arial', color: { argb: 'FF000000' } };

  sheet.headerFooter.oddFooter = `&LGenerated: ${opts.generatedAt}&RPage &P of &N`;
  sheet.headerFooter.evenFooter = `&LGenerated: ${opts.generatedAt}&RPage &P of &N`;

  sheet.pageSetup.printArea = `A1:${lastCol}${row}`;
  sheet.pageSetup.paperSize = 9;
  sheet.pageSetup.orientation = pageOrientation;
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0;
  sheet.pageSetup.horizontalCentered = false;
  // Drop the default 100% scale so Excel honors fit-to-width on the portrait page.
  if (isPortrait) {
    delete (sheet.pageSetup as { scale?: number }).scale;
  }
  sheet.pageSetup.margins = {
    left: 0.39,
    right: 0.39,
    top: 0.24,
    bottom: 0.55,
    header: 0.15,
    footer: 0.3,
  };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
}
