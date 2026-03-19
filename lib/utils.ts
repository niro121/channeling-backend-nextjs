import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Cryptr from 'cryptr';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==== GENERATE ENCRYPTED CODES UTIL ==== //
export const encryptCode = (code: string): string => {
  const secret = process.env.CRYPTR_SECRET_KEY!;
  const cryptr = new Cryptr(secret);

  return cryptr.encrypt(code);
};

export const decryptCode = (code: string): string => {
  const secret = process.env.CRYPTR_SECRET_KEY!;
  const cryptr = new Cryptr(secret);

  return cryptr.decrypt(code);
};

export function generateCode() {
  return encryptCode(Math.floor(1000 + Math.random() * 9000).toString());
}

export const padCode = (num: number, length: number) =>
  num.toString().padStart(length, '0');

// ==== FORMAT EXPORT FILE NAME ==== //
/**
 * Formats export file names to include " - Ruhunu Hospital" suffix
 * @param componentName - The name of the component/report (e.g., "doctors", "specialities", "doctor-arrivals-report-2024-01-15")
 * @returns Formatted file name (e.g., "Doctors - Ruhunu Hospital")
 */
export const formatExportFileName = (componentName: string): string => {
  if (!componentName) {
    return 'Report - Ruhunu Hospital';
  }

  // Remove file extension if present
  const nameWithoutExt = componentName.replace(/\.(pdf|xlsx)$/i, '');
  
  // Capitalize first letter of each word
  const formattedName = nameWithoutExt
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return `${formattedName} - Ruhunu Hospital`;
};

// ==== PDF DOWNLOAD HANDLE UTIL ==== //
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
    headStyles: { overflow: 'linebreak', fontSize: layout.headFontSize, fillColor: '#317D5A' },
    horizontalPageBreak: layout.useHorizontalPageBreak,
    horizontalPageBreakRepeat: layout.useHorizontalPageBreak ? [0] : undefined
  });

  doc.save(fileName);
};

// ==== PDF PRINT HANDLE UTIL (opens print dialog with same content as PDF) ==== //
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
    headStyles: { overflow: 'linebreak', fontSize: layout.headFontSize, fillColor: '#317D5A' },
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

// ==== EXCEL DOWNLOAD HANDLE UTIL ==== //
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

  /*  sheet.columns = [
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Age', key: 'age', width: 10 }
  ]; */

  // == COLUMNS == //
  sheet.columns = columns.map((column, index) => ({
    header: column,
    key: keys[index] as string,
    width: 20
  }));

  // == ROWS == //
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

// ==== TIME CONVERTERS ==== //
/** Sri Lanka timezone (UTC+5:30). Use when storing/displaying session times. */
export const SRI_LANKA_TZ = 'Asia/Colombo'
export const SL_OFFSET = '+05:30';

/**
 * ISO timezone offset string (e.g. "+05:30" or "-08:00") for session start/end.
 * Uses SESSION_TIMEZONE_OFFSET env if set (e.g. "+05:30"), otherwise the server's
 * current timezone (so set TZ=Asia/Colombo on the server to get +05:30).
 */
export function getSessionTimeZoneOffsetString(): string {
  const envOffset = process.env.SESSION_TIMEZONE_OFFSET?.trim()
  if (envOffset && /^[+-]\d{1,2}:\d{2}$/.test(envOffset)) return envOffset
  const offsetMinutes = -new Date().getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hours = Math.floor(abs / 60)
  const mins = abs % 60
  return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}

/**
 * Parse "YYYY-MM-DD" + "HH:mm" in the session timezone (server TZ or SESSION_TIMEZONE_OFFSET).
 * Use when creating Session startTime/endTime so they are stored correctly in UTC.
 */
export function parseSessionDateTime(dateStr: string, timeStr: string): Date {
  const offset = getSessionTimeZoneOffsetString()
  const iso = `${dateStr}T${timeStr}:00${offset}`
  return new Date(iso)
}

/**
 * Extract time and meridiem from a Date using optional timezone.
 * When timeZone is provided (e.g. SRI_LANKA_TZ), hours/minutes are in that zone so
 * doctor session times stored in UTC display correctly as Sri Lanka time.
 */
export const extractTime = (
  date: Date,
  timeZone?: string
): { time: string; meridiem: 'AM' | 'PM' } => {
  let hours: number
  let minutes: number
  if (timeZone) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    })
      .formatToParts(date)
      .reduce(
        (acc, p) => {
          if (p.type === 'hour') acc.hour = parseInt(p.value, 10)
          if (p.type === 'minute') acc.minute = parseInt(p.value, 10)
          return acc
        },
        { hour: 0, minute: 0 }
      )
    hours = parts.hour
    minutes = parts.minute
  } else {
    hours = date.getHours()
    minutes = date.getMinutes()
  }
  const meridiem: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return {
    time: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    meridiem
  }
}

/**
 * Format a time in Sri Lanka (Asia/Colombo) for display, e.g. "5.00AM", "12.30PM".
 * Accepts Date or unix timestamp in seconds (as stored in Session.startTime/endTime).
 */
