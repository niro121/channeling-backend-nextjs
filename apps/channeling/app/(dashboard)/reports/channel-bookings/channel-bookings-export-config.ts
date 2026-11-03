/**
 * Channel Booking Details — export helpers for PDF/Excel only.
 * Aligns with the current Print compact table (channel-bookings-print-layout.tsx).
 * Do not import this into the Print layout.
 */

import type { ChannelBookingsReportExportRow } from '@/types/reports/channel-bookings';

export type ChannelBookingsExportColumn = {
  key: keyof ChannelBookingsReportExportRow | string;
  header: string;
};

export type ChannelBookingsExportGroup = {
  title: string;
  columns: ChannelBookingsExportColumn[];
};

/** Excel column groups — one field per cell; matches Print logical order. */
export const CHANNEL_BOOKINGS_EXPORT_GROUPS: ChannelBookingsExportGroup[] = [
  {
    title: 'Doctor',
    columns: [
      { key: 'consultantCodeName', header: 'Consultant' },
      { key: 'speciality', header: 'Speciality' },
    ],
  },
  {
    title: 'Appointment',
    columns: [
      { key: 'applyDate', header: 'App Date' },
      { key: 'applyTime', header: 'App Time' },
      { key: 'applyNumber', header: 'App Number' },
    ],
  },
  {
    title: 'Booking',
    columns: [
      { key: 'billNumber', header: 'Bill Number' },
      { key: 'method', header: 'Method' },
      { key: 'status', header: 'Status' },
    ],
  },
  {
    title: 'Patient',
    columns: [
      { key: 'patientName', header: 'Patient Name' },
      { key: 'patientNumber', header: 'Phone Number' },
      { key: 'area', header: 'Area' },
    ],
  },
  {
    title: 'Refund',
    columns: [
      { key: 'refundStatus', header: 'Refund Status' },
      { key: 'refundedBy', header: 'Refunded By' },
      { key: 'refundedAt', header: 'Refunded At' },
    ],
  },
  {
    title: 'Audit',
    columns: [
      { key: 'creator', header: 'Creator' },
      { key: 'updater', header: 'Updater' },
    ],
  },
  {
    title: 'Fees / Total',
    columns: [
      { key: 'hospitalFee', header: 'Hospital Fee' },
      { key: 'doctorFee', header: 'Doctor Fee' },
      { key: 'discount', header: 'Discount' },
      { key: 'totalFee', header: 'Total Fee' },
    ],
  },
  {
    title: 'Payment',
    columns: [
      { key: 'paymentMode', header: 'Payment Mode' },
      { key: 'agentName', header: 'Agent Name' },
    ],
  },
];

export const CHANNEL_BOOKINGS_EXPORT_COLUMNS = CHANNEL_BOOKINGS_EXPORT_GROUPS.flatMap((g) =>
  g.columns.map((c) => c.header)
);

export const CHANNEL_BOOKINGS_EXPORT_KEYS = CHANNEL_BOOKINGS_EXPORT_GROUPS.flatMap((g) =>
  g.columns.map((c) => c.key)
) as (keyof ChannelBookingsReportExportRow)[];

export const CHANNEL_BOOKINGS_FEE_KEYS = new Set<string>([
  'hospitalFee',
  'doctorFee',
  'discount',
  'totalFee',
]);

/** Print/PDF table column percentages (Appointment … Payment). */
export const CHANNEL_BOOKINGS_PDF_COL_PERCENTS = [11, 13, 15, 12, 18, 11, 11, 9];

export const CHANNEL_BOOKINGS_PDF_HEADERS = [
  'Appointment',
  'Booking',
  'Patient',
  'Refund',
  'Audit',
  'Fees',
  'Total',
  'Payment',
] as const;

function s(row: ChannelBookingsReportExportRow, key: string): string {
  const v = row[key];
  if (v === undefined || v === null || v === '') return '-';
  return String(v);
}

function shortDate(raw: string): string {
  if (!raw || raw === '-') return '-';
  // Accept DD/MM/YYYY or similar → DD/MM/YY
  const m = raw.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (!m) return raw;
  const yy = m[3]!.length === 4 ? m[3]!.slice(2) : m[3]!;
  return `${m[1]!.padStart(2, '0')}/${m[2]!.padStart(2, '0')}/${yy}`;
}

function money(raw: string): string {
  if (!raw || raw === '-') return '0.00';
  const n = parseFloat(raw.replace(/,/g, ''));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function normalizeTimeRange(raw: string): string {
  if (!raw || raw === '-') return '-';
  return raw.replace(/\s*-\s*/g, '–');
}

/** Doctor heading matching Print: `CODE – Name | Speciality`. */
export function channelBookingsDoctorGroupTitle(row: ChannelBookingsReportExportRow): string {
  const consultant = s(row, 'consultantCodeName');
  const speciality = s(row, 'speciality');
  if (speciality === '-') return consultant;
  return `${consultant} | ${speciality}`;
}

/**
 * Compact 8-column cell text (with newlines) matching Print inline formatting.
 */
export function channelBookingsPdfCompactRow(
  row: ChannelBookingsReportExportRow
): string[] {
  const applyDate = shortDate(s(row, 'applyDate'));
  const applyNumber = s(row, 'applyNumber');
  const applyTime = normalizeTimeRange(s(row, 'applyTime'));
  const bill = s(row, 'billNumber');
  const method = s(row, 'method');
  const status = s(row, 'status');
  const patient = s(row, 'patientName');
  const phone = s(row, 'patientNumber');
  const area = s(row, 'area');
  const refundStatus = s(row, 'refundStatus');
  const refundedBy = s(row, 'refundedBy');
  const refundedAt = s(row, 'refundedAt');
  const creator = s(row, 'creator');
  const updater = s(row, 'updater');

  return [
    `${applyDate} | #${applyNumber}\n${applyTime}`,
    `${bill}\n${method} | ${status}`,
    `${patient}\n${phone} | ${area}`,
    `${refundStatus}\nBy: ${refundedBy} | At: ${refundedAt}`,
    `C: ${creator}\nU: ${updater}`,
    `H: ${money(s(row, 'hospitalFee'))} | D: ${money(s(row, 'doctorFee'))}`,
    `Disc: ${money(s(row, 'discount'))} | Total: ${money(s(row, 'totalFee'))}`,
    `${s(row, 'paymentMode')}\n${s(row, 'agentName')}`,
  ];
}

export function channelBookingsExportCellValue(
  row: ChannelBookingsReportExportRow,
  key: string
): string | number | null {
  const v = row[key];
  if (v === undefined || v === null || v === '') return null;
  if (CHANNEL_BOOKINGS_FEE_KEYS.has(key)) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const text = String(v).trim();
    if (text === '' || text === '-') return null;
    const n = parseFloat(text.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return typeof v === 'string' || typeof v === 'number' ? v : String(v);
}

export function parseFeeTotal(row: ChannelBookingsReportExportRow, key: string): number {
  const v = channelBookingsExportCellValue(row, key);
  return typeof v === 'number' ? v : 0;
}
