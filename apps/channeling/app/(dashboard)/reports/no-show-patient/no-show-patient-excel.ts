'use client';

/**
 * No Show Patient — Excel body only.
 * Same grouped tables as print/PDF: month band, day numbers, then the next date range.
 * The shared branded workbook header stays unchanged.
 */

import {
  downloadBrandedReportExcel,
  type BrandedExcelHeaderCell,
  type BrandedExcelTableSection,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** Same day count as the print tables (A4 landscape content / 8mm). */
const PERIODS_PER_TABLE = 23;

type PeriodCol = { key: string; label: string };

export type DownloadNoShowPatientReportExcelOptions = {
  reportName: string;
  summaryItems: BrandedPdfSummaryItem[];
  generatedAt: string;
  data: Record<string, string>[];
  columns: string[];
  keys: string[];
  fileName?: string;
  sheetName?: string;
};

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

function dayHeading(col: PeriodCol): string {
  const parts = dateParts(col.key);
  if (!parts) return col.label;
  return String(parts.day);
}

function chunkPeriods(periods: PeriodCol[]): PeriodCol[][] {
  if (periods.length === 0) return [[]];
  const chunks: PeriodCol[][] = [];
  for (let i = 0; i < periods.length; i += PERIODS_PER_TABLE) {
    chunks.push(periods.slice(i, i + PERIODS_PER_TABLE));
  }
  return chunks;
}

function monthGroups(chunk: PeriodCol[]): { title: string; span: number }[] {
  const groups: { title: string; span: number }[] = [];
  let index = 0;
  while (index < chunk.length) {
    const title = monthBandTitle(chunk[index]!.key) ?? chunk[index]!.label;
    let span = 1;
    while (
      index + span < chunk.length &&
      (monthBandTitle(chunk[index + span]!.key) ?? chunk[index + span]!.label) === title
    ) {
      span += 1;
    }
    groups.push({ title, span });
    index += span;
  }
  return groups;
}

function cellNumber(value: string | undefined): string | number | null {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function headerRowsFor(chunk: PeriodCol[], useDayGrid: boolean): BrandedExcelHeaderCell[][] {
  if (!useDayGrid) {
    return [
      [
        { value: 'Speciality', align: 'left' },
        { value: 'Doctor Name', align: 'left' },
        ...chunk.map((col) => ({ value: col.label, align: 'center' as const })),
        { value: 'Total', align: 'center' as const },
      ],
    ];
  }

  const top: BrandedExcelHeaderCell[] = [
    { value: 'Speciality', rowSpan: 2, align: 'left' },
    { value: 'Doctor Name', rowSpan: 2, align: 'left' },
  ];
  for (const group of monthGroups(chunk)) {
    top.push({ value: group.title, colSpan: group.span, align: 'center' });
  }
  top.push({ value: 'Total', rowSpan: 2, align: 'center' });
  return [top, chunk.map((col) => ({ value: dayHeading(col), align: 'center' as const }))];
}

function columnWidths(colCount: number, useDayGrid: boolean): number[] {
  const widths = [22, 30];
  const periodCount = Math.max(0, colCount - 3);
  const periodWidth = useDayGrid ? 4.2 : 16;
  for (let i = 0; i < periodCount; i += 1) widths.push(periodWidth);
  widths.push(10);
  return widths.slice(0, Math.max(colCount, 3));
}

export function buildNoShowPatientExcelSections(
  data: Record<string, string>[],
  columns: string[],
  keys: string[]
): { sections: BrandedExcelTableSection[]; columnWidths: number[] } {
  const periodKeys = keys.slice(2, -1);
  const periodLabels = columns.slice(2, -1);
  const periods: PeriodCol[] = periodKeys.map((key, index) => ({
    key,
    label: periodLabels[index] ?? key,
  }));
  const useDayGrid = periods.length > 0 && periods.every((col) => dateParts(col.key) != null);
  const chunks = periods.length === 0 ? [[]] : chunkPeriods(periods);

  const sections: BrandedExcelTableSection[] = chunks.map((chunk) => {
    const leafColumns = ['Speciality', 'Doctor Name', ...chunk.map((col) => col.label), 'Total'];
    return {
      columns: leafColumns,
      headerRows: headerRowsFor(chunk, useDayGrid),
      valueAlign: 'center',
      body: data.map((row) => [
        row.speciality ?? '',
        row.doctorName ?? '',
        ...chunk.map((col) => cellNumber(row[col.key])),
        cellNumber(row.total),
      ]),
    };
  });

  const widest = Math.max(3, ...sections.map((section) => section.columns.length));
  return { sections, columnWidths: columnWidths(widest, useDayGrid) };
}

export async function downloadNoShowPatientReportExcel({
  reportName,
  summaryItems,
  generatedAt,
  data,
  columns,
  keys,
  fileName = 'no-show-patient-report.xlsx',
  sheetName = 'No Show Patient',
}: DownloadNoShowPatientReportExcelOptions): Promise<void> {
  const built = buildNoShowPatientExcelSections(data, columns, keys);
  await downloadBrandedReportExcel({
    reportName,
    summaryItems,
    generatedAt,
    sections: built.sections,
    columnWidths: built.columnWidths,
    fileName,
    sheetName,
    orientation: 'landscape',
  });
}