export const formatTimeSriLanka = (value: Date | number): string => {
  const date =
    typeof value === 'number'
      ? new Date(value >= 1e12 ? value : value * 1000)
      : value
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SRI_LANKA_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).formatToParts(date)
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '0'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  const dayPeriod = parts.find((p) => p.type === 'dayPeriod')?.value ?? 'AM'
  return `${hour}.${minute}${dayPeriod}`
}

/**
 * Format date only in Sri Lanka (Asia/Colombo), e.g. "18/02/2026" or "23 Feb 2026".
 */
export const formatDateSriLanka = (
  value: Date | number | string,
  style: 'short' | 'medium' = 'short'
): string => {
  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SRI_LANKA_TZ,
    ...(style === 'short'
      ? { day: '2-digit', month: '2-digit', year: 'numeric' }
      : { day: 'numeric', month: 'short', year: 'numeric' })
  }).format(date)
}

/**
 * Format date+time in Sri Lanka (Asia/Colombo) for display.
 * Use for createdAt/updatedAt etc. so all app times use the same timezone.
 */
export const formatDateTimeSriLanka = (value: Date | number | string): string => {
  const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SRI_LANKA_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

export const buildDateFromTime = (
  time: string,
  meridiem: 'AM' | 'PM',
  baseDate: Date
) => {
  const [hh, mm] = time.split(':').map(Number);
  let hours = hh;

  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  const date = new Date(baseDate);
  date.setHours(hours, mm, 0, 0);

  return date;
};

/** Convert time string + meridiem to minutes from midnight (0–1439). */
export function timeToMinutes(timeValue: string, meridiem: 'AM' | 'PM'): number {
  if (!timeValue || !timeValue.trim()) return 0;
  const [hoursStr, minutesStr] = timeValue.split(':');
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr ?? '0', 10);
  if (Number.isNaN(hours)) hours = 0;
  if (Number.isNaN(minutes)) return 0;
  if (meridiem === 'PM' && hours !== 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/** Convert minutes from midnight to { timeStr: 'HH:mm', meridiem: 'AM' | 'PM' }. */
export function minutesToTime(totalMinutes: number): { timeStr: string; meridiem: 'AM' | 'PM' } {
  const clamped = Math.max(0, Math.min(1439, Math.floor(totalMinutes)));
  const hours24 = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  const isPM = hours24 >= 12;
  const hour12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
  const timeStr = `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return { timeStr, meridiem: isPM ? 'PM' : 'AM' };
}

export const calculateDurationMinutes = (
  startTimeValue: string,
  startMeridiem: 'AM' | 'PM',
  endTimeValue: string,
  endMeridiem: 'AM' | 'PM'
): number => {
  const startMinutes = timeToMinutes(startTimeValue, startMeridiem);
  const endMinutes = timeToMinutes(endTimeValue, endMeridiem);
  const duration = endMinutes - startMinutes;
  return duration >= 0 ? duration : 0;
};

/** Given a calendar date and 12h time, return Unix seconds for that moment in Sri Lanka (UTC+5:30). */
export function timeToSriLankaUnix(
  baseDate: Date,
  timeValue: string,
  meridiem: 'AM' | 'PM'
): number {
  const minutes = timeToMinutes(timeValue, meridiem);
  const hours24 = Math.floor(minutes / 60);
  const min = minutes % 60;
  const timeStr24 = `${hours24.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  const y = baseDate.getUTCFullYear();
  const m = (baseDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = baseDate.getUTCDate().toString().padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  const offset = getSessionTimeZoneOffsetString();
  const iso = `${dateStr}T${timeStr24}:00${offset}`;
  return Math.floor(new Date(iso).getTime() / 1000);
}

/**
 * Normalize Session.startTime/endTime to a Date.
 * Handles: Date (return as-is), unix seconds (number >= 1e9), or minutes-from-midnight (number 0–1439) using sessionDate.
 */
export function normalizeSessionTime(
  value: Date | number,
  sessionDate: Date
): Date {
  if (value instanceof Date) return value;
  const n = Number(value);
  if (n >= 1e9 && n < 1e13) return new Date(n * 1000); // unix seconds
  // minutes from midnight
  const d = new Date(sessionDate);
  d.setUTCHours(Math.floor(n / 60), n % 60, 0, 0);
  return d;
}

/**
 * Normalize Session.startTime/endTime from API (number = unix sec, Date, or ISO string) to unix seconds.
 * Use before unixToTimeDisplay when the value might be serialized from Prisma.
 */
export function sessionTimeToUnixSeconds(value: number | string | Date | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value >= 1e12 ? Math.floor(value / 1000) : value;
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  const ms = new Date(value as string).getTime();
  return Number.isNaN(ms) ? 0 : Math.floor(ms / 1000);
}

/** Convert unix seconds (e.g. Session.startTime/endTime) to { timeStr, meridiem } in Sri Lanka for time picker. */
export function unixToTimeDisplay(unixSeconds: number): { timeStr: string; meridiem: 'AM' | 'PM' } {
  const d = new Date(unixSeconds * 1000);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const parts = formatter.formatToParts(d);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const dayPeriod = (parts.find((p) => p.type === 'dayPeriod')?.value ?? 'AM') as 'AM' | 'PM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const timeStr = `${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  return { timeStr, meridiem: dayPeriod };
}
