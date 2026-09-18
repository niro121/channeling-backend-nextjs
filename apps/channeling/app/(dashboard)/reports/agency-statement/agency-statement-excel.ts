'use client';

/**
 * Agency Statement — Excel ONLY (A4 portrait, matches Print / PDF).
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { AgencyStatementReportData } from '@/types/reports/agency-statement';
import {
  AGENCY_STATEMENT_PDF_HEADERS,
  agencyStatementPdfCompactRow,
  buildAgencyStatementCompactRows,
} from './agency-statement-export-config';

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

const COL_COUNT = 6;
const COLUMN_WIDTHS = [8, 12, 28, 22, 12, 22];

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
};

export type DownloadAgencyStatementExcelOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  data: AgencyStatementReportData;
  periodFrom: string;
  fileName?: string;
  sheetName?: string;
};

export async function downloadAgencyStatementReportExcel({
  reportName,
  summaryItems,
  generatedAt,
  data,
  periodFrom,
  fileName = 'agency-statement.xlsx',
  sheetName = 'Agency Statement',
}: DownloadAgencyStatementExcelOptions): Promise<void> {
  const colCount = COL_COUNT;
  const lastCol = colLetter(colCount);
  const safeSheetName = (sheetName || 'Report').replace(/[:\\/?*\[\]]/g, ' ').slice(0, 31);

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

  // Widths only — never set column `key`s. Keyed columns + empty-string
  // values can produce corrupt/ghost numbers in Excel/Numbers.
  for (let i = 0; i < colCount; i++) {
    sheet.getColumn(i + 1).width = COLUMN_WIDTHS[i] ?? 14;
  }

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
  sheet.getCell(row, 1).border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } };
  row += 2;

  sheet.mergeCells(`A${row}:${lastCol}${row}`);
  const summaryTitle = sheet.getCell(row, 1);
  summaryTitle.value = 'REPORT SUMMARY';
  summaryTitle.font = { bold: true, size: 8, name: 'Arial' };
  summaryTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
  summaryTitle.border = thinBorder;
  sheet.getRow(row).height = 16;
  row += 1;

  const summaryStartRow = row;
  const summaryCols = 2;
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
    sheet.getCell(excelRow + 1, excelCol).font = { bold: true, size: 8, name: 'Arial' };
    itemCol += span;
  }

  const summaryRowsUsed = Math.max(2, itemRow + 2);
  const summaryEndRow = summaryStartRow + summaryRowsUsed - 1;
  for (let r = summaryStartRow; r <= summaryEndRow; r++) {
    for (let c = 1; c <= colCount; c++) {
      const cell = sheet.getCell(r, c);
      const border: Partial<ExcelJS.Borders> = { ...(cell.border ?? {}) };
      if (r === summaryStartRow) border.top = { style: 'thin' };
      if (r === summaryEndRow) border.bottom = { style: 'thin' };
      if (c === 1) border.left = { style: 'thin' };
      if (c === colCount) border.right = { style: 'thin' };
      cell.border = border;
    }
  }
  row = summaryEndRow + 2;

  const compactRows = buildAgencyStatementCompactRows(data, periodFrom);
  const headers = Array.from(AGENCY_STATEMENT_PDF_HEADERS);

  for (let c = 0; c < headers.length; c++) {
    const cell = sheet.getCell(row, c + 1);
    cell.value = headers[c]!.toUpperCase();
    cell.font = { bold: true, size: 8, name: 'Arial' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  }
  sheet.getRow(row).height = 16;
  row += 1;

  for (const compact of compactRows) {
    const values = agencyStatementPdfCompactRow(compact);
    const isBalanceRow = Boolean(compact.isOpening || compact.isClosing);

    // Closing: label spans No–Fees (print colspan); balance only in Balance col.
    const cellValues: Array<string | null> = compact.isClosing
      ? [compact.particulars, null, null, null, compact.balance, null]
      : values.map((v) => (v === undefined || v === null || v === '' ? null : v));

    if (compact.isClosing) {
      sheet.mergeCells(row, 1, row, 4);
    }

    for (let c = 0; c < colCount; c++) {
      const cell = sheet.getCell(row, c + 1);
      // Use null for blanks — empty string can ghost leftover numbers (e.g. "17").
      cell.value = cellValues[c] ?? null;
      cell.numFmt = '@';
      cell.font = {
        size: 8,
        name: 'Arial',
        bold: isBalanceRow || c === 0 || c === 4,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF999999' } },
        left: { style: 'thin', color: { argb: 'FFBBBBBB' } },
        right: { style: 'thin', color: { argb: 'FFBBBBBB' } },
        bottom: { style: 'thin', color: { argb: 'FF999999' } },
      };
      cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      if (isBalanceRow) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      }
    }
    sheet.getRow(row).height = isBalanceRow ? 28 : 48;
    row += 1;
  }

  row += 1;
  sheet.mergeCells(`A${row}:${lastCol}${row}`);
  sheet.getCell(row, 1).value = `Generated: ${generatedAt}`;
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
