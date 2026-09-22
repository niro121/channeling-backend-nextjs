'use client';

/**
 * All Cashier Summary and Detail — Excel ONLY (A4 portrait, matches Print / PDF).
 * Summary & Detail: compact categorized columns (payments stacked).
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
  ACS_DETAIL_PDF_HEADERS,
  ACS_SUMMARY_PDF_HEADERS,
  acsDetailPdfCompactRow,
  acsSummaryPdfCompactRow,
  buildAcsDetailCompactRows,
  buildAcsSummaryCompactRows,
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

/** ~ ACS_SUMMARY_PDF_COL_PERCENTS */
const SUMMARY_COLUMN_WIDTHS = [6, 18, 10, 24, 32, 14];
/** ~ ACS_DETAIL_PDF_COL_PERCENTS */
const DETAIL_COLUMN_WIDTHS = [5, 16, 16, 10, 24, 32, 14];

function shiftMarksRichText(lines: AcsShiftMarkLine[]): ExcelJS.CellRichTextValue {
  return {
    richText: lines.map((line, i) => ({
      text: i === 0 ? line.text : `\n${line.text}`,
      font: {
        size: 8,
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
  const summaryColSpan = Math.max(1, Math.floor(colCount / summaryCols));
  let itemCol = 0;
  let itemRow = 0;
  for (const item of summaryItems) {
    const span = item.fullWidth ? colCount : summaryColSpan;
    if (itemCol + span > colCount) {
      itemCol = 0;
      itemRow += 2;
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
  }

  const summaryRowsUsed = Math.max(2, itemRow + 2);
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

export async function downloadAllCashierSummaryDetailReportExcel(
  opts: DownloadAllCashierSummaryDetailExcelOptions
): Promise<void> {
  const fileName = opts.fileName ?? 'all-cashier-summary-detail.xlsx';
  const isDetail = opts.mode === 'detail';
  const colCount = isDetail
    ? ACS_DETAIL_PDF_HEADERS.length
    : ACS_SUMMARY_PDF_HEADERS.length;
  const widths = isDetail ? DETAIL_COLUMN_WIDTHS : SUMMARY_COLUMN_WIDTHS;
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
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2,
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
    const headers = Array.from(ACS_SUMMARY_PDF_HEADERS);
    for (let c = 0; c < headers.length; c++) {
      const cell = sheet.getCell(row, c + 1);
      cell.value = headers[c]!;
      cell.font = { bold: true, size: 8, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      cell.border = thinBorder;
      cell.alignment = {
        vertical: 'middle',
        horizontal: c === 0 ? 'center' : c === 2 ? 'right' : 'left',
        wrapText: true,
      };
    }
    sheet.getRow(row).height = 18;
    row += 1;

    const compactRows = buildAcsSummaryCompactRows(
      opts.summaryRows,
      opts.grandTotals,
      opts.totalReceipts
    );
    for (const compact of compactRows) {
      const values = acsSummaryPdfCompactRow(compact);
      const isTotal = Boolean(compact.isTotal);
      for (let c = 0; c < colCount; c++) {
        const cell = sheet.getCell(row, c + 1);
        const marks = !isTotal && c === 4 ? compact.shiftMarks : undefined;
        if (marks?.length) {
          cell.value = shiftMarksRichText(marks);
        } else {
          cell.value = cellValue(values[c]);
          cell.numFmt = '@';
          cell.font = { size: 8, name: 'Arial', bold: isTotal };
        }
        cell.border = thinBorder;
        cell.alignment = {
          vertical: 'top',
          horizontal: c === 0 ? 'center' : c === 2 ? 'right' : 'left',
          wrapText: true,
        };
        if (isTotal) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
        }
      }
      sheet.getRow(row).height = Math.max(72, (compact.shiftMarks?.length ?? 0) * 14);
      row += 1;
    }
  } else {
    const headers = Array.from(ACS_DETAIL_PDF_HEADERS);
    for (let c = 0; c < headers.length; c++) {
      const cell = sheet.getCell(row, c + 1);
      cell.value = headers[c]!;
      cell.font = { bold: true, size: 8, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      cell.border = thinBorder;
      cell.alignment = {
        vertical: 'middle',
        horizontal: c === 0 ? 'center' : c === 3 ? 'right' : 'left',
        wrapText: true,
      };
    }
    sheet.getRow(row).height = 18;
    row += 1;

    const compactRows = buildAcsDetailCompactRows(
      opts.detailRows,
      opts.grandTotals,
      opts.totalReceipts
    );
    for (const compact of compactRows) {
      const values = acsDetailPdfCompactRow(compact);
      const isUserTotal = Boolean(compact.isUserTotal);
      const isGrandTotal = Boolean(compact.isGrandTotal);
      const isHighlight = isUserTotal || isGrandTotal;

      if (isUserTotal || isGrandTotal) {
        sheet.mergeCells(row, 2, row, 3);
      }

      for (let c = 0; c < colCount; c++) {
        const cell = sheet.getCell(row, c + 1);
        const raw =
          isUserTotal || isGrandTotal
            ? c === 0
              ? compact.no
              : c === 1
                ? compact.user
                : c === 2
                  ? null
                  : c === 3
                    ? compact.receipts
                    : c === 4
                      ? compact.payments
                      : null
            : values[c];
        const marks = !isHighlight && c === 5 ? compact.shiftMarks : undefined;
        if (marks?.length) {
          cell.value = shiftMarksRichText(marks);
        } else {
          cell.value = cellValue(raw);
          cell.numFmt = '@';
          cell.font = { size: 8, name: 'Arial', bold: isHighlight };
        }
        cell.border = thinBorder;
        cell.alignment = {
          vertical: 'top',
          horizontal: c === 0 ? 'center' : c === 3 ? 'right' : 'left',
          wrapText: true,
        };
        if (isGrandTotal) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
        } else if (isUserTotal) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } };
        }
      }
      sheet.getRow(row).height = Math.max(72, (compact.shiftMarks?.length ?? 0) * 14);
      row += 1;
    }
  }

  row += 1;
  sheet.mergeCells(`A${row}:${lastCol}${row}`);
  sheet.getCell(row, 1).value = `Generated: ${opts.generatedAt}`;
  sheet.getCell(row, 1).font = { size: 8, name: 'Arial', color: { argb: 'FF555555' } };

  sheet.pageSetup.printArea = `A1:${lastCol}${row}`;
  sheet.pageSetup.paperSize = 9;
  sheet.pageSetup.orientation = 'portrait';
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0;

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
}
