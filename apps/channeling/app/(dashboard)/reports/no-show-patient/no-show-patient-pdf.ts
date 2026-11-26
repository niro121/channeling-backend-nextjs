'use client';

/**
 * No Show Patient — PDF body only.
 * Header and summary stay on the shared branded header.
 * Wide date grids are split into readable column groups so names and days
 * stay on normal lines instead of wrapping one letter at a time.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  drawBrandedPdfHeader,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const SPECIALITY_W = 36;
const DOCTOR_W = 48;
const TOTAL_W = 12;
/** Narrowest period column that still holds a two-digit count and a day number. */
const MIN_PERIOD_W = 8;
/** Extra width beyond this goes to the name columns so a short range does not look stretched. */
const MAX_PERIOD_W = 18;

type PdfCell = {
  content: string;
  colSpan?: number;
  rowSpan?: number;
  styles?: { halign?: 'left' | 'center' | 'right'; valign?: 'top' | 'middle' | 'bottom' };
};

type PeriodCol = { key: string; label: string };

export type DownloadNoShowPatientReportPdfOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  data: Record<string, string>[];
  columns: string[];
  keys: string[];
  fileName?: string;
};

function pageSize(doc: jsPDF): { width: number; height: number } {
  return {
    width: doc.internal.pageSize.getWidth(),
    height: doc.internal.pageSize.getHeight(),
  };
}

function drawFooter(doc: jsPDF, generatedAt: string, margin: number) {
  const { width: pageWidth, height: pageHeight } = pageSize(doc);
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const y = pageHeight - 6;
    doc.text(`Generated: ${generatedAt}`, margin, y);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, y, { align: 'right' });
  }
}

function dateParts(key: string): { year: string; monthIndex: number; day: number } | null {
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: match[1], monthIndex: Number(match[2]) - 1, day: Number(match[3]) };
}

function monthBandTitle(key: string): string | null {
  const parts = dateParts(key);
  if (!parts || parts.monthIndex < 0 || parts.monthIndex > 11) return null;
  return `${MONTHS[parts.monthIndex]} ${parts.year}`;
}

function dayHeading(key: string, label: string): string {
  const parts = dateParts(key);
  if (!parts) return label;
  return String(parts.day);
}

function chunkPeriods(periods: PeriodCol[], perChunk: number): PeriodCol[][] {
  if (periods.length === 0) return [[]];
  const size = Math.max(1, perChunk);
  const chunks: PeriodCol[][] = [];
  for (let i = 0; i < periods.length; i += size) {
    chunks.push(periods.slice(i, i + size));
  }
  return chunks;
}

function buildHead(chunk: PeriodCol[], useDayGrid: boolean): PdfCell[][] {
  const nameHead = (content: string): PdfCell => ({
    content,
    rowSpan: useDayGrid ? 2 : 1,
    styles: { halign: 'left', valign: 'middle' },
  });
  const totalHead: PdfCell = {
    content: 'Total',
    rowSpan: useDayGrid ? 2 : 1,
    styles: { halign: 'center', valign: 'middle' },
  };

  if (!useDayGrid) {
    return [[nameHead('Speciality'), nameHead('Doctor Name'), ...chunk.map((col) => ({ content: col.label, styles: { halign: 'center' as const, valign: 'middle' as const } })), totalHead]];
  }

  const top: PdfCell[] = [nameHead('Speciality'), nameHead('Doctor Name')];
  let index = 0;
  while (index < chunk.length) {
    const title = monthBandTitle(chunk[index]!.key) ?? chunk[index]!.label;
    let span = 1;
    while (index + span < chunk.length && (monthBandTitle(chunk[index + span]!.key) ?? chunk[index + span]!.label) === title) {
      span += 1;
    }
    top.push({ content: title, colSpan: span, styles: { halign: 'center', valign: 'middle' } });
    index += span;
  }
  top.push(totalHead);

  const days: PdfCell[] = chunk.map((col) => ({
    content: dayHeading(col.key, col.label),
    styles: { halign: 'center', valign: 'middle' },
  }));
  return [top, days];
}

