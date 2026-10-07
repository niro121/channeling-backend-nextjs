'use client';

/**
 * All Cashier Summary and Detail — Excel ONLY (matches Print / PDF).
 * Summary page setup is A4 portrait; Detail stays A4 landscape.
 * Horizontal payment columns; Detail = one table block per user + Grand Total.
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
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
  ACS_DETAIL_WIDE_HEADERS,
  ACS_PAYMENT_COLUMNS,
  ACS_SUMMARY_WIDE_HEADERS,
  amountCells,
  buildAcsDetailUserWideRows,
  buildAcsSummaryWideRows,
  type AcsShiftMarkLine,
} from './all-cashier-summary-detail-export-config';

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

/**
 * Summary print shares: No 4 | User 14 | Receipts 6 | amounts 6.5×7 | Shifts 18 | Checked By 12.5.
 */
const SUMMARY_PRINT_SHARES = [4, 14, 6, 6.5, 6.5, 6.5, 6.5, 6.5, 6.5, 6.5, 18, 12.5];

function shareWidths(shares: number[], budget = 100): number[] {
  const sum = shares.reduce((total, share) => total + share, 0);
  return shares.map((share) => Math.round((share / sum) * budget * 10) / 10);
}

/** Character widths that fit inside an A4 portrait page at 100% zoom. */
function portraitCharacterBudget(columnCount: number): number {
  const printablePx = ((210 - 20) / 25.4) * 96;
  return Math.max(48, Math.floor((printablePx - 5 * columnCount) / 7) - 8);
}
const DETAIL_COLUMN_WIDTHS = [5, 18, 18, 8, 12, 12, 12, 12, 12, 12, 12, 32, 12];

const SUMMARY_AMOUNT_START = 3; // Cash
const DETAIL_AMOUNT_START = 4;
const SUMMARY_SHIFTS_COL = 10; // 0-based
const DETAIL_SHIFTS_COL = 11;

function shiftMarksRichText(lines: AcsShiftMarkLine[]): ExcelJS.CellRichTextValue {
  return {
    richText: lines.map((line, i) => ({
      text: i === 0 ? line.text : `\n${line.text}`,
      font: {
        size: 7,
        name: 'Arial',
        bold: true,
        color: {
          argb:
            line.tone === 'handed' ? 'FF15803D' : line.tone === 'open' ? 'FFDC2626' : 'FF111111',
        },
      },
    })),
  };
}

function cellValue(raw: string | undefined | null): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  return raw;
}

type CommonOpts = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  fileName?: string;
  sheetName?: string;
  grandTotals: CashierSummaryPaymentAmounts | null;
  totalReceipts: number;
};

export type DownloadAcsSummaryExcelOptions = CommonOpts & {
  mode: 'summary';
  summaryRows: AllCashierUserSummaryRow[];
};

export type DownloadAcsDetailExcelOptions = CommonOpts & {
  mode: 'detail';
  detailRows: AllCashierUserDetailRow[];
};

