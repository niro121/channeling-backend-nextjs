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
