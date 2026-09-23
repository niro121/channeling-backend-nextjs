/**
 * All Cashier Summary and Detail — shared helpers for Print / PDF / Excel.
 * Summary & Detail: compact categorized columns (payments stacked) for A4 portrait.
 */

import { formatReceiptAmount } from '@/lib/format-money';
import type {
  AllCashierShiftHandover,
  AllCashierUserDetailRow,
  AllCashierUserSummaryRow,
  CashierSummaryPaymentAmounts,
} from '@/types/report';

function formatAmount(n: number | undefined | null): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0.00';
  return formatReceiptAmount(num);
}

export function formatPaymentsBlock(amounts: CashierSummaryPaymentAmounts): string {
  return [
    `Cash ${formatAmount(amounts.cash)}`,
    `Card ${formatAmount(amounts.creditCard)}`,
    `Slip ${formatAmount(amounts.slip)}`,
    `Cheque ${formatAmount(amounts.cheque)}`,
    `Agent ${formatAmount(amounts.agent)}`,
    `Credit ${formatAmount(amounts.agentCredit)}`,
    `E-wallet ${formatAmount(amounts.eWallet)}`,
  ].join('\n');
}

export function formatAcsShiftDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export type AcsShiftMarkLine = {
  text: string;
  tone: 'neutral' | 'handed' | 'open';
};

/** One line per shift number, then a handed-over or open status line. */
export function buildAcsShiftMarkLines(
  shifts: AllCashierShiftHandover[] | undefined
): AcsShiftMarkLine[] {
  if (!shifts?.length) return [{ text: '—', tone: 'neutral' }];
  const lines: AcsShiftMarkLine[] = [];
  for (const shift of shifts) {
    lines.push({
      text: `#${shift.shiftNo}  ${formatAcsShiftDateTime(shift.startedAt)}`,
      tone: 'neutral',
    });
    if (shift.handedOver) {
      const no = shift.handoverNo ? `  ${shift.handoverNo}` : '';
      lines.push({
        text: `Handed over  ${formatAcsShiftDateTime(shift.handedOverAt)}${no}`,
        tone: 'handed',
      });
    } else {
      lines.push({ text: 'Not handed over', tone: 'open' });
    }
  }
  return lines;
}

export function formatAcsShiftMarksPlain(shifts: AllCashierShiftHandover[] | undefined): string {
  return buildAcsShiftMarkLines(shifts)
    .map((line) => line.text)
    .join('\n');
}

/** Summary: No. | User | Receipts | Payments | Shifts | Checked By */
export const ACS_SUMMARY_PDF_HEADERS = [
  'No.',
  'User',
  'Receipts',
  'Payments',
  'Shifts',
  'Checked By',
] as const;

export const ACS_SUMMARY_PDF_COL_PERCENTS = [5, 16, 8, 28, 28, 15] as const;

/** Detail: No. | User | Section | Receipts | Payments | Shifts | Checked By */
export const ACS_DETAIL_PDF_HEADERS = [
  'No.',
  'User',
  'Section',
  'Receipts',
  'Payments',
  'Shifts',
  'Checked By',
] as const;

export const ACS_DETAIL_PDF_COL_PERCENTS = [4, 13, 15, 7, 24, 24, 13] as const;

export type AcsSummaryCompactRow = {
  no: string;
  user: string;
  receipts: string;
  payments: string;
  handoverDate: string;
  checkedBy: string;
  shiftMarks?: AcsShiftMarkLine[];
  isTotal?: boolean;
};

export type AcsDetailCompactRow = {
  no: string;
  user: string;
  section: string;
  receipts: string;
  payments: string;
  handoverDate: string;
  checkedBy: string;
  shiftMarks?: AcsShiftMarkLine[];
  isUserTotal?: boolean;
  isGrandTotal?: boolean;
};

export function mapAcsSummaryCompactRow(
  row: AllCashierUserSummaryRow,
  index: number
): AcsSummaryCompactRow {
  return {
    no: String(index + 1),
    user: row.userName || '—',
    receipts: String(row.receiptCount),
    payments: formatPaymentsBlock(row),
    handoverDate: formatAcsShiftMarksPlain(row.shifts),
    checkedBy: '',
    shiftMarks: buildAcsShiftMarkLines(row.shifts),
  };
}

export function buildAcsSummaryCompactRows(
  rows: AllCashierUserSummaryRow[],
  grandTotals: CashierSummaryPaymentAmounts | null,
  totalReceipts: number
): AcsSummaryCompactRow[] {
  const body = rows.map(mapAcsSummaryCompactRow);
  if (grandTotals) {
    body.push({
      no: '',
      user: 'Total',
      receipts: String(totalReceipts),
      payments: formatPaymentsBlock(grandTotals),
      handoverDate: '',
      checkedBy: '',
      isTotal: true,
    });
  }
  return body;
}

export function acsSummaryPdfCompactRow(row: AcsSummaryCompactRow): string[] {
  return [
    row.no,
    row.user,
    row.receipts,
    row.payments,
    row.handoverDate,
    row.checkedBy,
  ];
}

export function buildAcsDetailCompactRows(
  detailRows: AllCashierUserDetailRow[],
  grandTotals: CashierSummaryPaymentAmounts | null,
  totalReceipts: number
): AcsDetailCompactRow[] {
  const body: AcsDetailCompactRow[] = [];

  detailRows.forEach((u, idx) => {
    u.sections.forEach((s, i) => {
      body.push({
        no: i === 0 ? String(idx + 1) : '',
        user: i === 0 ? u.userName || '—' : '',
        section: s.title || '—',
        receipts: String(s.receiptCount),
        payments: formatPaymentsBlock(s.totals),
        handoverDate: i === 0 ? formatAcsShiftMarksPlain(u.shifts) : '',
        checkedBy: i === 0 ? '' : '',
        shiftMarks: i === 0 ? buildAcsShiftMarkLines(u.shifts) : undefined,
      });
    });
    body.push({
      no: '',
      user: 'User Total',
      section: '',
      receipts: String(u.receiptCount),
      payments: formatPaymentsBlock(u.totals),
      handoverDate: '',
      checkedBy: '',
      isUserTotal: true,
    });
  });

  if (grandTotals) {
    body.push({
      no: '',
      user: 'Grand Total',
      section: `Receipts ${totalReceipts}`,
      receipts: String(totalReceipts),
      payments: formatPaymentsBlock(grandTotals),
      handoverDate: '',
      checkedBy: '',
      isGrandTotal: true,
    });
  }

  return body;
}

export function acsDetailPdfCompactRow(row: AcsDetailCompactRow): string[] {
  if (row.isUserTotal || row.isGrandTotal) {
    return [
      row.no,
      row.user,
      row.section,
      row.receipts,
      row.payments,
      row.handoverDate,
      row.checkedBy,
    ];
  }
  return [
    row.no,
    row.user,
    row.section,
    row.receipts,
    row.payments,
    row.handoverDate,
    row.checkedBy,
  ];
}
