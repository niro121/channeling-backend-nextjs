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

export const calculateDurationMinutes = (
  startTimeValue: string,
  startMeridiem: 'AM' | 'PM',
  endTimeValue: string,
  endMeridiem: 'AM' | 'PM'
) => {
  const parseTime = (time: string, meridiem: 'AM' | 'PM') => {
    const [hoursStr, minutesStr] = time.split(':');
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const startMinutes = parseTime(startTimeValue, startMeridiem);
  const endMinutes = parseTime(endTimeValue, endMeridiem);

  const duration = endMinutes - startMinutes;
  return duration >= 0 ? duration : 0; 
};
