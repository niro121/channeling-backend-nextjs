/**
 * Agent Collection Receipt — shared compact helpers for Print / PDF / Excel.
 * Columns: No. | Date / User | Receipt | Agent | Amounts | Payment Refs
 */

import moment from 'moment';
import { formatReceiptAmount } from '@/lib/format-money';
import type {
  AgentCollectionReceiptReportExportRow,
  AgentCollectionReceiptReportRow,
} from '@/types/reports/agent-collection-receipt';

export const ACR_PDF_HEADERS = [
  'No.',
  'Date / User',
  'Receipt',
  'Agent',
  'Amounts',
  'Payment Refs',
] as const;

export const ACR_PDF_COL_PERCENTS = [4, 14, 16, 16, 24, 26] as const;

export type AcrCompactRow = {
  no: string;
  dateUser: string;
  receipt: string;
  agent: string;
  amounts: string;
  paymentRefs: string;
  isNegative?: boolean;
  isTotal?: boolean;
};

function dash(value: string | null | undefined): string {
  if (value == null || value === '' || value === '-') return '—';
  return value;
}

function parseAmount(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value == null || value === '' || value === '-') return 0;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function mapAcrCompactFromReportRow(
  row: AgentCollectionReceiptReportRow,
  index: number
): AcrCompactRow {
  const date = row.createdAt ? moment(row.createdAt).format('YYYY-MM-DD') : '—';
  const time = row.createdAt ? moment(row.createdAt).format('HH:mm:ss') : '';
  const receiptLines = [dash(row.receiptNoString)];
  if (row.remarks) receiptLines.push(row.remarks);
  if (row.cancelReason) receiptLines.push(`Cancel: ${row.cancelReason}`);

  return {
    no: String(index + 1),
    dateUser: `${date}${time ? `\n${time}` : ''}\n${dash(row.createdUser)}`,
    receipt: receiptLines.join('\n'),
    agent: `${dash(row.agencyName)}\nCode ${dash(row.agencyCode)}`,
    amounts: [
      `Receipt ${formatReceiptAmount(row.receiptAmount ?? 0)}`,
      `Cash ${formatReceiptAmount(row.cashAmount ?? 0)}`,
      `Card ${formatReceiptAmount(row.cardAmount ?? 0)}`,
      `Cheque ${formatReceiptAmount(row.chequeAmount ?? 0)}`,
      `Slip ${formatReceiptAmount(row.slipAmount ?? 0)}`,
      `E-Wallet ${formatReceiptAmount(row.eWalletAmount ?? 0)}`,
    ].join('\n'),
    paymentRefs: [
      `Slip ${dash(row.slipRef)}${row.slipDate ? ` · ${row.slipDate}` : ''}`,
      `Cheque ${dash(row.chequeRef)}${row.chequeDate ? ` · ${row.chequeDate}` : ''}`,
      `Card ${dash(row.cardRef)}`,
      `Bank ${dash(row.bankName)}`,
    ].join('\n'),
    isNegative: (row.receiptAmount ?? 0) < 0,
  };
}

export function mapAcrCompactFromExportRow(
  row: AgentCollectionReceiptReportExportRow,
  index: number
): AcrCompactRow {
  const stamp = moment(row.date, ['YYYY-MM-DD HH:mm:ss', moment.ISO_8601], true);
  const date = stamp.isValid() ? stamp.format('YYYY-MM-DD') : row.date || '—';
  const time = stamp.isValid() ? stamp.format('HH:mm:ss') : '';
  const receiptLines = [dash(row.receiptNo)];
  if (row.remarks && row.remarks !== '-') receiptLines.push(row.remarks);
  if (row.cancelReason && row.cancelReason !== '-') {
    receiptLines.push(`Cancel: ${row.cancelReason}`);
  }

  const receiptAmt = parseAmount(row.receiptAmount);

  return {
    no: String(index + 1),
    dateUser: `${date}${time ? `\n${time}` : ''}\n${dash(row.createdUser)}`,
    receipt: receiptLines.join('\n'),
    agent: `${dash(row.agencyName)}\nCode ${dash(row.agencyCode)}`,
    amounts: [
      `Receipt ${row.receiptAmount || formatReceiptAmount(0)}`,
      `Cash ${row.cash || formatReceiptAmount(0)}`,
      `Card ${row.creditCard || formatReceiptAmount(0)}`,
      `Cheque ${row.cheque || formatReceiptAmount(0)}`,
      `Slip ${row.slip || formatReceiptAmount(0)}`,
      `E-Wallet ${row.eWallet || formatReceiptAmount(0)}`,
    ].join('\n'),
    paymentRefs: [
      `Slip ${dash(row.slipRef)}${row.slipDate && row.slipDate !== '-' ? ` · ${row.slipDate}` : ''}`,
      `Cheque ${dash(row.chequeRef)}${row.chequeDate && row.chequeDate !== '-' ? ` · ${row.chequeDate}` : ''}`,
      `Card ${dash(row.cardRef)}`,
      `Bank ${dash(row.bankName)}`,
    ].join('\n'),
    isNegative: receiptAmt < 0,
  };
}

export function buildAcrCompactRowsFromExport(
  rows: AgentCollectionReceiptReportExportRow[]
): AcrCompactRow[] {
  const body = rows.map(mapAcrCompactFromExportRow);
  const totals = rows.reduce(
    (acc, r) => {
      acc.receipt += parseAmount(r.receiptAmount);
      acc.cash += parseAmount(r.cash);
      acc.card += parseAmount(r.creditCard);
      acc.cheque += parseAmount(r.cheque);
      acc.slip += parseAmount(r.slip);
      acc.eWallet += parseAmount(r.eWallet);
      return acc;
    },
    { receipt: 0, cash: 0, card: 0, cheque: 0, slip: 0, eWallet: 0 }
  );

  body.push({
    no: '',
    dateUser: 'Total',
    receipt: '',
    agent: '',
    amounts: [
      `Receipt ${formatReceiptAmount(totals.receipt)}`,
      `Cash ${formatReceiptAmount(totals.cash)}`,
      `Card ${formatReceiptAmount(totals.card)}`,
      `Cheque ${formatReceiptAmount(totals.cheque)}`,
      `Slip ${formatReceiptAmount(totals.slip)}`,
      `E-Wallet ${formatReceiptAmount(totals.eWallet)}`,
    ].join('\n'),
    paymentRefs: '',
    isTotal: true,
  });

  return body;
}

export function acrPdfCompactRow(row: AcrCompactRow): string[] {
  if (row.isTotal) {
    return ['', row.dateUser, '', '', row.amounts, ''];
  }
  return [row.no, row.dateUser, row.receipt, row.agent, row.amounts, row.paymentRefs];
}
