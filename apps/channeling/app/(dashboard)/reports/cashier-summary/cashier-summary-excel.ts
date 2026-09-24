'use client';

/**
 * Userwise Cashier — Excel ONLY (A4 landscape, matches Print / PDF).
 * Summary and Detail both use the same horizontal payment-column tables.
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

/** A4 landscape matching print: Tx wide, Receipt narrower, Consultant wider; amounts ≥12. */
const ROW_WIDTHS = [5, 36, 19, 19, 11, 12, 12, 12, 12, 12, 12, 12, 12];

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
    titleStartCol = Math.min(3, colCount);
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
  rightFrom = 99
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
  sheet.getRow(row).height = 18;
  return row + 1;
}

function writeDataRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  values: Array<string | null>,
  opts?: { bold?: boolean; fill?: string; rightFrom?: number; height?: number }
): number {
  const rightFrom = opts?.rightFrom ?? 99;
  for (let c = 0; c < values.length; c++) {
    const cell = sheet.getCell(row, c + 1);
    cell.value = cellValue(values[c]);
    cell.numFmt = '@';
    cell.font = { size: 7, name: 'Arial', bold: Boolean(opts?.bold) };
    cell.border = thinBorder;
    cell.alignment = {
      vertical: 'top',
      horizontal: c === 0 ? 'center' : c >= rightFrom ? 'right' : 'left',
      wrapText: true,
    };
    if (opts?.fill) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
    }
  }
  sheet.getRow(row).height = opts?.height ?? 16;
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
  totals: CashierSummaryPaymentAmounts
): number {
  const slip = Number(totals.slip);
  const creditCustomer = Number(totals.agentCredit);
  const creditSectionTotal = slip + creditCustomer;
  const cashSectionTotal = sumAmounts(totals, CASH_SUMMARY_KEYS);
  const agentTotal = Number(totals.agent);
  const grandCombined = creditSectionTotal + cashSectionTotal;

  // Main table col A is narrow (No.); merge A–B for labels, put values in C
  // so names like "Credit Card Total" / "Grand Total" are fully visible.
  const labelEndCol = 2;
  const valueCol = 3;
  const footerEndCol = 3;

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
      sheet.mergeCells(row, 1, row, labelEndCol);
      const left = sheet.getCell(row, 1);
      const right = sheet.getCell(row, valueCol);
      left.value = label;
      right.value = value;
      left.numFmt = '@';
      right.numFmt = '@';
      left.font = { size: 8, name: 'Arial', bold: Boolean(opts?.bold) };
      right.font = { size: 8, name: 'Arial', bold: Boolean(opts?.bold) };
      left.alignment = { horizontal: 'left', vertical: 'middle', wrapText: false };
      right.alignment = { horizontal: 'right', vertical: 'middle' };
      left.border = thinBorder;
      sheet.getCell(row, labelEndCol).border = thinBorder;
      right.border = thinBorder;
      if (opts?.fill) {
        const fill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: opts.fill } };
        left.fill = fill;
        sheet.getCell(row, labelEndCol).fill = fill;
        right.fill = fill;
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
  const colCount = ROW_WIDTHS.length;
  const lastCol = colLetter(colCount);
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
      orientation: 'landscape',
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
    sheet.getColumn(i + 1).width = ROW_WIDTHS[i] ?? 10;
  }

  let row = await drawBrandedHeader(workbook, sheet, {
    reportName: opts.reportName,
    summaryItems: opts.summaryItems,
    colCount,
  });

  for (const section of opts.sections) {
    const withRows = sectionShowRows(opts.mode, section.key) && section.rows.length > 0;
    const hasTotals = sectionHasAnyTotal(section);
    if (!withRows && !hasTotals) continue;

    row = writeSectionTitle(sheet, row, section.title, colCount);
    const isIncomeExpense = section.key === 'incomeExpense';
    const isAgency = AGENCY_BILL_SECTION_KEYS.has(section.key);

    if (withRows) {
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
        6
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
          { rightFrom: 6, height: 28 }
        );
      });
      // Match print: Total spans first 6 columns, then 7 payment amounts
      const totalRow = row;
      sheet.mergeCells(totalRow, 1, totalRow, 6);
      row = writeDataRow(
        sheet,
        row,
        ['Total', null, null, null, null, null, ...amountCells(section.totals)],
        { bold: true, fill: 'FFF3F3F3', rightFrom: 6 }
      );
      sheet.getCell(totalRow, 1).alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: true,
      };
    } else {
      // Totals-only: full 13-col width (Total spans 1–6, payments 7–13) — same as print
      const totalsHeaderRow = row;
      sheet.mergeCells(totalsHeaderRow, 1, totalsHeaderRow, 6);
      row = writeHeaderRow(
        sheet,
        row,
        ['Total', null, null, null, null, null, ...PAYMENT_COLUMNS.map((c) => c.label)],
        6
      );
      sheet.getCell(totalsHeaderRow, 1).alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: true,
      };
      const totalsDataRow = row;
      sheet.mergeCells(totalsDataRow, 1, totalsDataRow, 6);
      row = writeDataRow(
        sheet,
        row,
        ['Total', null, null, null, null, null, ...amountCells(section.totals)],
        { bold: true, fill: 'FFF3F3F3', rightFrom: 6 }
      );
      sheet.getCell(totalsDataRow, 1).alignment = {
        vertical: 'middle',
        horizontal: 'left',
        wrapText: true,
      };
    }
    row += 1;
  }

  if (opts.grandTotals) {
    row = writeCreditCashFooter(sheet, row, opts.grandTotals);
  }

  row += 1;
  sheet.mergeCells(`A${row}:${lastCol}${row}`);
  sheet.getCell(row, 1).value = `Generated: ${opts.generatedAt}`;
  sheet.getCell(row, 1).font = { bold: true, size: 9, name: 'Arial', color: { argb: 'FF000000' } };

  sheet.headerFooter.oddFooter = `&LGenerated: ${opts.generatedAt}&RPage &P of &N`;
  sheet.headerFooter.evenFooter = `&LGenerated: ${opts.generatedAt}&RPage &P of &N`;

  sheet.pageSetup.printArea = `A1:${lastCol}${row}`;
  sheet.pageSetup.paperSize = 9;
  sheet.pageSetup.orientation = 'landscape';
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0;
  sheet.pageSetup.horizontalCentered = false;
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
