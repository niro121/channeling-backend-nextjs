/**
 * Agent Balance — shared compact helpers for Print / PDF / Excel.
 */

import { formatLKR } from '@/lib/format-money';
import type { AgentBalanceReportRow } from '@/types/reports/agent-balance';

export const AGENT_BALANCE_PDF_HEADERS = [
  'No.',
  'Status',
  'Agent',
  'Contact',
  'Credit Limits',
  'Balance',
] as const;

export const AGENT_BALANCE_PDF_COL_PERCENTS = [5, 8, 24, 28, 22, 13] as const;

export type AgentBalanceCompactRow = {
  no: string;
  status: string;
  agent: string;
  contact: string;
  limits: string;
  balance: string;
  isTotal?: boolean;
};

export function mapAgentBalanceCompactRow(
  row: AgentBalanceReportRow,
  index: number
): AgentBalanceCompactRow {
  const parent =
    row.parentAgent && row.parentAgent !== '-' ? ` · Parent ${row.parentAgent}` : '';
  return {
    no: String(index + 1),
    status: row.status === 1 ? 'Active' : 'Inactive',
    agent: `${row.agentName || '-'}\nCode ${row.agentCode || '-'}${parent}`,
    contact: `${row.agentPhoneNo || '-'}\n${row.agentAddress || '-'}`,
    limits: `Hard ${formatLKR(row.hardCreditLimit)}\nAgency ${formatLKR(row.agencyCreditLimit)}\nAllowed ${formatLKR(row.allowedCreditLimit)}`,
    balance: formatLKR(row.agentBalance),
  };
}

export function buildAgentBalanceCompactRows(
  rows: AgentBalanceReportRow[],
  balanceTotal: number
): AgentBalanceCompactRow[] {
  return [
    ...rows.map(mapAgentBalanceCompactRow),
    {
      no: '',
      status: '',
      agent: 'Total',
      contact: '',
      limits: '',
      balance: formatLKR(balanceTotal),
      isTotal: true,
    },
  ];
}

export function agentBalancePdfCompactRow(row: AgentBalanceCompactRow): string[] {
  if (row.isTotal) {
    return ['', '', row.agent, '', '', row.balance];
  }
  return [row.no, row.status, row.agent, row.contact, row.limits, row.balance];
}
