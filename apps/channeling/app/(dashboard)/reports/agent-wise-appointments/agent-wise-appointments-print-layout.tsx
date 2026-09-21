'use client';

import { formatReceiptAmount } from '@/lib/format-money';
import { formatReportRangeOrdinalClipToYear } from '@/lib/format-report-range-label';
import type {
  AgentWiseAppointmentsDetailRow,
  AgentWiseAppointmentsMonthColumn,
  AgentWiseAppointmentsSummaryRow,
} from '@/types/reports/agent-wise-appointments';
import { monthSubLabelFromKey } from './agent-wise-appointments-export-config';

type SummaryProps = {
  mode: 'summary';
  monthColumns: AgentWiseAppointmentsMonthColumn[];
  summaryRows: AgentWiseAppointmentsSummaryRow[];
  summaryMonthTotals: Record<string, number>;
  summaryGrandTotal: number;
  from: string;
  to: string;
};

type DetailProps = {
  mode: 'detail';
  detailRows: AgentWiseAppointmentsDetailRow[];
  detailTotals: {
    hospitalFee: number;
    doctorFee: number;
    discount: number;
    totalFee: number;
  };
};

type Props = SummaryProps | DetailProps;

function groupMonthColumnsByYear(
  columns: AgentWiseAppointmentsMonthColumn[]
): Array<{ year: string; columns: AgentWiseAppointmentsMonthColumn[] }> {
  const groups: Array<{
    year: string;
    columns: AgentWiseAppointmentsMonthColumn[];
  }> = [];
  for (const c of columns) {
    const year = c.key.slice(0, 4);
    const last = groups[groups.length - 1];
    if (last?.year === year) last.columns.push(c);
    else groups.push({ year, columns: [c] });
  }
  return groups;
}

/**
 * Print-only A4 portrait for Agent Wise Appointments.
 * Summary: flat agent/month table. Detail: compact categorized columns.
 */
