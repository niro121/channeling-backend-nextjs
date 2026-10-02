'use client';

/**
 * Room Occupancy — Excel ONLY (landscape hour grid matching Print).
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { RoomOccupancyReportExportRow } from '@/types/reports/room-occupancy';
import {
  ROOM_OCCUPANCY_HOURS,
  ROOM_OCCUPANCY_PDF_HEADERS,
  roomOccupancyGroupKey,
  roomOccupancyGroupTitle,
  roomOccupancyIsHourBooked,
} from './room-occupancy-export-config';

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

const COL_COUNT = ROOM_OCCUPANCY_PDF_HEADERS.length;
/** Wider hour cols so yellow/empty slots read like PDF dots */
const COLUMN_WIDTHS = [12, ...ROOM_OCCUPANCY_HOURS.map(() => 4.2), 11];

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF999999' } },
  left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  bottom: { style: 'thin', color: { argb: 'FF999999' } },
};

const headerBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
};

function hourCellBorder(hourIndex: number): Partial<ExcelJS.Borders> {
  if (hourIndex > 0 && hourIndex % 6 === 0) {
    return {
      ...thinBorder,
      left: { style: 'medium', color: { argb: 'FF000000' } },
    };
  }
  return thinBorder;
}

export type DownloadRoomOccupancyExcelOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: RoomOccupancyReportExportRow[];
  fileName?: string;
  sheetName?: string;
};

export async function downloadRoomOccupancyReportExcel({
  reportName,
  summaryItems,
  generatedAt,
  rows,
  fileName = 'room-occupancy-report.xlsx',
  sheetName = 'Room Occupancy',
}: DownloadRoomOccupancyExcelOptions): Promise<void> {
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
      orientation: 'landscape',
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
    sheet.getColumn(i + 1).width = COLUMN_WIDTHS[i] ?? 4;
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

  sheet.mergeCells(`A${row}:${lastCol}${row}`);
  sheet.getCell(row, 1).value =
    'Yellow square = Booked    Empty square = Free    Hours 00-23 · blocks every 6 hours';
  sheet.getCell(row, 1).font = { size: 8, name: 'Arial' };
  sheet.getRow(row).height = 14;
  row += 2;

  const groups = new Map<string, RoomOccupancyReportExportRow[]>();
  for (const item of rows) {
    const key = roomOccupancyGroupKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  let firstHeaderRow: number | null = null;

  for (const [, groupRows] of groups.entries()) {
    const groupTitle = roomOccupancyGroupTitle(groupRows[0]!);
    sheet.mergeCells(row, 1, row, colCount);
    for (let c = 1; c <= colCount; c++) {
      const cell = sheet.getCell(row, c);
      cell.border = headerBorder;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECECEC' } };
    }
    sheet.getCell(row, 1).value = groupTitle;
    sheet.getCell(row, 1).font = { bold: true, size: 9, name: 'Arial' };
    sheet.getCell(row, 1).alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.getRow(row).height = 18;
    row += 1;

    const headerRow = row;
    if (firstHeaderRow == null) firstHeaderRow = headerRow;
    for (let c = 0; c < COL_COUNT; c++) {
      const cell = sheet.getCell(headerRow, c + 1);
      // Keep hour labels as text ("00") — Excel otherwise coerces to numbers 0,1,2…
      cell.numFmt = '@';
      cell.value = String(ROOM_OCCUPANCY_PDF_HEADERS[c]);
      cell.font = { bold: true, size: 7, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
      cell.border =
        c >= 1 && c <= 24 ? hourCellBorder(c - 1) : headerBorder;
      cell.alignment = {
        vertical: 'middle',
        horizontal: c === 0 ? 'left' : c === COL_COUNT - 1 ? 'right' : 'center',
        wrapText: true,
      };
    }
    sheet.getRow(headerRow).height = 16;
    row += 1;

    for (const item of groupRows) {
      const dataRow = sheet.getRow(row);
      const dateCell = dataRow.getCell(1);
      const rawDate = String(item.date ?? '').trim();
      const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(rawDate);
      dateCell.numFmt = '@';
      dateCell.value = dateMatch
        ? `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]!.slice(2)}`
        : rawDate || '-';
      dateCell.font = { bold: true, size: 8, name: 'Arial' };
      dateCell.border = thinBorder;
      dateCell.alignment = { vertical: 'middle', horizontal: 'left' };

      for (let h = 0; h < 24; h++) {
        const booked = roomOccupancyIsHourBooked(item, h);
        const cell = dataRow.getCell(h + 2);
        // Match PDF body: no text glyphs (avoids Helvetica/Excel symbol garbage).
        // Booked = yellow square fill; Free = empty white square.
        cell.numFmt = '@';
        cell.value = null;
        cell.border = hourCellBorder(h);
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: booked ? 'FFF6D060' : 'FFFFFFFF' },
        };
      }

      const bookedCell = dataRow.getCell(colCount);
      const bookedText = String(item.bookedHours ?? '').trim();
      const bookedNum = parseFloat(bookedText.replace(/,/g, ''));
      bookedCell.value = Number.isFinite(bookedNum) ? bookedNum : bookedText || 0;
      if (typeof bookedCell.value === 'number') bookedCell.numFmt = '0.00';
      bookedCell.font = { bold: true, size: 8, name: 'Arial' };
      bookedCell.border = thinBorder;
      bookedCell.alignment = { vertical: 'middle', horizontal: 'right' };

      dataRow.height = 18;
      row += 1;
    }

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
    sheet.pageSetup.printTitlesRow = `${firstHeaderRow}:${firstHeaderRow}`;
  }

  sheet.pageSetup.printArea = `A1:${lastCol}${row}`;
  sheet.pageSetup.paperSize = 9;
  sheet.pageSetup.orientation = 'landscape';
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0;

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
}
