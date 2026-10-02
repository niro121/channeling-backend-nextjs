'use client';

/**
 * Handovers Report — Excel ONLY (A4 portrait, matches Print / PDF).
 * Columns: No. | Parties | Methods (2-part) | Total | Status
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type { CompletedHandoversReportExportRow } from '@/types/reports/completed-handovers';

const HEADERS = ['No.', 'Parties', 'Methods', 'Total', 'Status'] as const;

/** ~ PDF COL_PERCENTS [5, 20, 30, 12, 33] */
const COLUMN_WIDTHS = [5, 22, 32, 12, 28];

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

function parseAmount(value: string | null | undefined): number {
  if (value == null || value === '') return 0;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(n: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function shortDate(value: string | undefined | null): string {
  if (!value || value === '-') return '—';
  return value.replace(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}):\d{2}$/, '$1');
}

type LabeledLine = { label: string; value: string };

function partiesLines(row: CompletedHandoversReportExportRow): LabeledLine[] {
  return [
    { label: 'From', value: row.fromUser || '—' },
    { label: 'To', value: row.toUser || '—' },
    { label: 'Shift', value: shortDate(row.shiftStartedAt) },
  ];
}

function statusLines(row: CompletedHandoversReportExportRow): LabeledLine[] {
  const lines: LabeledLine[] = [
    { label: 'Status', value: row.status || '—' },
    { label: 'Recon', value: row.reconciliationStatus || '—' },
    { label: 'Handed', value: shortDate(row.createdAt) },
    { label: 'Done', value: shortDate(row.completedAt) },
  ];
  const disc = (row.discrepancyReason || '').trim();
  if (disc && disc !== '-') {
    lines.push({ label: 'Disc', value: disc });
  }
  return lines;
}

function labeledRichText(lines: LabeledLine[]): ExcelJS.CellRichTextValue {
  const richText: ExcelJS.RichText[] = [];
  lines.forEach((line, i) => {
    if (i > 0) {
      richText.push({ text: '\n', font: { size: 8, name: 'Arial' } });
    }
    richText.push({
      text: `${line.label} `,
      font: { bold: true, size: 8, name: 'Arial' },
    });
    richText.push({
      text: line.value || '—',
      font: { size: 8, name: 'Arial' },
    });
  });
  return { richText };
}

function methodsText(row: {
  cash: string;
  card: string;
  slip: string;
  cheque: string;
  credit: string;
  eWallet: string;
}): string {
  const left = [
    `Cash ${row.cash}`,
    `Card ${row.card}`,
    `Slip ${row.slip}`,
    `Cheque ${row.cheque}`,
  ];
  const right = [`Credit ${row.credit}`, `E-wallet ${row.eWallet}`];
  const pad = 20;
  const lines: string[] = [];
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i += 1) {
    const L = (left[i] ?? '').padEnd(pad, ' ');
    const R = right[i] ?? '';
    lines.push(R ? `${L}${R}` : (left[i] ?? ''));
  }
  return lines.join('\n');
}

export type DownloadCompletedHandoversExcelOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  rows: CompletedHandoversReportExportRow[];
  fileName?: string;
  sheetName?: string;
};

export async function downloadCompletedHandoversReportExcel({
  reportName,
  summaryItems,
  generatedAt,
  rows,
  fileName = 'handovers-report.xlsx',
  sheetName = 'Handovers',
}: DownloadCompletedHandoversExcelOptions): Promise<void> {
  const colCount = HEADERS.length;
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
    sheet.getColumn(i + 1).width = COLUMN_WIDTHS[i] ?? 12;
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
  row = summaryEndRow + 2;

  for (let c = 0; c < HEADERS.length; c++) {
    const cell = sheet.getCell(row, c + 1);
    cell.value = HEADERS[c]!;
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

  const applyCellBase = (
    cell: ExcelJS.Cell,
    opts: {
      horizontal?: 'left' | 'right' | 'center';
      bold?: boolean;
      fill?: boolean;
    } = {}
  ) => {
    cell.numFmt = '@';
    cell.font = { size: 8, name: 'Arial', bold: opts.bold ?? false };
    cell.border = thinBorder;
    if (opts.fill) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
    }
    cell.alignment = {
      vertical: 'top',
      horizontal: opts.horizontal ?? 'left',
      wrapText: true,
    };
  };

  const totals = rows.reduce(
    (acc, r) => {
      acc.cash += parseAmount(r.cash);
      acc.card += parseAmount(r.card);
      acc.slip += parseAmount(r.slip);
      acc.cheque += parseAmount(r.cheque);
      acc.credit += parseAmount(r.credit);
      acc.eWallet += parseAmount(r.eWallet);
      acc.total += parseAmount(r.total);
      return acc;
    },
    { cash: 0, card: 0, slip: 0, cheque: 0, credit: 0, eWallet: 0, total: 0 }
  );

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    const parties = partiesLines(r);
    const status = statusLines(r);
    const values: Array<string | ExcelJS.CellRichTextValue> = [
      r.no || String(i + 1),
      labeledRichText(parties),
      methodsText(r),
      r.total || '0.00',
      labeledRichText(status),
    ];
    for (let c = 0; c < colCount; c++) {
      const cell = sheet.getCell(row, c + 1);
      cell.value = values[c]!;
      applyCellBase(cell, {
        horizontal: c === 0 ? 'center' : c === 3 ? 'right' : 'left',
        bold: c === 3,
      });
    }
    sheet.getRow(row).height = Math.max(56, Math.max(parties.length, status.length, 4) * 14);
    row += 1;
  }

  if (rows.length > 0) {
    const totalMethods = {
      cash: formatAmount(totals.cash),
      card: formatAmount(totals.card),
      slip: formatAmount(totals.slip),
      cheque: formatAmount(totals.cheque),
      credit: formatAmount(totals.credit),
      eWallet: formatAmount(totals.eWallet),
    };
    const totalValues = [
      '',
      'Total',
      methodsText(totalMethods),
      formatAmount(totals.total),
      '',
    ];
    for (let c = 0; c < colCount; c++) {
      const cell = sheet.getCell(row, c + 1);
      cell.value = totalValues[c]!;
      applyCellBase(cell, {
        horizontal: c === 0 ? 'center' : c === 3 ? 'right' : 'left',
        bold: true,
        fill: true,
      });
    }
    sheet.getRow(row).height = 56;
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
