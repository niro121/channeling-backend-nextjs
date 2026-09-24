/**
 * Agent History (Credit Limit Update) — shared compact helpers for Print / PDF / Excel.
 * Columns: No. | Agent | Limit | Values | Changed by | Remark | Date & Time
 */

import moment from 'moment';
import { formatLKR } from '@/lib/format-money';
import type {
  AgentHistoryCreditLimitUpdateReportExportRow,
  AgentHistoryCreditLimitUpdateReportRow,
} from '@/types/reports/agent-history-credit-limit-update';
import { creditLimitChangeRemark } from '@/lib/credit-limit-change-remark';

export const AHCLU_PDF_HEADERS = [
  'No.',
  'Agent',
  'Limit',
  'Values',
  'Changed by',
  'Remark',
  'Date & Time',
] as const;

export const AHCLU_PDF_COL_PERCENTS = [5, 18, 12, 20, 14, 18, 13] as const;

export type AhcluCompactRow = {
  no: string;
  agent: string;
  limit: string;
  values: string;
  changedBy: string;
  remark: string;
  dateTime: string;
};

export function limitTypeShortLabel(
  limitType: AgentHistoryCreditLimitUpdateReportRow['limitType']
): string {
  if (limitType === 'soft') return 'Soft';
  if (limitType === 'credit') return 'Credit';
  return 'Hard';
}

export function hardLimitFieldLabel(
  row: Pick<AgentHistoryCreditLimitUpdateReportRow, 'limitType' | 'hardLimitField'>
): string {
  if (row.limitType !== 'hard') return '—';
  if (row.hardLimitField === 'minBalanceAllowed') return 'Minimum balance';
  if (row.hardLimitField === 'maxBalanceAllowed') return 'Maximum balance';
  return 'Hard limit';
}

function moneyOrDash(value: number | null | undefined): string {
  if (value == null) return '—';
  return formatLKR(value);
}

export function mapAhcluCompactFromReportRow(
  row: AgentHistoryCreditLimitUpdateReportRow,
  index: number
): AhcluCompactRow {
  const limitType = limitTypeShortLabel(row.limitType);
  const field =
    row.limitType === 'hard' ? `\n${hardLimitFieldLabel(row)}` : '';
  const date = row.createdAt ? moment(row.createdAt).format('YYYY-MM-DD') : '—';
  const time = row.createdAt ? moment(row.createdAt).format('HH:mm:ss') : '';

  return {
    no: String(index + 1),
    agent: `${row.agencyName || '—'}\nCode ${row.agencyCode || '—'}`,
    limit: `${limitType}${field}`,
    values: `Before ${moneyOrDash(row.oldValue)}\nUpdated ${moneyOrDash(row.newValue)}\nDelta ${moneyOrDash(row.delta)}`,
    changedBy: row.changedByUserName || '—',
    remark: creditLimitChangeRemark(row.metadata),
    dateTime: time ? `${date}\n${time}` : date,
  };
}

export function mapAhcluCompactFromExportRow(
  row: AgentHistoryCreditLimitUpdateReportExportRow
): AhcluCompactRow {
  const limitType = row.limitType.replace(/\s*limit$/i, '') || '—';
  const field =
    row.hardLimitField && row.hardLimitField !== '-'
      ? `\n${row.hardLimitField}`
      : '';
  const stamp = moment(row.dateTime, ['YYYY-MM-DD HH:mm:ss', moment.ISO_8601], true);
  const date = stamp.isValid() ? stamp.format('YYYY-MM-DD') : row.dateTime || '—';
  const time = stamp.isValid() ? stamp.format('HH:mm:ss') : '';

  const before =
    row.beforeValue === '-' || row.beforeValue === ''
      ? '—'
      : formatLKR(Number(row.beforeValue));
  const updated =
    row.updatedValue === '-' || row.updatedValue === ''
      ? '—'
      : formatLKR(Number(row.updatedValue));
  const delta =
    row.delta === '-' || row.delta === ''
      ? '—'
      : formatLKR(Number(row.delta));

  return {
    no: row.no || '—',
    agent: `${row.agent || '—'}\nCode ${row.agentCode || '—'}`,
    limit: `${limitType}${field}`,
    values: `Before ${before}\nUpdated ${updated}\nDelta ${delta}`,
    changedBy: row.changedBy || '—',
    remark: !row.remark || row.remark === '-' ? '—' : row.remark,
    dateTime: time ? `${date}\n${time}` : date,
  };
}

export function buildAhcluCompactRowsFromExport(
  rows: AgentHistoryCreditLimitUpdateReportExportRow[]
): AhcluCompactRow[] {
  return rows.map(mapAhcluCompactFromExportRow);
}

export function ahcluPdfCompactRow(row: AhcluCompactRow): string[] {
  return [row.no, row.agent, row.limit, row.values, row.changedBy, row.remark, row.dateTime];
}