export type DownloadAllCashierSummaryDetailExcelOptions =
  | DownloadAcsSummaryExcelOptions
  | DownloadAcsDetailExcelOptions;

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
  const baseSpan = Math.floor(colCount / summaryCols);
  const remSpan = colCount % summaryCols;
  const slotSpans = Array.from(
    { length: summaryCols },
    (_, i) => Math.max(1, baseSpan + (i < remSpan ? 1 : 0))
  );
  let itemCol = 0;
  let itemRow = 0;
  let slotIndex = 0;

  for (const item of summaryItems) {
    if (item.fullWidth) {
      if (itemCol > 0) {
        itemCol = 0;
        itemRow += 2;
        slotIndex = 0;
      }
      const excelRow = summaryStartRow + itemRow;
      sheet.mergeCells(excelRow, 1, excelRow, colCount);
      sheet.mergeCells(excelRow + 1, 1, excelRow + 1, colCount);
      sheet.getCell(excelRow, 1).value = item.label.toUpperCase();
      sheet.getCell(excelRow, 1).font = { size: 7, name: 'Arial', color: { argb: 'FF666666' } };
      sheet.getCell(excelRow + 1, 1).value = item.value || '—';
      sheet.getCell(excelRow + 1, 1).font = { bold: true, size: 9, name: 'Arial' };
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
    if (endCol > excelCol) {
      sheet.mergeCells(excelRow, excelCol, excelRow, endCol);
      sheet.mergeCells(excelRow + 1, excelCol, excelRow + 1, endCol);
    }
    sheet.getCell(excelRow, excelCol).value = item.label.toUpperCase();
    sheet.getCell(excelRow, excelCol).font = {
      size: 7,
      name: 'Arial',
      color: { argb: 'FF666666' },
    };
    sheet.getCell(excelRow + 1, excelCol).value = item.value || '—';
    sheet.getCell(excelRow + 1, excelCol).font = { bold: true, size: 9, name: 'Arial' };
    itemCol += span;
    slotIndex += 1;
    if (slotIndex >= summaryCols || itemCol >= colCount) {
      itemCol = 0;
      itemRow += 2;
      slotIndex = 0;
    }
  }

  const summaryRowsUsed = Math.max(2, itemRow + (itemCol > 0 || slotIndex > 0 ? 2 : 0));
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
  headers: readonly string[],
  amountStart: number,
  height = 18
): number {
  for (let c = 0; c < headers.length; c++) {
    const cell = sheet.getCell(row, c + 1);
    cell.value = headers[c]!;
    cell.font = { bold: true, size: 6, name: 'Arial' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
    cell.border = thinBorder;
    cell.alignment = {
      vertical: 'middle',
      horizontal:
        c === 0
          ? 'center'
          : c >= amountStart && c < amountStart + ACS_PAYMENT_COLUMNS.length
            ? 'right'
            : c === amountStart - 1
              ? 'right'
              : 'left',
      wrapText: true,
    };
  }
  sheet.getRow(row).height = height;
  return row + 1;
}

function writeDataCells(
  sheet: ExcelJS.Worksheet,
  row: number,
  cells: string[],
  opts: {
    amountStart: number;
    shiftsCol: number;
    shiftMarks?: AcsShiftMarkLine[];
    bold?: boolean;
    fill?: string;
    shrinkAmounts?: boolean;
  }
): number {
  const colCount = cells.length;
  for (let c = 0; c < colCount; c++) {
    const isAmount = c >= opts.amountStart && c < opts.amountStart + ACS_PAYMENT_COLUMNS.length;
    const shrink = Boolean(opts.shrinkAmounts && isAmount);
    const cell = sheet.getCell(row, c + 1);
    const marks = opts.shiftMarks && c === opts.shiftsCol ? opts.shiftMarks : undefined;
    if (marks?.length) {
      cell.value = shiftMarksRichText(marks);
    } else if (isAmount) {
      const n = Number(String(cells[c] ?? '').replace(/,/g, ''));
      cell.value = Number.isFinite(n) ? n : cellValue(cells[c]);
      if (typeof cell.value === 'number') cell.numFmt = '#,##0.00';
      cell.font = { size: 7, name: 'Arial', bold: Boolean(opts.bold) };
    } else {
      cell.value = cellValue(cells[c]);
      cell.font = { size: 7, name: 'Arial', bold: Boolean(opts.bold) };
    }
    cell.border = thinBorder;
    cell.alignment = {
      vertical: 'top',
      horizontal:
        c === 0
          ? 'center'
          : isAmount
            ? 'right'
            : c === opts.amountStart - 1
              ? 'right'
              : 'left',
      wrapText: !shrink,
      shrinkToFit: shrink,
    };
    if (opts.fill) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
    }
  }
  const markLines = opts.shiftMarks?.length ?? 0;
  sheet.getRow(row).height = Math.max(18, markLines * 12);
  return row + 1;
}

