/**
 * Channel Agent Reference Book — shared compact helpers for Print / PDF / Excel.
 */

import moment from 'moment';
import type { AgencyBook } from '@/types/agencybook';
import type { ExportChannelAgentReferenceBookData } from '@/types/report';

export type ChannelAgentReferenceBookCompactRow = {
  sNo: string;
  bookNumber: string;
  pages: string;
  startRef: string;
  endRef: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  status: string;
  agentTitle: string;
};

function dash(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

function formatStamp(value: Date | string | null | undefined): string {
  if (!value || value === '-') return '-';
  const parsed = moment(
    value,
    ['YYYY-MM-DD hh:mm A', 'YYYY-MM-DD HH:mm:ss', 'DD/MM/YY hh:mm A', moment.ISO_8601],
    true
  );
  if (parsed.isValid()) return parsed.format('DD/MM/YY hh:mm A');
  const fallback = moment(value);
  return fallback.isValid() ? fallback.format('DD/MM/YY hh:mm A') : dash(value);
}

export function agentGroupTitleFromName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed || trimmed === '-') return 'UNASSIGNED AGENT';
  return trimmed.toUpperCase();
}

export function mapChannelAgentReferenceBookCompactFromReportRow(
  row: AgencyBook
): ChannelAgentReferenceBookCompactRow {
  const hasUpdater = Boolean(row.updatedBy);
  return {
    sNo: row.sNo != null ? String(row.sNo) : '-',
    bookNumber: dash(row.bookNumber).toUpperCase(),
    pages: row.utilizedPageCount != null ? String(row.utilizedPageCount) : '-',
    startRef: dash(row.startNumber),
    endRef: dash(row.endNumber),
    createdBy: dash(row.createdUser?.name),
    createdAt: formatStamp(row.createdAt),
    updatedBy: hasUpdater ? dash(row.updatedUser?.name) : '-',
    updatedAt: hasUpdater ? formatStamp(row.updatedAt) : '-',
    status: row.status === 1 ? 'Active' : 'Inactive',
    agentTitle: agentGroupTitleFromName(row.agency?.name),
  };
}

export function mapChannelAgentReferenceBookCompactFromExportRow(
  row: ExportChannelAgentReferenceBookData
): ChannelAgentReferenceBookCompactRow {
  const hasUpdater = Boolean(row.updatedBy && row.updatedBy !== '-');
  return {
    sNo: row.sNo != null ? String(row.sNo) : '-',
    bookNumber: dash(row.bookNumber).toUpperCase(),
    pages: dash(row.utilizedPageCount),
    startRef: dash(row.startingReferenceNumber),
    endRef: dash(row.endingReferenceNumber),
    createdBy: dash(row.createdBy),
    createdAt: formatStamp(row.createdDate),
    updatedBy: hasUpdater ? dash(row.updatedBy) : '-',
    updatedAt: hasUpdater ? formatStamp(row.updatedDate) : '-',
    status: dash(row.active),
    agentTitle: agentGroupTitleFromName(row.agent),
  };
}

export const CHANNEL_AGENT_REF_PDF_HEADERS = [
  'S.No',
  'Book',
  'Reference',
  'Pages',
  'Created',
  'Updated',
  'Status',
] as const;

/** Column widths as % of content width — matches print colgroup. */
export const CHANNEL_AGENT_REF_PDF_COL_PERCENTS = [7, 16, 22, 10, 18, 18, 9] as const;

export function channelAgentReferenceBookPdfCompactRow(
  row: ChannelAgentReferenceBookCompactRow
): string[] {
  return [
    row.sNo,
    row.bookNumber,
    `Start: ${row.startRef}\nEnd: ${row.endRef}`,
    row.pages,
    `${row.createdBy}\n${row.createdAt}`,
    `${row.updatedBy}\n${row.updatedAt}`,
    row.status,
  ];
}

export function groupChannelAgentReferenceBookExportRows(
  rows: ExportChannelAgentReferenceBookData[]
): Map<string, ExportChannelAgentReferenceBookData[]> {
  const groups = new Map<string, ExportChannelAgentReferenceBookData[]>();
  for (const row of rows) {
    const key = agentGroupTitleFromName(row.agent);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }
  return groups;
}
