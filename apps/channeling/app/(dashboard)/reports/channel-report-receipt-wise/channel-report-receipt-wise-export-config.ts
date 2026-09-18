/**
 * Receipt Report — PDF/Excel helpers matching Print compact layout.
 */

import type { ChannelReportReceiptWiseExportRow } from '@/types/reports/channel-report-receipt-wise';

export type ReceiptReportExportColumn = {
  key: keyof ChannelReportReceiptWiseExportRow;
  header: string;
};

export type ReceiptReportExportGroup = {
  title: string;
  columns: ReceiptReportExportColumn[];
};

/** Excel column groups — one field per cell; matches Print logical bands. */
export const RECEIPT_REPORT_EXPORT_GROUPS: ReceiptReportExportGroup[] = [
  {
    title: 'Type',
    columns: [{ key: 'receiptScope', header: 'Type' }],
  },
  {
    title: 'Receipt',
    columns: [
      { key: 'receiptNo', header: 'Receipt No' },
      { key: 'receiptDate', header: 'Receipt Date' },
    ],
  },
  {
    title: 'Payment',
    columns: [
      { key: 'receiptMethod', header: 'Payment Method' },
      { key: 'transactionType', header: 'Transaction Type' },
      { key: 'cancelReason', header: 'Cancel Reason' },
      { key: 'reversedReceiptNo', header: 'Reversed Receipt' },
    ],
  },
  {
    title: 'Amounts',
    columns: [
      { key: 'receiptAmount', header: 'Amount' },
      { key: 'whdAmount', header: 'WHT' },
      { key: 'netAmount', header: 'Net Amount' },
    ],
  },
  {
    title: 'Session',
    columns: [
      { key: 'appointmentNo', header: 'App No' },
      { key: 'sessionDate', header: 'Session Date' },
      { key: 'sessionTime', header: 'Session Time' },
      { key: 'consultant', header: 'Consultant' },
    ],
  },
  {
    title: 'Patient / Parties',
    columns: [
      { key: 'patientName', header: 'Patient' },
      { key: 'bookingStatus', header: 'Booking Status' },
      { key: 'agency', header: 'Agency' },
      { key: 'creditCustomer', header: 'Credit Customer' },
    ],
  },
  {
    title: 'Audit',
    columns: [
      { key: 'creator', header: 'Creator' },
      { key: 'handoverPerson', header: 'Handover Person' },
    ],
  },
];

export const RECEIPT_REPORT_EXPORT_COLUMNS = RECEIPT_REPORT_EXPORT_GROUPS.flatMap((g) =>
  g.columns.map((c) => c.header)
);

export const RECEIPT_REPORT_EXPORT_KEYS = RECEIPT_REPORT_EXPORT_GROUPS.flatMap((g) =>
  g.columns.map((c) => c.key)
);

export const RECEIPT_REPORT_AMOUNT_KEYS = new Set<keyof ChannelReportReceiptWiseExportRow>([
  'receiptAmount',
  'whdAmount',
  'netAmount',
]);

/** Print/PDF column %: Receipt, Payment, Amounts, Session, Patient/Parties, Audit */
export const RECEIPT_REPORT_PDF_COL_PERCENTS = [14, 15, 13, 20, 22, 16];

export const RECEIPT_REPORT_PDF_HEADERS = [
  'Receipt',
  'Payment',
  'Amounts',
  'Session',
  'Patient / Parties',
  'Audit',
] as const;

function s(row: ChannelReportReceiptWiseExportRow, key: keyof ChannelReportReceiptWiseExportRow): string {
  const v = row[key];
  if (v === undefined || v === null || v === '') return '-';
  return String(v);
}

/** Compact 6-column PDF cell text matching Print. */
export function receiptReportPdfCompactRow(row: ChannelReportReceiptWiseExportRow): string[] {
  const cancel = s(row, 'cancelReason');
  const reversed = s(row, 'reversedReceiptNo');
  const paymentLines = [s(row, 'receiptMethod'), s(row, 'transactionType')];
  if (cancel !== '-') paymentLines.push(`Cancel: ${cancel}`);
  if (reversed !== '-') paymentLines.push(`Rev: ${reversed}`);

  const amounts = [
    `Amt  ${s(row, 'receiptAmount')}`,
    `WHT  ${s(row, 'whdAmount')}`,
    `Net  ${s(row, 'netAmount')}`,
  ].join('\n');

  return [
    `${s(row, 'receiptNo')}\n${s(row, 'receiptDate')}`,
    paymentLines.join('\n'),
    amounts,
    `App #${s(row, 'appointmentNo')}\n${s(row, 'sessionDate')} · ${s(row, 'sessionTime')}\n${s(row, 'consultant')}`,
    `${s(row, 'patientName')}\n${s(row, 'bookingStatus')}\nAgy: ${s(row, 'agency')}\nCredit: ${s(row, 'creditCustomer')}`,
    `By: ${s(row, 'creator')}\nHand: ${s(row, 'handoverPerson')}`,
  ];
}

export function receiptReportGroupTitle(row: ChannelReportReceiptWiseExportRow): string {
  const scope = s(row, 'receiptScope');
  return scope === '-' ? 'Other' : scope;
}

export function receiptReportExportCellValue(
  row: ChannelReportReceiptWiseExportRow,
  key: keyof ChannelReportReceiptWiseExportRow
): string | number | null {
  const v = row[key];
  if (v === undefined || v === null || v === '') return null;
  if (RECEIPT_REPORT_AMOUNT_KEYS.has(key)) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const text = String(v).trim();
    if (text === '' || text === '-') return null;
    const n = parseFloat(text.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return String(v);
}

export function parseReceiptAmountTotal(
  row: ChannelReportReceiptWiseExportRow,
  key: keyof ChannelReportReceiptWiseExportRow
): number {
  const v = receiptReportExportCellValue(row, key);
  return typeof v === 'number' ? v : 0;
}
