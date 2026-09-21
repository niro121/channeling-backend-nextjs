/**
 * All Cashier Summary and Detail — shared helpers for Print / PDF / Excel.
 * Summary & Detail: compact categorized columns (payments stacked) for A4 portrait.
 */

import { formatReceiptAmount } from '@/lib/format-money';
import type {
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

/** Summary: No. | User | Receipts | Payments | Handover Date | Checked By */
export const ACS_SUMMARY_PDF_HEADERS = [
  'No.',
  'User',
  'Receipts',
  'Payments',
  'Handover Date',
  'Checked By',
] as const;

export const ACS_SUMMARY_PDF_COL_PERCENTS = [5, 22, 10, 33, 15, 15] as const;

/** Detail: No. | User | Section | Receipts | Payments | Handover Date | Checked By */
export const ACS_DETAIL_PDF_HEADERS = [
  'No.',
  'User',
  'Section',
  'Receipts',
  'Payments',
  'Handover Date',
  'Checked By',
] as const;

export const ACS_DETAIL_PDF_COL_PERCENTS = [4, 16, 18, 8, 28, 13, 13] as const;

export type AcsSummaryCompactRow = {
  no: string;
  user: string;
  receipts: string;
  payments: string;
  handoverDate: string;
  checkedBy: string;
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
    handoverDate: '',
    checkedBy: '',
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
        handoverDate: i === 0 ? '' : '',
        checkedBy: i === 0 ? '' : '',
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
