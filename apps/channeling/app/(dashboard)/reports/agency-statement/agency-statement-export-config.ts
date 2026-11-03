/**
 * Agency Statement — shared compact helpers for Print / PDF / Excel.
 */

import moment from 'moment';
import type {
  AgencyStatementReportData,
  AgencyStatementRow,
} from '@/types/reports/agency-statement';
import { formatLKR } from '@/lib/format-money';

export type AgencyStatementCompactRow = {
  no: string;
  date: string;
  time: string;
  particulars: string;
  receiptNo: string;
  appointment: string;
  bookNo: string;
  leafNo: string;
  docFee: string;
  hosFee: string;
  discount: string;
  amount: string;
  balance: string;
  comments: string;
  createdBy: string;
  isOpening?: boolean;
  isClosing?: boolean;
};

function dash(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

function formatStamp(value: Date | string | null | undefined): { date: string; time: string } {
  if (!value) return { date: '-', time: '-' };
  const m = moment(value);
  if (!m.isValid()) return { date: '-', time: '-' };
  return {
    date: m.format('DD/MM/YY'),
    time: m.format('hh:mm A'),
  };
}

export function formatAgencyStatementMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '0.00';
  return formatLKR(Number(value));
}

export function mapAgencyStatementCompactFromRow(
  row: AgencyStatementRow
): AgencyStatementCompactRow {
  const stamp = formatStamp(row.date);
  return {
    no: String(row.no),
    date: stamp.date,
    time: stamp.time,
    particulars: dash(row.particulars),
    receiptNo: dash(row.receiptNo),
    appointment: dash(row.appointmentDateTime),
    bookNo: dash(row.bookNo),
    leafNo: dash(row.leafNo),
    docFee: formatAgencyStatementMoney(row.docFee),
    hosFee: formatAgencyStatementMoney(row.hosFee),
    discount: formatAgencyStatementMoney(row.discount),
    amount: formatAgencyStatementMoney(row.amount),
    balance: formatAgencyStatementMoney(row.runningBalance),
    comments: dash(row.comments),
    createdBy: dash(row.createdBy),
  };
}

export function buildAgencyStatementCompactRows(
  data: AgencyStatementReportData,
  periodFrom: string
): AgencyStatementCompactRow[] {
  const openingStamp = formatStamp(periodFrom);
  return [
    {
      no: '',
      date: openingStamp.date,
      time: openingStamp.time,
      particulars: 'Opening Balance',
      receiptNo: '-',
      appointment: 'Balance as of period start',
      bookNo: '-',
      leafNo: '-',
      docFee: '-',
      hosFee: '-',
      discount: '-',
      amount: '-',
      balance: formatAgencyStatementMoney(data.openingBalance),
      comments: '-',
      createdBy: '-',
      isOpening: true,
    },
    ...data.rows.map(mapAgencyStatementCompactFromRow),
    {
      no: '',
      date: '',
      time: '',
      particulars: 'Closing Balance',
      receiptNo: '-',
      appointment: '-',
      bookNo: '-',
      leafNo: '-',
      docFee: '-',
      hosFee: '-',
      discount: '-',
      amount: '-',
      balance: formatAgencyStatementMoney(data.closingBalance),
      comments: '-',
      createdBy: '-',
      isClosing: true,
    },
  ];
}

export const AGENCY_STATEMENT_PDF_HEADERS = [
  'No.',
  'Date',
  'Detail',
  'Fees',
  'Balance',
  'Comments & Create By',
] as const;

export const AGENCY_STATEMENT_PDF_COL_PERCENTS = [6, 12, 28, 22, 12, 20] as const;

export function agencyStatementPdfCompactRow(row: AgencyStatementCompactRow): string[] {
  if (row.isOpening) {
    return [
      '',
      `${row.date}\n${row.time}`,
      `${row.particulars}\n${row.appointment}`,
      '—',
      row.balance,
      '',
    ];
  }
  if (row.isClosing) {
    return ['', '', row.particulars, '', row.balance, ''];
  }
  const fees =
    row.particulars === 'Agency Deposit'
      ? `Amt ${row.amount}`
      : `Doc ${row.docFee}\nHos ${row.hosFee}\nDisc ${row.discount}\nAmt ${row.amount}`;

  return [
    row.no,
    `${row.date}\n${row.time}`,
    `${row.particulars}\nRcpt ${row.receiptNo}\nAppt ${row.appointment}`,
    fees,
    row.balance,
    `${row.comments}\nBy ${row.createdBy}`,
  ];
}
