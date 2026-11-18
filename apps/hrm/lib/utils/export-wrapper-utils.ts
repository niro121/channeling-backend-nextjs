import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const formatExportFileName = (componentName: string): string => {
  if (!componentName) {
    return 'Report - Ruhunu Hospital';
  }

  // Remove file extension if present
  const nameWithoutExt = componentName.replace(/\.(pdf|xlsx)$/i, '');

  // Capitalize first letter of each word
  const formattedName = nameWithoutExt
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return `${formattedName} - Ruhunu Hospital`;
};

// ** EXCEL DOWNLOAD UTIL ** //
type DownloadExcelOptions<T> = {
  columns: string[];
  data: T[];
  keys: (keyof T)[];
  fileName?: string;
  title: string;
};

export const downloadExcelUtil = async <T>({
  columns,
  data,
  keys,
  fileName = 'report.xlsx',
  title
}: DownloadExcelOptions<T>) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title);

  sheet.columns = columns.map((column, index) => ({
    header: column,
    key: keys[index] as string,
    width: 20
  }));

  data.forEach((item) => {
    const row: Record<string, any> = {};

    keys.forEach((key) => {
      row[key as string] = item[key];
    });

    sheet.addRow(row);
  });

  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
};

// ** PDF DOWNLOAD UTIL ** //
type DownloadPdfOptions<T> = {
  title?: string;
  data: T[];
  columns: string[];
  keys: (keyof T)[];
  fileName?: string;
};

const getPdfLayoutConfig = (columnCount: number) => {
  const isVeryWide = columnCount > 18;
  const isWide = columnCount > 12;

  return {
    format: 'a4' as const,
    margin: isWide ? 10 : 14,
    fontSize: isVeryWide ? 6 : isWide ? 7 : 8,
    headFontSize: isVeryWide ? 6 : 7,
    cellPadding: isVeryWide ? 1.2 : 1.6,
    useHorizontalPageBreak: isWide
  };
};

export const downloadPdfUtil = <T>({
  title = 'Report',
  data,
  columns,
  keys,
  fileName = 'report.pdf'
}: DownloadPdfOptions<T>) => {
  const layout = getPdfLayoutConfig(columns.length);
  const doc = new jsPDF({ orientation: 'l', format: layout.format });
  const margin = layout.margin;
  const pageWidth =
    (typeof doc.internal.pageSize.getWidth === 'function'
      ? doc.internal.pageSize.getWidth()
      : doc.internal.pageSize.width) ?? 297;
  const tableWidth = pageWidth - margin * 2;

  doc.setFontSize(16);
  doc.text(title, margin, 20);

  const rows = data.map((item) =>
    keys.map((key) => {
      const value = item[key];
      return value !== undefined && value !== null ? String(value) : '-';
    })
  );

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 30,
    margin: { left: margin, right: margin },
    tableWidth,
    styles: {
      fontSize: layout.fontSize,
      cellPadding: layout.cellPadding,
      minCellWidth: 0,
      overflow: 'linebreak'
    },
    headStyles: {
      overflow: 'linebreak',
      fontSize: layout.headFontSize,
      fillColor: '#317D5A'
    },
    horizontalPageBreak: layout.useHorizontalPageBreak,
    horizontalPageBreakRepeat: layout.useHorizontalPageBreak ? [0] : undefined
  });

  doc.save(fileName);
};

// ** PDF PRINT UTIL ** //
type PrintPdfOptions<T> = {
  title?: string;
  data: T[];
  columns: string[];
  keys: (keyof T)[];
};

export const printPdfUtil = <T>({
  title = 'Report',
  data,
  columns,
  keys
}: PrintPdfOptions<T>) => {
  const layout = getPdfLayoutConfig(columns.length);
  const doc = new jsPDF({ orientation: 'l', format: layout.format });
  const margin = layout.margin;
  const pageWidth =
    (typeof doc.internal.pageSize.getWidth === 'function'
      ? doc.internal.pageSize.getWidth()
      : doc.internal.pageSize.width) ?? 297;
  const tableWidth = pageWidth - margin * 2;

  doc.setFontSize(16);
  doc.text(title, margin, 20);

  const rows = data.map((item) =>
    keys.map((key) => {
      const value = item[key];
      return value !== undefined && value !== null ? String(value) : '-';
    })
  );

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 30,
    margin: { left: margin, right: margin },
    tableWidth,
    styles: {
      fontSize: layout.fontSize,
      cellPadding: layout.cellPadding,
      minCellWidth: 0,
      overflow: 'linebreak'
    },
    headStyles: {
      overflow: 'linebreak',
      fontSize: layout.headFontSize,
      fillColor: '#317D5A'
    },
    horizontalPageBreak: layout.useHorizontalPageBreak,
    horizontalPageBreakRepeat: layout.useHorizontalPageBreak ? [0] : undefined
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsDoc = doc as any;
  if (typeof jsDoc.autoPrint === 'function') {
    jsDoc.autoPrint({ variant: 'non-conform' });
  }
  window.open(doc.output('bloburl'), '_blank');
};

// ==== PDF PRINT WITH HEADER HANDLE UTIL (title + custom header lines + table only) ==== //
type PrintPdfWithHeaderOptions<T> = {
  title?: string;
  headerLines?: string[];
  data: T[];
  columns: string[];
  keys: (keyof T)[];
};

/**
 * Generates a PDF with:
 * - Report title
 * - Custom header lines (e.g. session details with labels)
 * - Table only (autoTable) from provided data
 */
export const printPdfUtilWithHeader = <T>({
  title = 'Report',
  headerLines = [],
  data,
  columns,
  keys
}: PrintPdfWithHeaderOptions<T>) => {
  const doc = new jsPDF({ orientation: 'l' });
  const margin = 14;

  const pageWidth =
    (typeof doc.internal.pageSize.getWidth === 'function'
      ? doc.internal.pageSize.getWidth()
      : (doc.internal.pageSize as any).width) ?? 297;
  const tableWidth = pageWidth - margin * 2;

  // Title
  let y = 20;
  doc.setFontSize(16);
  doc.text(title, margin, y);
  y += 10;

  // Header lines (session details)
  if (headerLines?.length) {
    doc.setFontSize(11);
    for (const raw of headerLines) {
      const line = (raw ?? '').toString().trim();
      if (!line) continue;

      const split = doc.splitTextToSize(line, tableWidth);
      doc.text(split as any, margin, y);
      y += split.length * 6;
    }
    y += 4;
  }

  const rows = data.map((item) =>
    keys.map((key) => {
      const value = (item as any)?.[key];
      return value !== undefined && value !== null ? String(value) : '-';
    })
  );

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth,
    styles: { fontSize: 8, cellPadding: 2, minCellWidth: 0 },
    headStyles: { overflow: 'ellipsize', fontSize: 8, fillColor: '#317D5A' }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsDoc = doc as any;
  if (typeof jsDoc.autoPrint === 'function') {
    jsDoc.autoPrint({ variant: 'non-conform' });
  }
  window.open(doc.output('bloburl'), '_blank');
};
