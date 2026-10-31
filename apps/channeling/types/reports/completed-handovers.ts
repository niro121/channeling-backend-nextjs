import { formatCents } from '@/lib/format-money';

/** Shorts recorded on the handover, in report column order. */
export const HANDOVER_REPORT_SHORT_FIELDS = [
  { key: 'shortCashCents', label: 'Cash' },
  { key: 'shortCardCents', label: 'Card' },
  { key: 'shortSlipCents', label: 'Slip' },
  { key: 'shortCheckCents', label: 'Cheque' },
  { key: 'shortCreditCents', label: 'Credit' },
  { key: 'shortEWalletCents', label: 'E-wallet' },
] as const;

export type HandoverReportVarianceKind = 'short' | 'excess';

export type HandoverReportVarianceLine = {
  label: string;
  kind: HandoverReportVarianceKind;
  cents: number;
};

export type HandoverReportVarianceSource = {
  shortCashCents?: number | null;
  shortCardCents?: number | null;
  shortSlipCents?: number | null;
  shortCheckCents?: number | null;
  shortCreditCents?: number | null;
  shortEWalletCents?: number | null;
  /** Cash counted above the till and used to settle a previous short. */
  settlementCents?: number | null;
};

/** Non-zero shorts by payment type, then cash excess from the short settlement. */
export function handoverReportVarianceLines(
  source: HandoverReportVarianceSource
): HandoverReportVarianceLine[] {
  const lines: HandoverReportVarianceLine[] = [];
  for (const field of HANDOVER_REPORT_SHORT_FIELDS) {
    const cents = source[field.key] ?? 0;
    if (cents > 0) lines.push({ label: field.label, kind: 'short', cents });
  }
  const excessCents = source.settlementCents ?? 0;
  if (excessCents > 0) lines.push({ label: 'Cash', kind: 'excess', cents: excessCents });
  return lines;
}

export function sumHandoverReportVariances(
  rows: Array<{ variances: HandoverReportVarianceLine[] }>
): HandoverReportVarianceLine[] {
  const shortTotals: Record<string, number> = {};
  for (const field of HANDOVER_REPORT_SHORT_FIELDS) shortTotals[field.label] = 0;
  let excessCashCents = 0;
  for (const row of rows) {
    for (const line of row.variances ?? []) {
      if (line.kind === 'excess') excessCashCents += line.cents;
      else shortTotals[line.label] = (shortTotals[line.label] ?? 0) + line.cents;
    }
  }
  return handoverReportVarianceLines({
    shortCashCents: shortTotals.Cash,
    shortCardCents: shortTotals.Card,
    shortSlipCents: shortTotals.Slip,
    shortCheckCents: shortTotals.Cheque,
    shortCreditCents: shortTotals.Credit,
    shortEWalletCents: shortTotals['E-wallet'],
    settlementCents: excessCashCents,
  });
}

export function formatHandoverReportVariance(
  lines: HandoverReportVarianceLine[],
  empty = '—'
): string {
  if (lines.length === 0) return empty;
  return lines
    .map((line) => `${line.label} ${line.kind} ${formatCents(line.cents)}`)
    .join('\n');
}

export type CompletedHandoversReportQuery = {
  /** YYYY-MM-DD or YYYY-MM-DDTHH:mm */
  dateFrom: string;
  /** YYYY-MM-DD or YYYY-MM-DDTHH:mm */
  dateTo: string;
  /** '__all__' or User.id — handed over by */
  fromUserId?: string;
  /** '__all__' or User.id — handed over to */
  toUserId?: string;
  /** '__all__' | 'pending' | 'approved' | 'rejected' */
  status?: string;
  /** '__all__' | 'pending' | 'in_reconciliation' | 'reconciled' | 'rejected' */
  reconciliationStatus?: string;
};

export type CompletedHandoversReportRow = {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  shiftStartedAt: Date | null;
  cashCents: number;
  cardCents: number;
  slipCents: number;
  checkCents: number;
  creditCents: number;
  eWalletCents: number;
  totalCents: number;
  variances: HandoverReportVarianceLine[];
  status: number;
  statusLabel: string;
  reconciliationStatus: number;
  reconciliationStatusLabel: string;
  createdAt: Date | null;
  completedAt: Date | null;
  discrepancyReason: string | null;
  cashierSummaryUrl: string | null;
};

export type CompletedHandoversReportExportRow = {
  no: string;
  fromUser: string;
  toUser: string;
  shiftStartedAt: string;
  cash: string;
  card: string;
  slip: string;
  cheque: string;
  credit: string;
  eWallet: string;
  total: string;
  excessOrShort: string;
  shortCashCents: number;
  shortCardCents: number;
  shortSlipCents: number;
  shortCheckCents: number;
  shortCreditCents: number;
  shortEWalletCents: number;
  settlementCents: number;
  status: string;
  reconciliationStatus: string;
  createdAt: string;
  completedAt: string;
  discrepancyReason: string;
};
