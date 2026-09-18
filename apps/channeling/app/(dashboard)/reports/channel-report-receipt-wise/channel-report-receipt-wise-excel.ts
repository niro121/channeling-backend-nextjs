'use client';

/**
 * Receipt Report — Excel ONLY (compact body matching Print/PDF).
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { ChannelReportReceiptWiseExportRow } from '@/types/reports/channel-report-receipt-wise';
import {
  RECEIPT_REPORT_PDF_HEADERS,
  parseReceiptAmountTotal,
  receiptReportGroupTitle,
  receiptReportPdfCompactRow,
} from './channel-report-receipt-wise-export-config';

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
  top: { style: 'thin', color: { argb: 'FF999999' } },
  left: { style: 'thin', color: { argb: 'FFBBBBBB' } },
  right: { style: 'thin', color: { argb: 'FFBBBBBB' } },
  bottom: { style: 'thin', color: { argb: 'FF999999' } },
};

const headerBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
};

/** Match Print/PDF column bands: Receipt, Payment, Amounts, Session, Patient/Parties, Audit */
const COLUMN_WIDTHS = [18, 18, 14, 24, 26, 18];
const COL_COUNT = RECEIPT_REPORT_PDF_HEADERS.length;

function estimateRowHeight(cells: string[]): number {
  const maxLines = Math.max(1, ...cells.map((c) => c.split('\n').length));
  return Math.max(28, 12 + maxLines * 11);
}

export type DownloadReceiptReportExcelOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: ChannelReportReceiptWiseExportRow[];
  fileName?: string;
  sheetName?: string;
};

export async function downloadReceiptReportExcel({
  reportName,
  summaryItems,
  generatedAt,
  rows,
  fileName = 'receipt-report.xlsx',
  sheetName = 'Receipt Report',
}: DownloadReceiptReportExcelOptions): Promise<void> {
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
        left: 0.25,
        right: 0.25,
        top: 0.35,
        bottom: 0.35,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

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
  summaryTitle.border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    right: { style: 'thin' },
    bottom: { style: 'thin' },
  };
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

  const groups = new Map<string, ChannelReportReceiptWiseExportRow[]>();
  for (const item of rows) {
    const key = receiptReportGroupTitle(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  let amountTotal = 0;
  let whtTotal = 0;
  let netTotal = 0;
  for (const item of rows) {
    amountTotal += parseReceiptAmountTotal(item, 'receiptAmount');
    whtTotal += parseReceiptAmountTotal(item, 'whdAmount');
    netTotal += parseReceiptAmountTotal(item, 'netAmount');
  }

  let firstHeaderRow: number | null = null;

  for (const [groupTitle, groupRows] of groups.entries()) {
    sheet.mergeCells(row, 1, row, colCount);
    const groupCell = sheet.getCell(row, 1);
    groupCell.value = groupTitle;
    groupCell.font = { bold: true, size: 9, name: 'Arial' };
    groupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECECEC' } };
    groupCell.alignment = { vertical: 'middle', horizontal: 'left' };
    for (let c = 1; c <= colCount; c++) {
      sheet.getCell(row, c).border = headerBorder;
      sheet.getCell(row, c).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFECECEC' },
      };
    }
    sheet.getRow(row).height = 18;
    row += 1;

    const headerRow = row;
    if (firstHeaderRow == null) firstHeaderRow = headerRow;
    for (let c = 0; c < COL_COUNT; c++) {
      const cell = sheet.getCell(headerRow, c + 1);
      cell.value = RECEIPT_REPORT_PDF_HEADERS[c];
      cell.font = { bold: true, size: 8, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
      cell.border = headerBorder;
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    }
    sheet.getRow(headerRow).height = 16;
    row += 1;

    for (const item of groupRows) {
      const cells = receiptReportPdfCompactRow(item);
      const dataRow = sheet.getRow(row);
      for (let c = 0; c < COL_COUNT; c++) {
        const cell = dataRow.getCell(c + 1);
        cell.value = cells[c] ?? '';
        cell.font = { size: 8, name: 'Arial' };
        cell.border = thinBorder;
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      }
      dataRow.height = estimateRowHeight(cells);
      row += 1;
    }

    row += 1;
  }

  if (rows.length > 0) {
    sheet.mergeCells(row, 1, row, colCount);
    const totalsTitle = sheet.getCell(row, 1);
    totalsTitle.value = 'Total';
    totalsTitle.font = { bold: true, size: 9, name: 'Arial' };
    totalsTitle.border = headerBorder;
    for (let c = 1; c <= colCount; c++) {
      sheet.getCell(row, c).border = headerBorder;
    }
    sheet.getRow(row).height = 16;
    row += 1;

    const totals = [
      { label: 'AMOUNT', value: amountTotal },
      { label: 'WHT', value: whtTotal },
      { label: 'NET AMOUNT', value: netTotal },
    ];
    for (let i = 0; i < 3; i++) {
      const labelCell = sheet.getCell(row, i * 2 + 1);
      const valueCell = sheet.getCell(row, i * 2 + 2);
      const t = totals[i]!;
      labelCell.value = t.label;
      labelCell.font = { bold: true, size: 7, name: 'Arial', color: { argb: 'FF444444' } };
      labelCell.alignment = { vertical: 'middle', horizontal: 'left' };
      valueCell.value = t.value;
      valueCell.numFmt = '#,##0.00';
      valueCell.font = { bold: true, size: 9, name: 'Arial' };
      valueCell.alignment = { vertical: 'middle', horizontal: 'left' };
      labelCell.border = headerBorder;
      valueCell.border = headerBorder;
    }
    sheet.getRow(row).height = 18;
    row += 1;
  }

  row += 1;
  sheet.mergeCells(`A${row}:${lastCol}${row}`);
  sheet.getCell(row, 1).value = `Generated: ${generatedAt}`;
  sheet.getCell(row, 1).font = { size: 8, name: 'Arial', color: { argb: 'FF555555' } };

  if (firstHeaderRow != null) {
    sheet.views = [
      {
        state: 'frozen',
        xSplit: 0,
        ySplit: firstHeaderRow,
        topLeftCell: `A${firstHeaderRow + 1}`,
        activeCell: `A${firstHeaderRow + 1}`,
        showGridLines: false,
      },
    ];
  }

  sheet.pageSetup.printArea = `A1:${lastCol}${row}`;
  if (firstHeaderRow != null) {
    sheet.pageSetup.printTitlesRow = `${firstHeaderRow}:${firstHeaderRow}`;
  }
  sheet.pageSetup.paperSize = 9;
  sheet.pageSetup.orientation = 'portrait';
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0;

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
}
