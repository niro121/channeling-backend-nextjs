import type { UnreconciledHandoversReportExportRow } from '@/types/reports/unreconciled-handovers';

function rupees(cents: number | null): number | string {
  if (cents == null) return '—';
  return cents / 100;
}

export function unreconciledBalanceBody(
  rows: UnreconciledHandoversReportExportRow[]
): (string | number)[][] {
  return rows
    .filter((row) => row.rowKind === 'balance')
    .map((row) => [
      row.method,
      rupees(row.tillCents),
      rupees(row.undeductedCents),
      rupees(row.differenceCents),
      row.note,
    ]);
}

export function unreconciledDetailBody(
  rows: UnreconciledHandoversReportExportRow[]
): (string | number)[][] {
  const body = rows
    .filter((row) => row.rowKind !== 'balance')
    .map((row) => [
      row.handover,
      row.reconciliationNo,
      row.fromUser,
      row.createdAt,
      row.status,
      row.receipt,
      row.sourceHandover,
      row.rowKind === 'item' ? row.method : '',
      row.rowKind === 'item' ? row.bank : '',
      row.rowKind === 'item' ? row.reference : '',
      rupees(row.amountCents),
      row.why,
    ]);
  const total = rows
    .filter((row) => row.rowKind === 'item')
    .reduce((sum, row) => sum + (row.amountCents ?? 0), 0);
  body.push(['', '', '', '', '', 'Grand total', '', '', '', '', total / 100, '']);
  return body;
}

export const BALANCE_COLUMNS = ['Method', 'Till balance', 'Not deducted', 'Difference', 'Note'];

export const DETAIL_COLUMNS = [
  'Handover',
  'Recon',
  'From',
  'Created',
  'Status',
  'Receipt',
  'Included',
  'Method',
  'Bank',
  'Reference',
  'Amount',
  'Why',
];
