/**
 * Agent Detail Report — shared compact helpers for Print / PDF / Excel.
 */

import moment from 'moment';
import type { Agency } from '@/types/agency';
import type { ExportAgentDetailData } from '@/types/report';
import { formatLKR } from '@/lib/format-money';

export type AgentDetailCompactRow = {
  createdDate: string;
  createdTime: string;
  code: string;
  name: string;
  status: string;
  addressLines: string[];
  phone: string;
  fax: string;
  email: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  allowedCredit: string;
  maxCredit: string;
  standardCredit: string;
  balance: string;
  allowedCreditNum: number;
  maxCreditNum: number;
  standardCreditNum: number;
  balanceNum: number;
};

function dash(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

function formatStamp(value: Date | string | null | undefined): { date: string; time: string } {
  if (!value || value === '-') return { date: '-', time: '-' };
  const parsed = moment(
    value,
    ['YYYY-MM-DD hh:mm A', 'YYYY-MM-DD HH:mm:ss', 'DD/MM/YY hh:mm A', moment.ISO_8601],
    true
  );
  const m = parsed.isValid() ? parsed : moment(value);
  if (!m.isValid()) return { date: '-', time: '-' };
  return {
    date: m.format('DD/MM/YY'),
    time: m.format('hh:mm A'),
  };
}

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '0.00';
  return formatLKR(Number(value));
}

function parseMoney(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isNaN(value) ? 0 : value;
  if (value == null || value === '') return 0;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

function normalizeStatus(status: string | number | null | undefined): string {
  if (status === 1 || status === '1' || status === 'Active' || status === 'Published') {
    return 'Published';
  }
  if (status === 0 || status === '0' || status === 'Inactive' || status === 'Unpublished') {
    return 'Unpublished';
  }
  return dash(status);
}

export function mapAgentDetailCompactFromReportRow(row: Agency): AgentDetailCompactRow {
  const stamp = formatStamp(row.createdAt);
  const addressParts = [row.addressLine1, row.addressLine2, row.city]
    .map((p) => (p ?? '').trim())
    .filter(Boolean);
  const allowed = typeof row.allowedCreditLimit === 'number' ? row.allowedCreditLimit : 0;
  const max = typeof row.maxCreditLimit === 'number' ? row.maxCreditLimit : 0;
  const standard = typeof row.standardCreditLimit === 'number' ? row.standardCreditLimit : 0;
  const balance = typeof row.balance === 'number' ? row.balance : 0;

  return {
    createdDate: stamp.date,
    createdTime: stamp.time,
    code: dash(row.code).toUpperCase(),
    name: dash(row.name).toUpperCase(),
    status: normalizeStatus(row.status),
    addressLines: addressParts.length > 0 ? addressParts : ['-'],
    phone: dash(row.phone),
    fax: dash(row.fax),
    email: dash(row.email),
    contactName: dash(row.contactPersonName),
    contactPhone: dash(row.contactPersonPhone),
    contactEmail: dash(row.contactPersonEmail),
    allowedCredit: formatMoney(allowed),
    maxCredit: formatMoney(max),
    standardCredit: formatMoney(standard),
    balance: formatMoney(balance),
    allowedCreditNum: allowed,
    maxCreditNum: max,
    standardCreditNum: standard,
    balanceNum: balance,
  };
}

export function mapAgentDetailCompactFromExportRow(
  row: ExportAgentDetailData
): AgentDetailCompactRow {
  const stamp = formatStamp(row.created);
  const addressParts = dash(row.address)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const allowed = parseMoney(row.allowedCreditLimit);
  const max = parseMoney(row.maxCreditLimit);
  const standard = parseMoney(row.standardCreditLimit);
  const balance = parseMoney(row.balance);

  return {
    createdDate: stamp.date,
    createdTime: stamp.time,
    code: dash(row.agentCode).toUpperCase(),
    name: dash(row.agentName).toUpperCase(),
    status: normalizeStatus(row.status),
    addressLines: addressParts.length > 0 ? addressParts : ['-'],
    phone: dash(row.phone),
    fax: dash(row.fax),
    email: dash(row.email),
    contactName: dash(row.contactPerson),
    contactPhone: dash(row.contactPhone),
    contactEmail: dash(row.contactPersonEmail),
    allowedCredit: formatMoney(allowed),
    maxCredit: formatMoney(max),
    standardCredit: formatMoney(standard),
    balance: formatMoney(balance),
    allowedCreditNum: allowed,
    maxCreditNum: max,
    standardCreditNum: standard,
    balanceNum: balance,
  };
}

export const AGENT_DETAIL_PDF_HEADERS = [
  'Created',
  'Agent',
  'Status',
  'Address / Reach',
  'Contact',
  'Credit Limits',
] as const;

export const AGENT_DETAIL_PDF_COL_PERCENTS = [11, 16, 9, 22, 20, 22] as const;

export function agentDetailPdfCompactRow(row: AgentDetailCompactRow): string[] {
  return [
    `${row.createdDate}\n${row.createdTime}`,
    `${row.code}\n${row.name}`,
    row.status,
    [
      ...row.addressLines,
      `Ph ${row.phone}`,
      `Fax ${row.fax}`,
      `Mail ${row.email}`,
    ].join('\n'),
    [`${row.contactName}`, `Ph ${row.contactPhone}`, `Mail ${row.contactEmail}`].join('\n'),
    [
      `Allowed ${row.allowedCredit}`,
      `Max ${row.maxCredit}`,
      `Std ${row.standardCredit}`,
      `Bal ${row.balance}`,
    ].join('\n'),
  ];
}

export function sumAgentDetailCreditTotals(rows: AgentDetailCompactRow[]): {
  allowed: number;
  max: number;
  standard: number;
  balance: number;
} {
  return rows.reduce(
    (acc, row) => ({
      allowed: acc.allowed + row.allowedCreditNum,
      max: acc.max + row.maxCreditNum,
      standard: acc.standard + row.standardCreditNum,
      balance: acc.balance + row.balanceNum,
    }),
    { allowed: 0, max: 0, standard: 0, balance: 0 }
  );
}

export { formatMoney as formatAgentDetailMoney };
