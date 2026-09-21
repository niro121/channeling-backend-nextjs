'use client';

/**
 * Agent Wise Appointments — Excel ONLY (A4 portrait, matches Print / PDF).
 * Summary: flat month table. Detail: compact categorized columns.
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  RUHUNU_HOSPITAL_LOGO_SRC,
  RUHUNU_PRINT_BRAND_NAME,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';
import type {
  AgentWiseAppointmentsDetailRow,
  AgentWiseAppointmentsMonthColumn,
  AgentWiseAppointmentsSummaryRow,
} from '@/types/reports/agent-wise-appointments';
import {
  AWA_DETAIL_PDF_HEADERS,
  awaDetailPdfCompactRow,
  buildAwaDetailCompactRows,
  buildAwaSummaryPdfBody,
  buildAwaSummaryPdfHeaders,
} from './agent-wise-appointments-export-config';

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

/** Detail widths ~ AWA_DETAIL_PDF_COL_PERCENTS */
const DETAIL_COLUMN_WIDTHS = [5, 18, 16, 14, 14, 16, 14, 18];

function summaryColumnWidths(monthCount: number): number[] {
  const nameW = 28;
  const codeW = 12;
  const totalW = 12;
  const monthW = monthCount > 0 ? Math.max(8, Math.min(12, Math.floor(40 / monthCount))) : 10;
  return [nameW, codeW, ...Array.from({ length: monthCount }, () => monthW), totalW];
}

type CommonOpts = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  fileName?: string;
  sheetName?: string;
};

export type DownloadAwaSummaryExcelOptions = CommonOpts & {
  mode: 'summary';
  monthColumns: AgentWiseAppointmentsMonthColumn[];
  summaryRows: AgentWiseAppointmentsSummaryRow[];
  summaryMonthTotals: Record<string, number>;
  summaryGrandTotal: number;
};

export type DownloadAwaDetailExcelOptions = CommonOpts & {
  mode: 'detail';
  detailRows: AgentWiseAppointmentsDetailRow[];
  detailTotals: {
    hospitalFee: number;
    doctorFee: number;
    discount: number;
    totalFee: number;
  };
};

export type DownloadAgentWiseAppointmentsExcelOptions =
  | DownloadAwaSummaryExcelOptions
  | DownloadAwaDetailExcelOptions;

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

function cellValue(raw: string | undefined | null): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  return raw;
}

export async function downloadAgentWiseAppointmentsReportExcel(
  opts: DownloadAgentWiseAppointmentsExcelOptions
): Promise<void> {
  const fileName = opts.fileName ?? 'agent-wise-appointments-report.xlsx';
  const safeSheetName = (opts.sheetName || 'Agent Wise Appointments')
    .replace(/[:\\/?*\[\]]/g, ' ')
    .slice(0, 31);

  const isDetail = opts.mode === 'detail';
  const colCount = isDetail
    ? AWA_DETAIL_PDF_HEADERS.length
    : buildAwaSummaryPdfHeaders(opts.monthColumns).length;
  const widths = isDetail
    ? DETAIL_COLUMN_WIDTHS
    : summaryColumnWidths(opts.monthColumns.length);
  const lastCol = colLetter(colCount);

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
    const headers = buildAwaSummaryPdfHeaders(opts.monthColumns);
    for (let c = 0; c < headers.length; c++) {
      const cell = sheet.getCell(row, c + 1);
      cell.value = headers[c]!;
      cell.font = { bold: true, size: 8, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      cell.border = thinBorder;
      cell.alignment = {
        vertical: 'middle',
        horizontal: c >= 2 ? 'right' : 'left',
        wrapText: true,
      };
    }
    sheet.getRow(row).height = 18;
    row += 1;

    const body = buildAwaSummaryPdfBody(
      opts.summaryRows,
      opts.monthColumns,
      opts.summaryMonthTotals,
      opts.summaryGrandTotal
    );

    for (let i = 0; i < body.length; i++) {
      const values = body[i]!;
      const isTotal = i === body.length - 1;
      for (let c = 0; c < colCount; c++) {
        const cell = sheet.getCell(row, c + 1);
        cell.value = cellValue(values[c]);
        cell.numFmt = '@';
        cell.font = { size: 8, name: 'Arial', bold: isTotal };
        cell.border = thinBorder;
        cell.alignment = {
          vertical: 'middle',
          horizontal: c >= 2 ? 'right' : 'left',
          wrapText: true,
        };
        if (isTotal) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
        }
      }
      sheet.getRow(row).height = 16;
      row += 1;
    }
  } else {
    const headers = Array.from(AWA_DETAIL_PDF_HEADERS);
    for (let c = 0; c < headers.length; c++) {
      const cell = sheet.getCell(row, c + 1);
      cell.value = headers[c]!;
      cell.font = { bold: true, size: 8, name: 'Arial' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E8E8' } };
      cell.border = thinBorder;
      cell.alignment = {
        vertical: 'middle',
        horizontal: c === 0 ? 'center' : 'left',
        wrapText: true,
      };
    }
    sheet.getRow(row).height = 18;
    row += 1;

    const compactRows = buildAwaDetailCompactRows(opts.detailRows, opts.detailTotals);
    for (const compact of compactRows) {
      const values = awaDetailPdfCompactRow(compact);
      const isTotal = Boolean(compact.isTotal);

      if (isTotal) {
        sheet.mergeCells(row, 2, row, 7);
      }

      for (let c = 0; c < colCount; c++) {
        const cell = sheet.getCell(row, c + 1);
        const raw = isTotal
          ? c === 0
            ? compact.no
            : c === 1
              ? 'Total'
              : c === 7
                ? compact.fees
                : null
          : values[c];
        cell.value = cellValue(raw);
        cell.numFmt = '@';
        cell.font = { size: 8, name: 'Arial', bold: isTotal };
        cell.border = thinBorder;
        cell.alignment = {
          vertical: 'top',
          horizontal: c === 0 ? 'center' : 'left',
          wrapText: true,
        };
        if (isTotal) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F3F3' } };
        }
      }
      sheet.getRow(row).height = isTotal ? 48 : 52;
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
