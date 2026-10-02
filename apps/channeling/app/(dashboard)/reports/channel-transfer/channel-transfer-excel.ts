'use client';

/**
 * Channel Transfer — Excel ONLY (portrait cards matching Print).
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { ChannelTransferReportExportRow } from '@/types/reports/channel-transfer';
import { mapChannelTransferCompactFromExportRow } from './channel-transfer-export-config';

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

/** Col A = label gutter; B–F = value (matches PDF 16mm + body). */
const COL_COUNT = 6;
const COLUMN_WIDTHS = [11, 20, 20, 20, 20, 20];
/** Approx printable chars across value merge (B–F). */
const VALUE_CHARS_PER_LINE = 88;

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
};

const labelFont: Partial<ExcelJS.Font> = {
  bold: true,
  size: 7,
  name: 'Arial',
  color: { argb: 'FF444444' },
};

function estimateRowHeight(
  text: string,
  charsPerLine = VALUE_CHARS_PER_LINE
): number {
  const raw = (text || '').trim() || ' ';
  const softLines = raw.split(/\n/).reduce((sum, part) => {
    return sum + Math.max(1, Math.ceil(Math.max(part.length, 1) / charsPerLine));
  }, 0);
  return Math.max(16, softLines * 13 + 4);
}

function applyOuterBorder(
  sheet: ExcelJS.Worksheet,
  fromRow: number,
  toRow: number,
  colCount: number
) {
  for (let r = fromRow; r <= toRow; r++) {
    for (let c = 1; c <= colCount; c++) {
      const cell = sheet.getCell(r, c);
      const border: Partial<ExcelJS.Borders> = { ...(cell.border ?? {}) };
      if (r === fromRow) border.top = { style: 'medium', color: { argb: 'FF000000' } };
      if (r === toRow) border.bottom = { style: 'medium', color: { argb: 'FF000000' } };
      if (c === 1) border.left = { style: 'medium', color: { argb: 'FF000000' } };
      if (c === colCount) border.right = { style: 'medium', color: { argb: 'FF000000' } };
      cell.border = border;
    }
  }
}

/** Label in A, value merged B→last — same gutter for every field. */
function writeLabeledValueRow(
  sheet: ExcelJS.Worksheet,
  row: number,
  opts: {
    label: string;
    value: string;
    colCount: number;
    valueFont?: Partial<ExcelJS.Font>;
    /** Courier / dense IDs need fewer chars per line for height estimate. */
    charsPerLine?: number;
  }
): number {
  const {
    label,
    value,
    colCount,
    valueFont,
    charsPerLine = VALUE_CHARS_PER_LINE,
  } = opts;

  const labelCell = sheet.getCell(row, 1);
  labelCell.value = label;
  labelCell.font = labelFont;
  labelCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: false };

  if (colCount > 2) {
    sheet.mergeCells(row, 2, row, colCount);
  }
  const valueCell = sheet.getCell(row, 2);
  valueCell.value = value || '-';
  valueCell.font = valueFont ?? { size: 8, name: 'Arial', color: { argb: 'FF000000' } };
  valueCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };

  sheet.getRow(row).height = estimateRowHeight(value, charsPerLine);
  return row + 1;
}

export type DownloadChannelTransferExcelOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: ChannelTransferReportExportRow[];
  fileName?: string;
  sheetName?: string;
};

export async function downloadChannelTransferReportExcel({
  reportName,
  summaryItems,
  generatedAt,
  rows,
  fileName = 'channel-transfer-report.xlsx',
  sheetName = 'Channel Transfer',
}: DownloadChannelTransferExcelOptions): Promise<void> {
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

  for (const item of rows) {
    const card = mapChannelTransferCompactFromExportRow(item);
    const cardStart = row;

    sheet.mergeCells(row, 1, row, colCount);
    sheet.getCell(row, 1).value = `${card.when}   ${card.by}`;
    sheet.getCell(row, 1).font = { bold: true, size: 9, name: 'Arial' };
    sheet.getCell(row, 1).alignment = { vertical: 'middle', horizontal: 'left' };
    sheet.getRow(row).height = 16;
    row += 1;

    // Thin rule under head (visual only)
    for (let c = 1; c <= colCount; c++) {
      const cell = sheet.getCell(row - 1, c);
      cell.border = {
        ...(cell.border ?? {}),
        bottom: { style: 'thin', color: { argb: 'FF999999' } },
      };
    }

    row = writeLabeledValueRow(sheet, row, {
      label: 'BOOKING',
      value: `${card.bookingId}\nReceipt: ${card.receiptId}\nRemarks: ${card.remarks}`,
      colCount,
      valueFont: { bold: true, size: 8, name: 'Courier New', color: { argb: 'FF000000' } },
      charsPerLine: 72,
    });

    row = writeLabeledValueRow(sheet, row, {
      label: 'FROM',
      value: card.fromLine,
      colCount,
      valueFont: { size: 8, name: 'Arial', color: { argb: 'FF000000' } },
      charsPerLine: 80,
    });

    row = writeLabeledValueRow(sheet, row, {
      label: 'TO',
      value: card.toLine,
      colCount,
      valueFont: { size: 8, name: 'Arial', color: { argb: 'FF000000' } },
      charsPerLine: 80,
    });

    const metaTop = card.meta
      .filter((f) => f.label === 'New Appt' || f.label === 'From Sess')
      .map((f) => `${f.label.toUpperCase()} ${f.value}`)
      .join('   ');
    const metaBottom = card.meta
      .filter((f) => f.label === 'To Sess' || f.label === 'To Doctor')
      .map((f) => `${f.label.toUpperCase()} ${f.value}`)
      .join('   ');

    row = writeLabeledValueRow(sheet, row, {
      label: 'META',
      value: metaTop,
      colCount,
      valueFont: { bold: true, size: 8, name: 'Courier New', color: { argb: 'FF000000' } },
      charsPerLine: 72,
    });

    // Second meta line: empty label so value stays in the same gutter
    row = writeLabeledValueRow(sheet, row, {
      label: '',
      value: metaBottom,
      colCount,
      valueFont: { bold: true, size: 8, name: 'Courier New', color: { argb: 'FF000000' } },
      charsPerLine: 72,
    });

    const cardEnd = row - 1;
    applyOuterBorder(sheet, cardStart, cardEnd, colCount);
    row += 2;
  }

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
