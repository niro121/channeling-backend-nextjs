'use client';

import { formatLKR } from '@/lib/format-money';
import type { AgentBalanceReportRow } from '@/types/reports/agent-balance';

type Props = {
  rows: AgentBalanceReportRow[];
  balanceTotal: number;
};

/**
 * Print-only compact A4 portrait for Agent Balance.
 * Categorized columns so Phone stays one line; text fields max ~2 lines.
 *
 * Columns: No. | Status | Agent | Contact | Limits | Balance
 */
export function AgentBalancePrintLayout({ rows, balanceTotal }: Props) {
  return (
    <div className="ab-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm 8mm 12mm;
          }

          /* Never print the on-screen table. */
          .agent-balance-report-root .ab-screen-table {
            display: none !important;
          }
          .agent-balance-report-root .ab-print-only {
            display: block !important;
          }

          .agent-balance-report-root .rpt-print-header {
            margin-bottom: 2mm !important;
          }
          .agent-balance-report-root .rpt-print-brand-row {
            height: 12mm !important;
            gap: 5mm !important;
          }
          .agent-balance-report-root .rpt-print-logo {
            height: 12mm !important;
            max-width: 44mm !important;
          }
          .agent-balance-report-root .rpt-print-titles {
            height: 12mm !important;
            padding: 2mm 0 0.4mm !important;
          }
          .agent-balance-report-root .rpt-print-org {
            height: 4mm !important;
            font-size: 13pt !important;
          }
          .agent-balance-report-root .rpt-print-title-gap {
            height: 0.6mm !important;
          }
          .agent-balance-report-root .rpt-print-report-name {
            height: 3.8mm !important;
            font-size: 9.5pt !important;
          }
          .agent-balance-report-root .rpt-print-rule {
            margin-top: 1.2mm !important;
          }
          .agent-balance-report-root .rpt-print-summary {
            margin-top: 2mm !important;
          }
          .agent-balance-report-root .rpt-print-summary-bar {
            padding: 0.9mm 2mm !important;
            font-size: 7pt !important;
          }
          .agent-balance-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1mm 3mm !important;
            padding: 1.5mm 2mm !important;
          }
          .agent-balance-report-root .rpt-print-label {
            margin: 0 0 0.3mm !important;
            font-size: 6pt !important;
          }
          .agent-balance-report-root .rpt-print-value {
            font-size: 8pt !important;
            line-height: 1.15 !important;
          }
          .agent-balance-report-root .rpt-print-body {
            margin-top: 2.5mm !important;
          }

          .agent-balance-report-root .rpt-print-root table.ab-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-family: Helvetica, Arial, sans-serif !important;
          }
          .agent-balance-report-root .rpt-print-root table.ab-print-table thead {
            display: table-header-group !important;
          }
          .agent-balance-report-root .rpt-print-root table.ab-print-table th,
          .agent-balance-report-root .rpt-print-root table.ab-print-table td {
            border: 0.2mm solid #000 !important;
            color: #000 !important;
            background: #fff !important;
            padding: 1mm 1mm !important;
            font-size: 7pt !important;
            line-height: 1.2 !important;
            font-weight: 400 !important;
            vertical-align: top !important;
            text-align: left !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .agent-balance-report-root .rpt-print-root table.ab-print-table th {
            background: #e8e8e8 !important;
            font-weight: 700 !important;
            font-size: 6.5pt !important;
            text-align: left !important;
            vertical-align: middle !important;
          }
          .agent-balance-report-root .rpt-print-root table.ab-print-table th *,
          .agent-balance-report-root .rpt-print-root table.ab-print-table td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: #000 !important;
          }
          .agent-balance-report-root .rpt-print-root table.ab-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .agent-balance-report-root .ab-line {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .agent-balance-report-root .ab-strong {
            font-weight: 700 !important;
          }
          .agent-balance-report-root .ab-muted {
            color: #333 !important;
            font-size: 6.25pt !important;
          }
          .agent-balance-report-root .ab-k {
            font-weight: 700 !important;
            margin-right: 0.8mm !important;
          }
          .agent-balance-report-root .ab-phone {
            white-space: nowrap !important;
            word-break: keep-all !important;
            overflow-wrap: normal !important;
            font-variant-numeric: tabular-nums !important;
          }
          .agent-balance-report-root .ab-clamp2 {
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            overflow: hidden !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            max-height: 2.5em !important;
          }
          .agent-balance-report-root .ab-nums {
            text-align: right !important;
            font-variant-numeric: tabular-nums !important;
            font-weight: 700 !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
          }
          .agent-balance-report-root .ab-center {
            text-align: center !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
          }
          .agent-balance-report-root .rpt-print-root table.ab-print-table tr.ab-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
            vertical-align: middle !important;
          }

          .agent-balance-report-root .ab-c0 { width: 5% !important; }
          .agent-balance-report-root .ab-c1 { width: 8% !important; }
          .agent-balance-report-root .ab-c2 { width: 24% !important; }
          .agent-balance-report-root .ab-c3 { width: 28% !important; }
          .agent-balance-report-root .ab-c4 { width: 22% !important; }
          .agent-balance-report-root .ab-c5 { width: 13% !important; }
        }

        @media screen {
          .agent-balance-report-root .ab-print-only {
            display: none !important;
          }
        }
      `}</style>

      <table className="ab-print-table">
        <colgroup>
          <col className="ab-c0" />
          <col className="ab-c1" />
          <col className="ab-c2" />
          <col className="ab-c3" />
          <col className="ab-c4" />
          <col className="ab-c5" />
        </colgroup>
        <thead>
          <tr>
            <th className="ab-c0">No.</th>
            <th className="ab-c1">Status</th>
            <th className="ab-c2">Agent</th>
            <th className="ab-c3">Contact</th>
            <th className="ab-c4">Credit Limits</th>
            <th className="ab-c5">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td className="ab-c0 ab-center">{i + 1}</td>
              <td className="ab-c1 ab-center">{r.status === 1 ? 'Active' : 'Inactive'}</td>
              <td className="ab-c2">
                <span className="ab-line ab-strong ab-clamp2">{r.agentName || '-'}</span>
                <span className="ab-line ab-muted">
                  Code {r.agentCode || '-'}
                  {r.parentAgent && r.parentAgent !== '-' ? ` · Parent ${r.parentAgent}` : ''}
                </span>
              </td>
              <td className="ab-c3">
                <span className="ab-line ab-phone">{r.agentPhoneNo || '-'}</span>
                <span className="ab-line ab-muted ab-clamp2">{r.agentAddress || '-'}</span>
              </td>
              <td className="ab-c4">
                <span className="ab-line">
                  <span className="ab-k">Hard</span>
                  {formatLKR(r.hardCreditLimit)}
                </span>
                <span className="ab-line">
                  <span className="ab-k">Agency</span>
                  {formatLKR(r.agencyCreditLimit)}
                </span>
                <span className="ab-line">
                  <span className="ab-k">Allowed</span>
                  {formatLKR(r.allowedCreditLimit)}
                </span>
              </td>
              <td className="ab-c5 ab-nums">{formatLKR(r.agentBalance)}</td>
            </tr>
          ))}
          <tr className="ab-total">
            <td className="ab-c0" colSpan={5}>
              Total
            </td>
            <td className="ab-c5 ab-nums">{formatLKR(balanceTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
