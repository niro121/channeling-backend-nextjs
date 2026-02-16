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

// ==== PDF DOWNLOAD HANDLE UTIL ==== //
type DownloadPdfOptions<T> = {
  title?: string;
  data: T[];
  columns: string[];
  keys: (keyof T)[];
  fileName?: string;
};

export const downloadPdfUtil = <T>({
  title = 'Report',
  data,
  columns,
  keys,
  fileName = 'report.pdf'
}: DownloadPdfOptions<T>) => {
  const doc = new jsPDF();

  // == title == //
  doc.setFontSize(16);
  doc.text(title, 14, 20);

  // == rows == //
  const rows = data.map((item) =>
    keys.map((key) => {
      const value = item[key];
      return value !== undefined && value !== null ? String(value) : '-';
    })
  );

  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 30
  });

  doc.save(fileName);
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
  const iso = `${dateStr}T${timeStr24}:00+05:30`;
  return Math.floor(new Date(iso).getTime() / 1000);
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
