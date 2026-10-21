'use client';

/**
 * Print-only body for No Show Patient.
 * Same column grouping as the PDF: month band, day numbers, then the next date range.
 * The shared ReportPrintLayout header stays unchanged.
 */

import type { NoShowPatientReportRow } from '@/types/reports/no-show-patient';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** A4 landscape minus this report's print page margins (5mm left + 5mm right). */
const PAGE_CONTENT_MM = 287;
const SPECIALITY_W = 36;
const DOCTOR_W = 48;
const TOTAL_W = 12;
const MIN_PERIOD_W = 8;
const MAX_PERIOD_W = 18;

type PeriodCol = { key: string; label: string };

type NoShowPatientPrintBodyProps = {
  rows: NoShowPatientReportRow[];
  periodKeys: string[];
  periodLabels: Record<string, string>;
  columnTotals: Record<string, number>;
  grandTotal: number;
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

function chunkPeriods(periods: PeriodCol[], perChunk: number): PeriodCol[][] {
  if (periods.length === 0) return [[]];
  const size = Math.max(1, perChunk);
  const chunks: PeriodCol[][] = [];
  for (let i = 0; i < periods.length; i += size) chunks.push(periods.slice(i, i + size));
  return chunks;
}

function widthPercents(periodCount: number): number[] {
  const count = Math.max(periodCount, 0);
  const fixed = SPECIALITY_W + DOCTOR_W + TOTAL_W;
  const available = Math.max(0, PAGE_CONTENT_MM - fixed);
  let periodW = count === 0 ? 0 : available / count;
  let specialityW = SPECIALITY_W;
  let doctorW = DOCTOR_W;
  if (count > 0 && periodW > MAX_PERIOD_W) {
    const spare = available - MAX_PERIOD_W * count;
    periodW = MAX_PERIOD_W;
    specialityW += spare * 0.35;
    doctorW += spare * 0.65;
  }
  const widths = [specialityW, doctorW, ...Array.from({ length: count }, () => periodW), TOTAL_W];
  const sum = widths.reduce((total, width) => total + width, 0);
  widths[widths.length - 1] = (widths[widths.length - 1] ?? TOTAL_W) + (PAGE_CONTENT_MM - sum);
  const total = widths.reduce((acc, width) => acc + width, 0);
  return widths.map((width) => (width / total) * 100);
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

export default function NoShowPatientPrintBody({
  rows,
  periodKeys,
  periodLabels,
  columnTotals,
  grandTotal,
}: NoShowPatientPrintBodyProps) {
  const periods: PeriodCol[] = periodKeys.map((key) => ({
    key,
    label: periodLabels[key] ?? key,
  }));
  const useDayGrid = periods.length > 0 && periods.every((col) => dateParts(col.key) != null);
  const periodsPerChunk = Math.max(
    1,
    Math.min(
      periods.length || 1,
      Math.floor((PAGE_CONTENT_MM - SPECIALITY_W - DOCTOR_W - TOTAL_W) / MIN_PERIOD_W)
    )
  );
  const chunks = periods.length === 0 ? [[]] : chunkPeriods(periods, periodsPerChunk);

  return (
    <div className="no-show-print-tables hidden print:block">
      {chunks.map((chunk, chunkIndex) => {
        const percents = widthPercents(chunk.length);
        const groups = useDayGrid ? monthGroups(chunk) : [];
        return (
          <table key={`print-chunk-${chunkIndex}`}>
            <colgroup>
              {percents.map((percent, index) => (
                <col key={index} style={{ width: `${percent}%` }} />
              ))}
            </colgroup>
            <thead>
              {useDayGrid ? (
                <>
                  <tr>
                    <th className="ns-name" rowSpan={2}>
                      Speciality
                    </th>
                    <th className="ns-name" rowSpan={2}>
                      Doctor Name
                    </th>
                    {groups.map((group) => (
                      <th key={group.title} colSpan={group.span}>
                        {group.title}
                      </th>
                    ))}
                    <th rowSpan={2}>Total</th>
                  </tr>
                  <tr>
                    {chunk.map((col) => (
                      <th key={col.key}>{dayHeading(col)}</th>
                    ))}
                  </tr>
                </>
              ) : (
                <tr>
                  <th className="ns-name">Speciality</th>
                  <th className="ns-name">Doctor Name</th>
                  {chunk.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th>Total</th>
                </tr>
              )}
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.rowId}-${chunkIndex}`}>
                  <td className="ns-name">{row.speciality}</td>
                  <td className="ns-name">{row.doctorName}</td>
                  {chunk.map((col) => (
                    <td key={col.key}>{row.periodCounts[col.key] ?? 0}</td>
                  ))}
                  <td>{row.total}</td>
                </tr>
              ))}
              <tr className="ns-total">
                <td className="ns-name" />
                <td className="ns-name">Total</td>
                {chunk.map((col) => (
                  <td key={`total-${col.key}`}>{columnTotals[col.key] ?? 0}</td>
                ))}
                <td>{grandTotal}</td>
              </tr>
            </tbody>
          </table>
        );
      })}
    </div>
  );
}
