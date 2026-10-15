/**
 * Agent Wise Appointments — shared helpers for Print / PDF / Excel.
 * Summary: flat columns. Detail: compact categorized columns for A4 portrait.
 */

import { formatReceiptAmount } from '@/lib/format-money';
import type {
  AgentWiseAppointmentsDetailRow,
  AgentWiseAppointmentsMonthColumn,
  AgentWiseAppointmentsSummaryRow,
} from '@/types/reports/agent-wise-appointments';

/** Detail compact: # | Agent | Consultant | Appointment | Bill / Status | Patient | Creator | Fees */
export const AWA_DETAIL_PDF_HEADERS = [
  '#',
  'Agent',
  'Consultant',
  'Appointment',
  'Bill / Status',
  'Patient',
  'Creator',
  'Fees',
] as const;

export const AWA_DETAIL_PDF_COL_PERCENTS = [4, 14, 13, 12, 12, 14, 12, 19] as const;

export type AwaDetailCompactRow = {
  no: string;
  agent: string;
  consultant: string;
  appointment: string;
  billStatus: string;
  patient: string;
  creator: string;
  fees: string;
  isTotal?: boolean;
};

export function mapAwaDetailCompactRow(
  row: AgentWiseAppointmentsDetailRow,
  index: number
): AwaDetailCompactRow {
  return {
    no: String(index + 1),
    agent: `${row.agentNameWithCode || '—'}\nRef ${row.agentRef || '—'}`,
    consultant: row.consultantNameWithCode || '—',
    appointment: `${row.appointmentDateLabel || '—'}\n${row.appointmentTimeLabel || '—'}\nNo. ${row.appointmentNo}`,
    billStatus: `${row.billNumber || '—'}\n${row.statusLabel || '—'}`,
    patient: `${row.patientName || '—'}\n${row.patientPhone || '—'}`,
    creator: row.creatorLabel || '—',
    fees: `Hosp ${formatReceiptAmount(row.hospitalFee)}\nDoc ${formatReceiptAmount(row.doctorFee)}\nDisc ${formatReceiptAmount(row.discount)}\nTotal ${formatReceiptAmount(row.totalFee)}`,
  };
}

export function buildAwaDetailCompactRows(
  rows: AgentWiseAppointmentsDetailRow[],
  totals: {
    hospitalFee: number;
    doctorFee: number;
    discount: number;
    totalFee: number;
  }
): AwaDetailCompactRow[] {
  return [
    ...rows.map(mapAwaDetailCompactRow),
    {
      no: String(rows.length),
      agent: 'Total',
      consultant: '',
      appointment: '',
      billStatus: '',
      patient: '',
      creator: '',
      fees: `Hosp ${formatReceiptAmount(totals.hospitalFee)}\nDoc ${formatReceiptAmount(totals.doctorFee)}\nDisc ${formatReceiptAmount(totals.discount)}\nTotal ${formatReceiptAmount(totals.totalFee)}`,
      isTotal: true,
    },
  ];
}

export function awaDetailPdfCompactRow(row: AwaDetailCompactRow): string[] {
  if (row.isTotal) {
    return [row.no, row.agent, '', '', '', '', '', row.fees];
  }
  return [
    row.no,
    row.agent,
    row.consultant,
    row.appointment,
    row.billStatus,
    row.patient,
    row.creator,
    row.fees,
  ];
}

export function monthSubLabelFromKey(key: string): string {
  const d = new Date(`${key}-15T12:00:00+05:30`);
  return d.toLocaleString('en-GB', {
    timeZone: 'Asia/Colombo',
    month: 'long',
  });
}

export function buildAwaSummaryPdfHeaders(
  monthColumns: AgentWiseAppointmentsMonthColumn[]
): string[] {
  return [
    'Agent Name',
    'Agent Code',
    ...monthColumns.map((c) => monthSubLabelFromKey(c.key)),
    'Grand Total',
  ];
}

/** Even widths: name wider, months share remainder, grand total fixed-ish. */
export function buildAwaSummaryColPercents(monthCount: number): number[] {
  const namePct = 22;
  const codePct = 10;
  const totalPct = 10;
  const monthsPct = Math.max(0, 100 - namePct - codePct - totalPct);
  const each = monthCount > 0 ? monthsPct / monthCount : 0;
  return [namePct, codePct, ...Array.from({ length: monthCount }, () => each), totalPct];
}

export function buildAwaSummaryPdfBody(
  rows: AgentWiseAppointmentsSummaryRow[],
  monthColumns: AgentWiseAppointmentsMonthColumn[],
  monthTotals: Record<string, number>,
  grandTotal: number
): string[][] {
  const body = rows.map((r) => [
    r.agentNameWithCode || '—',
    r.agentCode || '—',
    ...monthColumns.map((c) => String(r.monthCounts[c.key] ?? 0)),
    String(r.grandTotal),
  ]);
  body.push([
    'Total',
    '',
    ...monthColumns.map((c) => String(monthTotals[c.key] ?? 0)),
    String(grandTotal),
  ]);
  return body;
}
