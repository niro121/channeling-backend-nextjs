import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const formatExportFileName = (componentName: string): string => {
  if (!componentName) {
    return 'Report - Ruhunu Hospital';
  }

  const nameWithoutExt = componentName.replace(/\.(pdf|xlsx)$/i, '');
  const formattedName = nameWithoutExt
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return `${formattedName} - Ruhunu Hospital`;
};

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
    useHorizontalPageBreak: isWide,
  };
};

export const downloadPdfUtil = <T>({
  title = 'Report',
  data,
  columns,
  keys,
  fileName = 'report.pdf',
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
      overflow: 'linebreak',
    },
    headStyles: { overflow: 'linebreak', fontSize: layout.headFontSize, fillColor: '#317D5A' },
    horizontalPageBreak: layout.useHorizontalPageBreak,
    horizontalPageBreakRepeat: layout.useHorizontalPageBreak ? [0] : undefined,
  });

  doc.save(fileName);
};

type PrintPdfOptions<T> = {
  title?: string;
  data: T[];
  columns: string[];
  keys: (keyof T)[];
};

export const printPdfUtil = <T>({ title = 'Report', data, columns, keys }: PrintPdfOptions<T>) => {
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
      overflow: 'linebreak',
    },
    headStyles: { overflow: 'linebreak', fontSize: layout.headFontSize, fillColor: '#317D5A' },
    horizontalPageBreak: layout.useHorizontalPageBreak,
    horizontalPageBreakRepeat: layout.useHorizontalPageBreak ? [0] : undefined,
  });

  const jsDoc = doc as { autoPrint?: (opts: { variant: string }) => void };
  if (typeof jsDoc.autoPrint === 'function') {
    jsDoc.autoPrint({ variant: 'non-conform' });
  }
  window.open(doc.output('bloburl'), '_blank');
};

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
  title,
}: DownloadExcelOptions<T>) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title);

  sheet.columns = columns.map((column, index) => ({
    header: column,
    key: keys[index] as string,
    width: 20,
  }));

  data.forEach((item) => {
    const row: Record<string, unknown> = {};
    keys.forEach((key) => {
      row[key as string] = item[key];
    });
    sheet.addRow(row);
  });

  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), fileName);
};