export async function downloadAllCashierSummaryDetailReportExcel(
  opts: DownloadAllCashierSummaryDetailExcelOptions
): Promise<void> {
  const fileName = opts.fileName ?? 'all-cashier-summary-detail.xlsx';
  const isDetail = opts.mode === 'detail';
  const headers = isDetail ? ACS_DETAIL_WIDE_HEADERS : ACS_SUMMARY_WIDE_HEADERS;
  const colCount = headers.length;
  const widths = isDetail
    ? DETAIL_COLUMN_WIDTHS
    : shareWidths(SUMMARY_PRINT_SHARES, portraitCharacterBudget(SUMMARY_PRINT_SHARES.length));
  const pageOrientation = isDetail ? 'landscape' : 'portrait';
  const amountStart = isDetail ? DETAIL_AMOUNT_START : SUMMARY_AMOUNT_START;
  const shiftsCol = isDetail ? DETAIL_SHIFTS_COL : SUMMARY_SHIFTS_COL;
  const lastCol = colLetter(colCount);
  const safeSheetName = (
    opts.sheetName || (isDetail ? 'All Cashier Detail' : 'All Cashier Summary')
  )
    .replace(/[:\\/?*\[\]]/g, ' ')
    .slice(0, 31);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = RUHUNU_PRINT_BRAND_NAME;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(safeSheetName, {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
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
    sheet.getColumn(i + 1).width = widths[i] ?? 12;
  }

  let row = await drawBrandedHeader(workbook, sheet, {
    reportName: opts.reportName,
    summaryItems: opts.summaryItems,
    colCount,
  });

  if (opts.mode === 'summary') {
    row = writeHeaderRow(sheet, row, headers, amountStart, 32);
    const checkedByHeader = sheet.getCell(row - 1, shiftsCol + 2);
    checkedByHeader.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    const wideRows = buildAcsSummaryWideRows(
      opts.summaryRows,
      opts.grandTotals,
      opts.totalReceipts
    );
    for (const wide of wideRows) {
      const dataRow = row;
      row = writeDataCells(sheet, row, wide.cells, {
        amountStart,
        shiftsCol,
        shiftMarks: wide.shiftMarks,
        bold: wide.isTotal,
        fill: wide.isTotal ? 'FFF3F3F3' : undefined,
        shrinkAmounts: true,
      });
      if (wide.isTotal) {
        // Print total spans No + User + Receipts.
        sheet.mergeCells(dataRow, 1, dataRow, 3);
        const totalCell = sheet.getCell(dataRow, 1);
        totalCell.value = 'Total';
        totalCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        totalCell.font = { bold: true, size: 7, name: 'Arial' };
        totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
      } else {
        // Print Checked By column: dotted signature line.
        const signCell = sheet.getCell(dataRow, shiftsCol + 2);
        signCell.border = {
          top: thinBorder.top,
          left: thinBorder.left,
          right: thinBorder.right,
          bottom: { style: 'dotted', color: { argb: 'FF666666' } },
        };
        signCell.alignment = { vertical: 'bottom', horizontal: 'center', wrapText: false };
      }
    }

    // Same sign-off as summary print / PDF, under the table on this sheet.
    row += 1;
    sheet.getRow(row).height = 48;
    row += 1;
    sheet.mergeCells(row, 1, row, 4);
    const approved = sheet.getCell(row, 1);
    approved.value = 'Approved By ...........';
    approved.font = { bold: true, size: 11, name: 'Arial' };
    approved.alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.mergeCells(row, 7, row, 11);
    const authorised = sheet.getCell(row, 7);
    authorised.value = 'Authorised By ...........';
    authorised.font = { bold: true, size: 11, name: 'Arial' };
    authorised.alignment = { vertical: 'middle', horizontal: 'right' };
    sheet.getRow(row).height = 22;
    row += 1;
  } else {
    // Match print: one header+body block per user, then Grand Total table
    opts.detailRows.forEach((user, idx) => {
      row = writeHeaderRow(sheet, row, headers, amountStart);
      const wideRows = buildAcsDetailUserWideRows(user, idx);
      for (const wide of wideRows) {
        row = writeDataCells(sheet, row, wide.cells, {
          amountStart,
          shiftsCol,
          shiftMarks: wide.shiftMarks,
          bold: wide.isUserTotal,
          fill: wide.isUserTotal ? 'FFF7F7F7' : undefined,
        });
      }
      row += 1; // gap between user tables
    });

    if (opts.grandTotals) {
      // Grand Total header: label spans first 4 cols, then payment labels
      sheet.mergeCells(row, 1, row, 4);
      const gtHead = sheet.getCell(row, 1);
      gtHead.value = 'Grand Total';
      gtHead.font = { bold: true, size: 6, name: 'Arial' };
      gtHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      for (let c = 1; c <= 4; c++) {
        sheet.getCell(row, c).border = thinBorder;
        sheet.getCell(row, c).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE8E8E8' },
        };
      }
      ACS_PAYMENT_COLUMNS.forEach((p, i) => {
        const cell = sheet.getCell(row, 5 + i);
        cell.value = p.label;
        cell.font = { bold: true, size: 6, name: 'Arial' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
        cell.border = thinBorder;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      });
      for (let c = 5 + ACS_PAYMENT_COLUMNS.length; c <= colCount; c++) {
        const cell = sheet.getCell(row, c);
        cell.border = thinBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      }
      sheet.getRow(row).height = 18;
      row += 1;

      sheet.mergeCells(row, 1, row, 4);
      sheet.getCell(row, 1).value = 'Total';
      sheet.getCell(row, 1).font = { bold: true, size: 7, name: 'Arial' };
      for (let c = 1; c <= 4; c++) {
        sheet.getCell(row, c).border = thinBorder;
        sheet.getCell(row, c).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F3F3' },
        };
        sheet.getCell(row, c).font = { bold: true, size: 7, name: 'Arial' };
      }
      amountCells(opts.grandTotals).forEach((v, i) => {
        const cell = sheet.getCell(row, 5 + i);
        const n = Number(String(v ?? '').replace(/,/g, ''));
        cell.value = Number.isFinite(n) ? n : v;
        if (typeof cell.value === 'number') cell.numFmt = '#,##0.00';
        cell.font = { bold: true, size: 7, name: 'Arial' };
        cell.border = thinBorder;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
      });
      for (let c = 5 + ACS_PAYMENT_COLUMNS.length; c <= colCount; c++) {
        const cell = sheet.getCell(row, c);
        cell.border = thinBorder;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
      }
      sheet.getRow(row).height = 18;
      row += 1;
    }

    // Match screen/print: Total receipts in report
    row += 1;
    sheet.mergeCells(`A${row}:${lastCol}${row}`);
    for (let c = 1; c <= colCount; c++) {
      const cell = sheet.getCell(row, c);
      cell.border = thinBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } };
    }
    sheet.getCell(row, 1).value = `Total receipts in report: ${opts.totalReceipts}`;
    sheet.getCell(row, 1).font = { bold: true, size: 8, name: 'Arial', color: { argb: 'FF000000' } };
    sheet.getCell(row, 1).alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.getRow(row).height = 18;
    row += 1;
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
  if (!isDetail) {
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