export function AgentWiseAppointmentsPrintLayout(props: Props) {
  return (
    <div className="awa-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm 8mm 12mm;
          }

          .agent-wise-appointments-report-root .awa-screen-table {
            display: none !important;
          }
          .agent-wise-appointments-report-root .awa-print-only {
            display: block !important;
          }

          .agent-wise-appointments-report-root .rpt-print-header {
            margin-bottom: 2mm !important;
          }
          .agent-wise-appointments-report-root .rpt-print-brand-row {
            height: 12mm !important;
            gap: 5mm !important;
          }
          .agent-wise-appointments-report-root .rpt-print-logo {
            height: 12mm !important;
            max-width: 44mm !important;
          }
          .agent-wise-appointments-report-root .rpt-print-titles {
            height: 12mm !important;
            padding: 2mm 0 0.4mm !important;
          }
          .agent-wise-appointments-report-root .rpt-print-org {
            height: 4mm !important;
            font-size: 13pt !important;
          }
          .agent-wise-appointments-report-root .rpt-print-title-gap {
            height: 0.6mm !important;
          }
          .agent-wise-appointments-report-root .rpt-print-report-name {
            height: 3.8mm !important;
            font-size: 9.5pt !important;
          }
          .agent-wise-appointments-report-root .rpt-print-rule {
            margin-top: 1.2mm !important;
          }
          .agent-wise-appointments-report-root .rpt-print-summary {
            margin-top: 2mm !important;
          }
          .agent-wise-appointments-report-root .rpt-print-summary-bar {
            padding: 0.9mm 2mm !important;
            font-size: 7pt !important;
          }
          .agent-wise-appointments-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1mm 3mm !important;
            padding: 1.5mm 2mm !important;
          }
          .agent-wise-appointments-report-root .rpt-print-label {
            margin: 0 0 0.3mm !important;
            font-size: 6pt !important;
          }
          .agent-wise-appointments-report-root .rpt-print-value {
            font-size: 8pt !important;
            line-height: 1.15 !important;
          }
          .agent-wise-appointments-report-root .rpt-print-body {
            margin-top: 2.5mm !important;
          }

          .agent-wise-appointments-report-root .rpt-print-root table.awa-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-family: Helvetica, Arial, sans-serif !important;
          }
          .agent-wise-appointments-report-root .rpt-print-root table.awa-print-table thead {
            display: table-header-group !important;
          }
          .agent-wise-appointments-report-root .rpt-print-root table.awa-print-table th,
          .agent-wise-appointments-report-root .rpt-print-root table.awa-print-table td {
            border: 0.2mm solid #000 !important;
            color: #000 !important;
            background: #fff !important;
            padding: 0.9mm 0.8mm !important;
            font-size: 6.5pt !important;
            line-height: 1.2 !important;
            font-weight: 400 !important;
            vertical-align: top !important;
            text-align: left !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .agent-wise-appointments-report-root .rpt-print-root table.awa-print-table th {
            background: #e8e8e8 !important;
            font-weight: 700 !important;
            font-size: 6pt !important;
            text-align: left !important;
            vertical-align: middle !important;
          }
          .agent-wise-appointments-report-root .rpt-print-root table.awa-print-table th *,
          .agent-wise-appointments-report-root .rpt-print-root table.awa-print-table td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: #000 !important;
          }
          .agent-wise-appointments-report-root .rpt-print-root table.awa-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .agent-wise-appointments-report-root .awa-line {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .agent-wise-appointments-report-root .awa-strong {
            font-weight: 700 !important;
          }
          .agent-wise-appointments-report-root .awa-muted {
            color: #333 !important;
            font-size: 5.75pt !important;
          }
          .agent-wise-appointments-report-root .awa-k {
            font-weight: 700 !important;
            margin-right: 0.6mm !important;
          }
          .agent-wise-appointments-report-root .awa-clamp2 {
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            overflow: hidden !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            max-height: 2.5em !important;
          }
          .agent-wise-appointments-report-root .awa-nums {
            text-align: right !important;
            font-variant-numeric: tabular-nums !important;
            white-space: nowrap !important;
          }
          .agent-wise-appointments-report-root .awa-center {
            text-align: center !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
          }
          .agent-wise-appointments-report-root .rpt-print-root table.awa-print-table tr.awa-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
            vertical-align: middle !important;
          }

          .agent-wise-appointments-report-root .awa-d0 { width: 4% !important; }
          .agent-wise-appointments-report-root .awa-d1 { width: 14% !important; }
          .agent-wise-appointments-report-root .awa-d2 { width: 13% !important; }
          .agent-wise-appointments-report-root .awa-d3 { width: 12% !important; }
          .agent-wise-appointments-report-root .awa-d4 { width: 12% !important; }
          .agent-wise-appointments-report-root .awa-d5 { width: 14% !important; }
          .agent-wise-appointments-report-root .awa-d6 { width: 12% !important; }
          .agent-wise-appointments-report-root .awa-d7 { width: 19% !important; }

          .agent-wise-appointments-report-root .awa-s-name { width: 22% !important; }
          .agent-wise-appointments-report-root .awa-s-code { width: 10% !important; }
          .agent-wise-appointments-report-root .awa-s-total { width: 10% !important; }
        }

        @media screen {
          .agent-wise-appointments-report-root .awa-print-only {
            display: none !important;
          }
        }
      `}</style>

      {props.mode === 'summary' ? (
        <SummaryPrintTable {...props} />
      ) : (
        <DetailPrintTable {...props} />
      )}
    </div>
  );
}

function SummaryPrintTable({
  monthColumns,
  summaryRows,
  summaryMonthTotals,
  summaryGrandTotal,
  from,
  to,
}: SummaryProps) {
  const yearGroups = groupMonthColumnsByYear(monthColumns);
  const colSpan = 2 + monthColumns.length + 1;

  return (
    <table className="awa-print-table">
      <thead>
        {monthColumns.length === 0 ? (
          <tr>
            <th className="awa-s-name">Agent name</th>
            <th className="awa-s-code">Agent code</th>
            <th className="awa-s-total awa-nums">Grand total</th>
          </tr>
        ) : (
          <>
            <tr>
              <th className="awa-s-name" rowSpan={2}>
                Agent name
              </th>
              <th className="awa-s-code" rowSpan={2}>
                Agent code
              </th>
              {yearGroups.map(({ year, columns }) => (
                <th
                  key={year}
                  colSpan={columns.length}
                  style={{ textAlign: 'center' }}
                >
                  <span className="awa-line awa-strong">{year}</span>
                  <span className="awa-line awa-muted">
                    {formatReportRangeOrdinalClipToYear(year, from, to)}
                  </span>
                </th>
              ))}
              <th className="awa-s-total awa-nums" rowSpan={2}>
                Grand total
              </th>
            </tr>
            <tr>
              {monthColumns.map((c) => (
                <th key={c.key} className="awa-nums">
                  {monthSubLabelFromKey(c.key)}
                </th>
              ))}
            </tr>
          </>
        )}
      </thead>
      <tbody>
        {summaryRows.length === 0 ? (
          <tr>
            <td colSpan={Math.max(3, colSpan)} className="awa-center">
              No records found.
            </td>
          </tr>
        ) : (
          <>
            {summaryRows.map((r) => (
              <tr key={r.agencyId}>
                <td className="awa-s-name">{r.agentNameWithCode}</td>
                <td className="awa-s-code">{r.agentCode || '—'}</td>
                {monthColumns.map((c) => (
                  <td key={c.key} className="awa-nums">
                    {r.monthCounts[c.key] ?? 0}
                  </td>
                ))}
                <td className="awa-s-total awa-nums">{r.grandTotal}</td>
              </tr>
            ))}
            <tr className="awa-total">
              <td className="awa-s-name">Total</td>
              <td className="awa-s-code" />
              {monthColumns.map((c) => (
                <td key={c.key} className="awa-nums">
                  {summaryMonthTotals[c.key] ?? 0}
                </td>
              ))}
              <td className="awa-s-total awa-nums">{summaryGrandTotal}</td>
            </tr>
          </>
        )}
      </tbody>
    </table>
  );
}

function DetailPrintTable({ detailRows, detailTotals }: DetailProps) {
  return (
    <table className="awa-print-table">
      <colgroup>
        <col className="awa-d0" />
        <col className="awa-d1" />
        <col className="awa-d2" />
        <col className="awa-d3" />
        <col className="awa-d4" />
        <col className="awa-d5" />
        <col className="awa-d6" />
        <col className="awa-d7" />
      </colgroup>
      <thead>
        <tr>
          <th className="awa-d0">#</th>
          <th className="awa-d1">Agent</th>
          <th className="awa-d2">Consultant</th>
          <th className="awa-d3">Appointment</th>
          <th className="awa-d4">Bill / Status</th>
          <th className="awa-d5">Patient</th>
          <th className="awa-d6">Creator</th>
          <th className="awa-d7">Fees</th>
        </tr>
      </thead>
      <tbody>
        {detailRows.length === 0 ? (
          <tr>
            <td colSpan={8} className="awa-center">
              No records found.
            </td>
          </tr>
        ) : (
          <>
            {detailRows.map((r, i) => {
              const [creatorName, ...rest] = (r.creatorLabel || '').split('\n');
              const creatorDate = rest.join('\n').trim();
              return (
                <tr key={r.id}>
                  <td className="awa-d0 awa-center">{i + 1}</td>
                  <td className="awa-d1">
                    <span className="awa-line awa-strong awa-clamp2">
                      {r.agentNameWithCode || '—'}
                    </span>
                    <span className="awa-line awa-muted">Ref {r.agentRef || '—'}</span>
                  </td>
                  <td className="awa-d2">
                    <span className="awa-line awa-clamp2">
                      {r.consultantNameWithCode || '—'}
                    </span>
                  </td>
                  <td className="awa-d3">
                    <span className="awa-line">{r.appointmentDateLabel || '—'}</span>
                    <span className="awa-line awa-muted">{r.appointmentTimeLabel || '—'}</span>
                    <span className="awa-line awa-muted">No. {r.appointmentNo}</span>
                  </td>
                  <td className="awa-d4">
                    <span className="awa-line">{r.billNumber || '—'}</span>
                    <span className="awa-line awa-muted">{r.statusLabel || '—'}</span>
                  </td>
                  <td className="awa-d5">
                    <span className="awa-line awa-clamp2">{r.patientName || '—'}</span>
                    <span className="awa-line awa-muted">{r.patientPhone || '—'}</span>
                  </td>
                  <td className="awa-d6">
                    <span className="awa-line awa-clamp2">{creatorName?.trim() || '—'}</span>
                    {creatorDate ? (
                      <span className="awa-line awa-muted">{creatorDate}</span>
                    ) : null}
                  </td>
                  <td className="awa-d7">
                    <span className="awa-line">
                      <span className="awa-k">Hosp</span>
                      {formatReceiptAmount(r.hospitalFee)}
                    </span>
                    <span className="awa-line">
                      <span className="awa-k">Doc</span>
                      {formatReceiptAmount(r.doctorFee)}
                    </span>
                    <span className="awa-line">
                      <span className="awa-k">Disc</span>
                      {formatReceiptAmount(r.discount)}
                    </span>
                    <span className="awa-line awa-strong">
                      <span className="awa-k">Total</span>
                      {formatReceiptAmount(r.totalFee)}
                    </span>
                  </td>
                </tr>
              );
            })}
            <tr className="awa-total">
              <td className="awa-d0 awa-center">{detailRows.length}</td>
              <td className="awa-d1" colSpan={6}>
                Total
              </td>
              <td className="awa-d7">
                <span className="awa-line">
                  <span className="awa-k">Hosp</span>
                  {formatReceiptAmount(detailTotals.hospitalFee)}
                </span>
                <span className="awa-line">
                  <span className="awa-k">Doc</span>
                  {formatReceiptAmount(detailTotals.doctorFee)}
                </span>
                <span className="awa-line">
                  <span className="awa-k">Disc</span>
                  {formatReceiptAmount(detailTotals.discount)}
                </span>
                <span className="awa-line">
                  <span className="awa-k">Total</span>
                  {formatReceiptAmount(detailTotals.totalFee)}
                </span>
              </td>
            </tr>
          </>
        )}
      </tbody>
    </table>
  );
}
