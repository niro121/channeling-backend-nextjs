/**
 * All Cashier Summary and Detail — shared helpers for Print / PDF / Excel.
 * Print/PDF: landscape horizontal payment columns (same as screen view).
 * Excel may still use compact helpers until updated separately.
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

export const ACS_PAYMENT_COLUMNS: {
  key: keyof CashierSummaryPaymentAmounts;
  label: string;
}[] = [
  { key: 'cash', label: 'Cash' },
  { key: 'creditCard', label: 'Credit Card' },
  { key: 'slip', label: 'Slip' },
  { key: 'cheque', label: 'Cheque' },
  { key: 'agent', label: 'Agent' },
  { key: 'agentCredit', label: 'Credit' },
  { key: 'eWallet', label: 'E-wallet' },
];

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

export function amountCells(amounts: CashierSummaryPaymentAmounts): string[] {
  return ACS_PAYMENT_COLUMNS.map((c) => formatAmount(amounts[c.key]));
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

/** Same as print `.acs-amt` — fits ≥6 digits. */
export const ACS_AMOUNT_COL_MM = 18;

/**
 * Summary wide (landscape): No | User | Receipts | 7 amounts | Shifts | Checked By
 * Meta mm before/after amounts; amounts fixed at ACS_AMOUNT_COL_MM.
 */
export const ACS_SUMMARY_META_BEFORE_MM = [7, 36, 14] as const;
export const ACS_SUMMARY_META_AFTER_MM = [48, 28] as const;

/**
 * Detail wide: No | User | Section | Receipts | 7 amounts | Shifts | Checked By
 */
export const ACS_DETAIL_META_BEFORE_MM = [7, 28, 28, 12] as const;
export const ACS_DETAIL_META_AFTER_MM = [42, 22] as const;

export const ACS_SUMMARY_WIDE_HEADERS = [
  'No.',
  'User',
  'Receipts',
  ...ACS_PAYMENT_COLUMNS.map((c) => c.label),
  'Shifts',
  'Checked By',
] as const;

export const ACS_DETAIL_WIDE_HEADERS = [
  'No.',
  'User',
  'Section',
  'Receipts',
  ...ACS_PAYMENT_COLUMNS.map((c) => c.label),
  'Shifts',
  'Checked By',
] as const;

/** Summary compact (legacy Excel): No. | User | Receipts | Payments | Shifts | Checked By */
export const ACS_SUMMARY_PDF_HEADERS = [
  'No.',
  'User',
  'Receipts',
  'Payments',
  'Shifts',
  'Checked By',
] as const;

export const ACS_SUMMARY_PDF_COL_PERCENTS = [5, 16, 8, 28, 28, 15] as const;

/** Detail compact (legacy Excel) */
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

export type AcsSummaryWideRow = {
  cells: string[];
  shiftMarks?: AcsShiftMarkLine[];
  isTotal?: boolean;
};

export type AcsDetailWideRow = {
  cells: string[];
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

export function buildAcsSummaryWideRows(
  rows: AllCashierUserSummaryRow[],
  grandTotals: CashierSummaryPaymentAmounts | null,
  totalReceipts: number
): AcsSummaryWideRow[] {
  const body: AcsSummaryWideRow[] = rows.map((row, index) => ({
    cells: [
      String(index + 1),
      row.userName || '—',
      String(row.receiptCount),
      ...amountCells(row),
      formatAcsShiftMarksPlain(row.shifts),
      '',
    ],
    shiftMarks: buildAcsShiftMarkLines(row.shifts),
  }));
  if (grandTotals) {
    body.push({
      cells: ['', 'Total', String(totalReceipts), ...amountCells(grandTotals), '', ''],
      isTotal: true,
    });
  }
  return body;
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

export function buildAcsDetailWideRows(
  detailRows: AllCashierUserDetailRow[],
  grandTotals: CashierSummaryPaymentAmounts | null,
  totalReceipts: number
): AcsDetailWideRow[] {
  const body: AcsDetailWideRow[] = [];

  detailRows.forEach((u, idx) => {
    body.push(...buildAcsDetailUserWideRows(u, idx));
  });

  if (grandTotals) {
    body.push({
      cells: [
        '',
        'Grand Total',
        `Receipts ${totalReceipts}`,
        String(totalReceipts),
        ...amountCells(grandTotals),
        '',
        '',
      ],
      isGrandTotal: true,
    });
  }

  return body;
}

/** One user block matching print: section rows + User Total (no grand total). */
export function buildAcsDetailUserWideRows(
  u: AllCashierUserDetailRow,
  idx: number
): AcsDetailWideRow[] {
  const body: AcsDetailWideRow[] = [];
  u.sections.forEach((s, i) => {
    body.push({
      cells: [
        i === 0 ? String(idx + 1) : '',
        i === 0 ? u.userName || '—' : '',
        s.title || '—',
        String(s.receiptCount),
        ...amountCells(s.totals),
        i === 0 ? formatAcsShiftMarksPlain(u.shifts) : '',
        '',
      ],
      shiftMarks: i === 0 ? buildAcsShiftMarkLines(u.shifts) : undefined,
    });
  });
  body.push({
    cells: ['', 'User Total', '', String(u.receiptCount), ...amountCells(u.totals), '', ''],
    isUserTotal: true,
  });
  return body;
}
