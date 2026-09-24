'use client';

import moment from 'moment';
import { formatLKR } from '@/lib/format-money';
import type { AgentHistoryCreditLimitUpdateReportRow } from '@/types/reports/agent-history-credit-limit-update';
import { hardLimitFieldLabel, limitTypeShortLabel } from './agent-history-credit-limit-update-export-config';
import { creditLimitChangeRemark } from '@/lib/credit-limit-change-remark';

type Props = {
  rows: AgentHistoryCreditLimitUpdateReportRow[];
};

/**
 * Print-only compact A4 portrait for Agent History (Credit Limit Update).
 * Columns: No. | Agent | Limit | Values | Changed by | Remark | Date & Time
 */
export function AgentHistoryCreditLimitUpdatePrintLayout({ rows }: Props) {
  return (
    <div className="ahclu-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm 8mm 12mm;
          }

          .agent-history-credit-limit-update-report-root .rpt-print-header {
            margin-bottom: 2mm !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-brand-row {
            height: 12mm !important;
            gap: 5mm !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-logo {
            height: 12mm !important;
            max-width: 44mm !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-titles {
            height: 12mm !important;
            padding: 2mm 0 0.4mm !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-org {
            height: 4mm !important;
            font-size: 13pt !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-title-gap {
            height: 0.6mm !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-report-name {
            height: 3.8mm !important;
            font-size: 9.5pt !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-rule {
            margin-top: 1.2mm !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-summary {
            margin-top: 2mm !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-summary-bar {
            padding: 0.9mm 2mm !important;
            font-size: 7pt !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1mm 3mm !important;
            padding: 1.5mm 2mm !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-label {
            margin: 0 0 0.3mm !important;
            font-size: 6pt !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-value {
            font-size: 8pt !important;
            line-height: 1.15 !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-body {
            margin-top: 2.5mm !important;
          }

          .agent-history-credit-limit-update-report-root .rpt-print-root table.ahclu-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-family: Helvetica, Arial, sans-serif !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-root table.ahclu-print-table thead {
            display: table-header-group !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-root table.ahclu-print-table th,
          .agent-history-credit-limit-update-report-root .rpt-print-root table.ahclu-print-table td {
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
          .agent-history-credit-limit-update-report-root .rpt-print-root table.ahclu-print-table th {
            background: #e8e8e8 !important;
            font-weight: 700 !important;
            font-size: 6.5pt !important;
            text-align: left !important;
            vertical-align: middle !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-root table.ahclu-print-table th *,
          .agent-history-credit-limit-update-report-root .rpt-print-root table.ahclu-print-table td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: #000 !important;
          }
          .agent-history-credit-limit-update-report-root .rpt-print-root table.ahclu-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .agent-history-credit-limit-update-report-root .ahclu-line {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .agent-history-credit-limit-update-report-root .ahclu-strong {
            font-weight: 700 !important;
          }
          .agent-history-credit-limit-update-report-root .ahclu-muted {
            color: #333 !important;
            font-size: 6.25pt !important;
          }
          .agent-history-credit-limit-update-report-root .ahclu-k {
            font-weight: 700 !important;
            margin-right: 0.8mm !important;
          }
          .agent-history-credit-limit-update-report-root .ahclu-clamp2 {
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            overflow: hidden !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            max-height: 2.5em !important;
          }
          .agent-history-credit-limit-update-report-root .ahclu-center {
            text-align: center !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
          }
          .agent-history-credit-limit-update-report-root .ahclu-nums {
            font-variant-numeric: tabular-nums !important;
          }
          .agent-history-credit-limit-update-report-root .ahclu-delta-pos {
            color: #047857 !important;
          }
          .agent-history-credit-limit-update-report-root .ahclu-delta-neg {
            color: #b91c1c !important;
          }

          .agent-history-credit-limit-update-report-root .ahclu-c0 { width: 5% !important; }
          .agent-history-credit-limit-update-report-root .ahclu-c1 { width: 18% !important; }
          .agent-history-credit-limit-update-report-root .ahclu-c2 { width: 12% !important; }
          .agent-history-credit-limit-update-report-root .ahclu-c3 { width: 20% !important; }
          .agent-history-credit-limit-update-report-root .ahclu-c4 { width: 14% !important; }
          .agent-history-credit-limit-update-report-root .ahclu-c5 { width: 18% !important; }
          .agent-history-credit-limit-update-report-root .ahclu-c6 { width: 13% !important; }
        }
      `}</style>

      <table className="ahclu-print-table">
        <colgroup>
          <col className="ahclu-c0" />
          <col className="ahclu-c1" />
          <col className="ahclu-c2" />
          <col className="ahclu-c3" />
          <col className="ahclu-c4" />
          <col className="ahclu-c5" />
          <col className="ahclu-c6" />
        </colgroup>
        <thead>
          <tr>
            <th className="ahclu-c0">No.</th>
            <th className="ahclu-c1">Agent</th>
            <th className="ahclu-c2">Limit</th>
            <th className="ahclu-c3">Values</th>
            <th className="ahclu-c4">Changed by</th>
            <th className="ahclu-c5">Remark</th>
            <th className="ahclu-c6">Date & Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const delta = r.delta;
            const deltaCls =
              delta == null
                ? ''
                : delta > 0
                  ? 'ahclu-delta-pos'
                  : delta < 0
                    ? 'ahclu-delta-neg'
                    : '';
            return (
              <tr key={r.id}>
                <td className="ahclu-c0 ahclu-center">{i + 1}</td>
                <td className="ahclu-c1">
                  <span className="ahclu-line ahclu-strong ahclu-clamp2">
                    {r.agencyName || '—'}
                  </span>
                  <span className="ahclu-line ahclu-muted">
                    Code {r.agencyCode || '—'}
                  </span>
                </td>
                <td className="ahclu-c2">
                  <span className="ahclu-line ahclu-strong">
                    {limitTypeShortLabel(r.limitType)}
                  </span>
                  {r.limitType === 'hard' ? (
                    <span className="ahclu-line ahclu-muted ahclu-clamp2">
                      {hardLimitFieldLabel(r)}
                    </span>
                  ) : null}
                </td>
                <td className="ahclu-c3 ahclu-nums">
                  <span className="ahclu-line">
                    <span className="ahclu-k">Before</span>
                    {r.oldValue == null ? '—' : formatLKR(r.oldValue)}
                  </span>
                  <span className="ahclu-line">
                    <span className="ahclu-k">Updated</span>
                    {r.newValue == null ? '—' : formatLKR(r.newValue)}
                  </span>
                  <span className={`ahclu-line ${deltaCls}`.trim()}>
                    <span className="ahclu-k">Delta</span>
                    {delta == null ? '—' : formatLKR(delta)}
                  </span>
                </td>
                <td className="ahclu-c4">
                  <span className="ahclu-line ahclu-clamp2">
                    {r.changedByUserName || '—'}
                  </span>
                </td>
                <td className="ahclu-c5">
                  <span className="ahclu-line ahclu-clamp2">
                    {creditLimitChangeRemark(r.metadata)}
                  </span>
                </td>
                <td className="ahclu-c6">
                  {r.createdAt ? (
                    <>
                      <span className="ahclu-line">
                        {moment(r.createdAt).format('YYYY-MM-DD')}
                      </span>
                      <span className="ahclu-line ahclu-muted">
                        {moment(r.createdAt).format('HH:mm:ss')}
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
