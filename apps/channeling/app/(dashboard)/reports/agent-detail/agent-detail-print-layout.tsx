'use client';

import type { Agency } from '@/types/agency';
import {
  formatAgentDetailMoney,
  mapAgentDetailCompactFromReportRow,
  sumAgentDetailCreditTotals,
} from './agent-detail-export-config';

type Props = {
  rows: Agency[];
};

/**
 * Print-only compact A4 portrait table for Agent Detail Report.
 * Body mapping is shared with PDF via agent-detail-export-config.
 */
export function AgentDetailPrintLayout({ rows }: Props) {
  const compactRows = rows.map(mapAgentDetailCompactFromReportRow);
  const totals = sumAgentDetailCreditTotals(compactRows);

  return (
    <div className="ad-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 7mm 11mm;
          }
          .agent-detail-report-root .rpt-print-header {
            margin-bottom: 1mm !important;
          }
          .agent-detail-report-root .rpt-print-brand-row {
            height: 9mm !important;
            gap: 4mm !important;
          }
          .agent-detail-report-root .rpt-print-logo {
            height: 9mm !important;
            max-width: 36mm !important;
          }
          .agent-detail-report-root .rpt-print-titles {
            height: 9mm !important;
            padding: 1.2mm 0 0.2mm !important;
          }
          .agent-detail-report-root .rpt-print-org {
            height: 3.4mm !important;
            font-size: 11pt !important;
          }
          .agent-detail-report-root .rpt-print-title-gap {
            height: 0.5mm !important;
          }
          .agent-detail-report-root .rpt-print-report-name {
            height: 3.4mm !important;
            font-size: 9pt !important;
          }
          .agent-detail-report-root .rpt-print-rule {
            margin-top: 1mm !important;
          }
          .agent-detail-report-root .rpt-print-summary {
            margin-top: 1mm !important;
          }
          .agent-detail-report-root .rpt-print-summary-bar {
            padding: 0.5mm 1.5mm !important;
            font-size: 6.5pt !important;
            letter-spacing: 0.08em !important;
          }
          .agent-detail-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 0.6mm 2mm !important;
            padding: 0.8mm 1.5mm !important;
          }
          .agent-detail-report-root .rpt-print-label {
            margin: 0 0 0.15mm !important;
            font-size: 5.5pt !important;
            letter-spacing: 0.04em !important;
          }
          .agent-detail-report-root .rpt-print-value {
            font-size: 6.5pt !important;
            line-height: 1.08 !important;
            font-weight: 600 !important;
          }
          .agent-detail-report-root .rpt-print-body {
            margin-top: 1mm !important;
          }

          .ad-print-root {
            color: #000 !important;
            font-family: Verdana, Geneva, Tahoma, sans-serif;
            font-size: 6.75pt;
            line-height: 1.12;
          }
          .ad-print-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          .ad-print-table thead {
            display: table-header-group;
          }
          .ad-print-table th {
            font-size: 5.75pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            text-align: left;
            padding: 0.5mm 0.7mm;
            border: 0.45pt solid #000;
            background: #f3f3f3;
            color: #000 !important;
            line-height: 1.1;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .ad-print-table td {
            vertical-align: top;
            padding: 0.55mm 0.7mm;
            border-left: 0.45pt solid #bbb;
            border-right: 0.45pt solid #bbb;
            border-bottom: 0.4pt solid #999;
            border-top: 0;
            font-size: 6.5pt;
            line-height: 1.12;
            color: #000 !important;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          .ad-print-table tbody tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .ad-print-table tbody tr:last-child td {
            border-bottom: 0.5pt solid #000;
          }
          .ad-print-table col.ad-col-created { width: 11%; }
          .ad-print-table col.ad-col-agent { width: 16%; }
          .ad-print-table col.ad-col-status { width: 9%; }
          .ad-print-table col.ad-col-reach { width: 22%; }
          .ad-print-table col.ad-col-contact { width: 20%; }
          .ad-print-table col.ad-col-credit { width: 22%; }
          .ad-print-line {
            display: block;
          }
          .ad-print-line + .ad-print-line {
            margin-top: 0.15mm;
          }
          .ad-print-strong {
            font-weight: 700;
          }
          .ad-print-muted {
            color: #333 !important;
          }
          .ad-print-nums {
            font-variant-numeric: tabular-nums;
          }
          .ad-print-k {
            font-size: 5.5pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            color: #444 !important;
            margin-right: 0.6mm;
          }
          .ad-print-totals {
            margin-top: 1.4mm;
            border: 0.5pt solid #000;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .ad-print-totals-title {
            font-size: 7pt;
            font-weight: 700;
            padding: 0.55mm 1.1mm;
            background: #ececec;
            border-bottom: 0.4pt solid #000;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .ad-print-totals-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 0.8mm 2mm;
            padding: 0.9mm 1.1mm;
          }
          .ad-print-total-item {
            min-width: 0;
          }
          .ad-print-total-label {
            display: block;
            font-size: 5.5pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            color: #444 !important;
            margin-bottom: 0.2mm;
          }
          .ad-print-total-value {
            display: block;
            font-size: 7pt;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            color: #000 !important;
          }
        }
        @media screen {
          .ad-print-root { display: none; }
        }
      `}</style>

      <table className="ad-print-table">
        <colgroup>
          <col className="ad-col-created" />
          <col className="ad-col-agent" />
          <col className="ad-col-status" />
          <col className="ad-col-reach" />
          <col className="ad-col-contact" />
          <col className="ad-col-credit" />
        </colgroup>
        <thead>
          <tr>
            <th>Created</th>
            <th>Agent</th>
            <th>Status</th>
            <th>Address / Reach</th>
            <th>Contact</th>
            <th>Credit Limits</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const a = compactRows[index]!;
            return (
              <tr key={row.id ?? `${a.code}-${a.name}`}>
                <td>
                  <span className="ad-print-line ad-print-nums ad-print-strong">
                    {a.createdDate}
                  </span>
                  <span className="ad-print-line ad-print-nums ad-print-muted">
                    {a.createdTime}
                  </span>
                </td>
                <td>
                  <span className="ad-print-line ad-print-strong">{a.code}</span>
                  <span className="ad-print-line">{a.name}</span>
                </td>
                <td>
                  <span className="ad-print-line ad-print-strong">{a.status}</span>
                </td>
                <td>
                  {a.addressLines.map((line, i) => (
                    <span
                      key={`addr-${i}`}
                      className={`ad-print-line ${i === 0 ? 'ad-print-strong' : 'ad-print-muted'}`}
                    >
                      {line}
                    </span>
                  ))}
                  <span className="ad-print-line">
                    <span className="ad-print-k">Ph</span>
                    {a.phone}
                  </span>
                  <span className="ad-print-line ad-print-muted">
                    <span className="ad-print-k">Fax</span>
                    {a.fax}
                  </span>
                  <span className="ad-print-line ad-print-muted">
                    <span className="ad-print-k">Mail</span>
                    {a.email}
                  </span>
                </td>
                <td>
                  <span className="ad-print-line ad-print-strong">{a.contactName}</span>
                  <span className="ad-print-line">
                    <span className="ad-print-k">Ph</span>
                    {a.contactPhone}
                  </span>
                  <span className="ad-print-line ad-print-muted">
                    <span className="ad-print-k">Mail</span>
                    {a.contactEmail}
                  </span>
                </td>
                <td>
                  <span className="ad-print-line ad-print-nums">
                    <span className="ad-print-k">Allowed</span>
                    {a.allowedCredit}
                  </span>
                  <span className="ad-print-line ad-print-nums ad-print-muted">
                    <span className="ad-print-k">Max</span>
                    {a.maxCredit}
                  </span>
                  <span className="ad-print-line ad-print-nums ad-print-muted">
                    <span className="ad-print-k">Std</span>
                    {a.standardCredit}
                  </span>
                  <span className="ad-print-line ad-print-nums ad-print-strong">
                    <span className="ad-print-k">Bal</span>
                    {a.balance}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="ad-print-totals">
        <div className="ad-print-totals-title">Total</div>
        <div className="ad-print-totals-grid">
          <div className="ad-print-total-item">
            <span className="ad-print-total-label">Allowed Credit Limit</span>
            <span className="ad-print-total-value">{formatAgentDetailMoney(totals.allowed)}</span>
          </div>
          <div className="ad-print-total-item">
            <span className="ad-print-total-label">Allowed Maximum Credit Limit</span>
            <span className="ad-print-total-value">{formatAgentDetailMoney(totals.max)}</span>
          </div>
          <div className="ad-print-total-item">
            <span className="ad-print-total-label">Standard Credit Limit</span>
            <span className="ad-print-total-value">{formatAgentDetailMoney(totals.standard)}</span>
          </div>
          <div className="ad-print-total-item">
            <span className="ad-print-total-label">Balance</span>
            <span className="ad-print-total-value">{formatAgentDetailMoney(totals.balance)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
