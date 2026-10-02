'use client';

/**
 * Channel Schedule with Charges — Excel ONLY (grouped columns matching Print).
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { ChannelScheduleWithChargesReportExportRow } from '@/types/reports/channel-schedule-with-charges';
import {
  CHANNEL_SCHEDULE_EXPORT_GROUPS,
  channelScheduleExportCellValue,
} from './channel-schedule-with-charges-export-config';

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

const COLUMN_WIDTHS = [
  22, // Doctor
  18, 10, 14, // Session
  14, 14, // Time
  12, 12, // Schedule
  11, 11, 11, 10, 11, 12, 10, 12, // Local fees
  11, 11, 11, 10, 11, 12, 10, 12, // Foreign fees
  10, 10, 16, 10, 12, 10, // Capacity / Flags
];

export type DownloadChannelScheduleWithChargesExcelOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: ChannelScheduleWithChargesReportExportRow[];
  fileName?: string;
  sheetName?: string;
};

export async function downloadChannelScheduleWithChargesReportExcel({
  reportName,
  summaryItems,
  generatedAt,
  rows,
  fileName = 'channel-schedule-with-charges.xlsx',
  sheetName = 'Schedule Charges',
}: DownloadChannelScheduleWithChargesExcelOptions): Promise<void> {
  const colCount = CHANNEL_SCHEDULE_EXPORT_GROUPS.reduce((n, g) => n + g.columns.length, 0);
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
    sheet.getColumn(i + 1).width = COLUMN_WIDTHS[i] ?? 11;
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

  const groupHeaderRow = row;
  let colIndex = 1;
  for (const group of CHANNEL_SCHEDULE_EXPORT_GROUPS) {
    const span = group.columns.length;
    const start = colIndex;
    const end = colIndex + span - 1;
    if (end > start) sheet.mergeCells(groupHeaderRow, start, groupHeaderRow, end);
    const cell = sheet.getCell(groupHeaderRow, start);
    cell.value = group.title.toUpperCase();
    cell.font = { bold: true, size: 8, name: 'Arial' };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
    for (let c = start; c <= end; c++) {
      sheet.getCell(groupHeaderRow, c).border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
        bottom: { style: 'thin' },
      };
      if (c !== start) {
        sheet.getCell(groupHeaderRow, c).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F0F0' },
        };
      }
    }
    colIndex += span;
  }
  sheet.getRow(groupHeaderRow).height = 16;
  row += 1;

  const fieldHeaderRow = row;
  colIndex = 1;
  for (const group of CHANNEL_SCHEDULE_EXPORT_GROUPS) {
    for (const col of group.columns) {
      const cell = sheet.getCell(fieldHeaderRow, colIndex);
      cell.value = col.header;
      cell.font = { bold: true, size: 8, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
        bottom: { style: 'thin' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      colIndex += 1;
    }
  }
  sheet.getRow(fieldHeaderRow).height = 28;
  row += 1;

  const dataStartRow = row;
  for (const item of rows) {
    const dataRow = sheet.getRow(row);
    colIndex = 1;
    for (const group of CHANNEL_SCHEDULE_EXPORT_GROUPS) {
      for (const col of group.columns) {
        const cell = dataRow.getCell(colIndex);
        const value = channelScheduleExportCellValue(item, col.key);
        cell.value = value;
        cell.font = { size: 8, name: 'Arial' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
          bottom: { style: 'thin' },
        };
        cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
        colIndex += 1;
      }
    }
    dataRow.height = 18;
    row += 1;
  }
  const dataEndRow = row - 1;

  row += 1;
  sheet.mergeCells(`A${row}:${lastCol}${row}`);
  sheet.getCell(row, 1).value = `Generated: ${generatedAt}`;
  sheet.getCell(row, 1).font = { size: 8, name: 'Arial', color: { argb: 'FF555555' } };

  if (rows.length > 0 && dataEndRow >= dataStartRow) {
    sheet.autoFilter = {
      from: { row: fieldHeaderRow, column: 1 },
      to: { row: dataEndRow, column: colCount },
    };
  }
  sheet.views = [
    {
      state: 'frozen',
      xSplit: 0,
      ySplit: fieldHeaderRow,
      topLeftCell: `A${fieldHeaderRow + 1}`,
      activeCell: `A${fieldHeaderRow + 1}`,
      showGridLines: false,
    },
  ];

  sheet.pageSetup.printArea = `A1:${lastCol}${row}`;
  sheet.pageSetup.printTitlesRow = `${groupHeaderRow}:${fieldHeaderRow}`;
  sheet.pageSetup.paperSize = 9;
  sheet.pageSetup.orientation = 'portrait';
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0;

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
}