function columnWidths(contentWidth: number, periodCount: number): number[] {
  const count = Math.max(periodCount, 0);
  const fixed = SPECIALITY_W + DOCTOR_W + TOTAL_W;
  const available = Math.max(0, contentWidth - fixed);
  let periodW = count === 0 ? 0 : available / count;
  let specialityW = SPECIALITY_W;
  let doctorW = DOCTOR_W;
  if (count > 0 && periodW > MAX_PERIOD_W) {
    const spare = available - MAX_PERIOD_W * count;
    periodW = MAX_PERIOD_W;
    specialityW += spare * 0.35;
    doctorW += spare * 0.65;
  }
  const widths = [
    specialityW,
    doctorW,
    ...Array.from({ length: count }, () => periodW),
    TOTAL_W,
  ];
  const sum = widths.reduce((total, width) => total + width, 0);
  widths[widths.length - 1] = (widths[widths.length - 1] ?? TOTAL_W) + (contentWidth - sum);
  return widths;
}

export async function downloadNoShowPatientReportPdf({
  reportName,
  summaryItems,
  generatedAt,
  data,
  columns,
  keys,
  fileName = 'no-show-patient-report.pdf',
}: DownloadNoShowPatientReportPdfOptions): Promise<void> {
  const margin = 10;
  const doc = new jsPDF({ orientation: 'l', format: 'a4' });
  const { width: pageWidth, height: pageHeight } = pageSize(doc);
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 12;

  const periodKeys = keys.slice(2, -1);
  const periodLabels = columns.slice(2, -1);
  const periods: PeriodCol[] = periodKeys.map((key, index) => ({
    key,
    label: periodLabels[index] ?? key,
  }));
  const useDayGrid = periods.length > 0 && periods.every((col) => dateParts(col.key) != null);
  const periodsPerChunk = Math.max(
    1,
    Math.min(periods.length || 1, Math.floor((contentWidth - SPECIALITY_W - DOCTOR_W - TOTAL_W) / MIN_PERIOD_W))
  );
  const chunks = periods.length === 0 ? [[]] : chunkPeriods(periods, periodsPerChunk);

  let y = await drawBrandedPdfHeader(doc, { reportName, summaryItems, margin });

  const drawChunk = (chunk: PeriodCol[]) => {
    const widths = columnWidths(contentWidth, chunk.length);
    const columnStyles: Record<number, { cellWidth: number; halign: 'left' | 'center' }> = {};
    widths.forEach((cellWidth, index) => {
      columnStyles[index] = {
        cellWidth,
        halign: index === 0 || index === 1 ? 'left' : 'center',
      };
    });

    const needed = useDayGrid ? 22 : 16;
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = margin;
    }

    autoTable(doc, {
      head: buildHead(chunk, useDayGrid),
      body: data.map((row) => [
        row.speciality ?? '',
        row.doctorName ?? '',
        ...chunk.map((col) => row[col.key] ?? ''),
        row.total ?? '',
      ]),
      startY: y,
      margin: { left: margin, right: margin, bottom: 12 },
      tableWidth: contentWidth,
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: { top: 1.15, right: 0.7, bottom: 1.15, left: 0.7 },
        overflow: 'linebreak',
        valign: 'middle',
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [232, 232, 232],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center',
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        overflow: 'linebreak',
      },
      bodyStyles: {
        fontStyle: 'normal',
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles,
      didParseCell: (hook) => {
        if (hook.section === 'head' && (hook.column.index === 0 || hook.column.index === 1)) {
          hook.cell.styles.halign = 'left';
        }
        if (hook.section === 'head' && useDayGrid && hook.row.index === 1) {
          hook.cell.styles.fontSize = 7.5;
        }
        if (hook.section !== 'body' || !Array.isArray(hook.row.raw)) return;
        const isTotal = hook.row.raw.some((cell) => String(cell ?? '').trim().toLowerCase() === 'total');
        if (!isTotal) return;
        hook.cell.styles.fontStyle = 'bold';
        hook.cell.styles.fillColor = [236, 236, 236];
      },
    });

    const last = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable;
    y = (last?.finalY ?? y) + 6;
  };

  for (const chunk of chunks) drawChunk(chunk);

  drawFooter(doc, generatedAt, margin);
  doc.save(fileName);
}
