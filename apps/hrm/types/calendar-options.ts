/**
 * Shared calendar option lists for filters (payroll, etc.).
 * Month ids are 01–12. Distinct from MonthCalendar’s 0–11 index API.
 */

export type CalendarOption = {
  id: string;
  name: string;
};

export const MONTH_OPTIONS: CalendarOption[] = [
  { id: '01', name: 'January' },
  { id: '02', name: 'February' },
  { id: '03', name: 'March' },
  { id: '04', name: 'April' },
  { id: '05', name: 'May' },
  { id: '06', name: 'June' },
  { id: '07', name: 'July' },
  { id: '08', name: 'August' },
  { id: '09', name: 'September' },
  { id: '10', name: 'October' },
  { id: '11', name: 'November' },
  { id: '12', name: 'December' }
];

/**
 * Year options centered on the current year (default ±5).
 */
export function buildYearOptions(
  centerYear: number = new Date().getFullYear(),
  range: number = 5
): CalendarOption[] {
  const start = centerYear - range;
  return Array.from({ length: range * 2 + 1 }, (_, i) => {
    const year = start + i;
    return { id: String(year), name: String(year) };
  });
}

export const YEAR_OPTIONS = buildYearOptions();
