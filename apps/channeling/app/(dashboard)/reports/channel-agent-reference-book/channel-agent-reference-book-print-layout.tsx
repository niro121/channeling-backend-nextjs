'use client';

import type { AgencyBook } from '@/types/agencybook';
import {
  agentGroupTitleFromName,
  mapChannelAgentReferenceBookCompactFromReportRow,
} from './channel-agent-reference-book-export-config';

type Props = {
  rows: AgencyBook[];
};

/**
 * Print-only compact A4 portrait table for Channel Agent Reference Book.
 * Body mapping is shared with PDF via channel-agent-reference-book-export-config.
 */
export function ChannelAgentReferenceBookPrintLayout({ rows }: Props) {
  const groups = new Map<string, AgencyBook[]>();
  for (const row of rows) {
    const key = row.agency?.id || row.agency?.name || 'unassigned';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  return (
    <div className="carb-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 7mm 11mm;
          }
          .channel-agent-reference-book-report-root .rpt-print-header {
            margin-bottom: 1mm !important;
          }
          .channel-agent-reference-book-report-root .rpt-print-brand-row {
            height: 9mm !important;
            gap: 4mm !important;
          }
          .channel-agent-reference-book-report-root .rpt-print-logo {
            height: 9mm !important;
            max-width: 36mm !important;
          }
          .channel-agent-reference-book-report-root .rpt-print-titles {
            height: 9mm !important;
            padding: 1.2mm 0 0.2mm !important;
          }
          .channel-agent-reference-book-report-root .rpt-print-org {
            height: 3.4mm !important;
            font-size: 11pt !important;
          }
          .channel-agent-reference-book-report-root .rpt-print-title-gap {
            height: 0.5mm !important;
          }
          .channel-agent-reference-book-report-root .rpt-print-report-name {
            height: 3.4mm !important;
            font-size: 9pt !important;
          }
          .channel-agent-reference-book-report-root .rpt-print-rule {
            margin-top: 1mm !important;
          }
          .channel-agent-reference-book-report-root .rpt-print-summary {
            margin-top: 1mm !important;
          }
          .channel-agent-reference-book-report-root .rpt-print-summary-bar {
            padding: 0.5mm 1.5mm !important;
            font-size: 6.5pt !important;
            letter-spacing: 0.08em !important;
          }
          .channel-agent-reference-book-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 0.6mm 2mm !important;
            padding: 0.8mm 1.5mm !important;
          }
          .channel-agent-reference-book-report-root .rpt-print-label {
            margin: 0 0 0.15mm !important;
            font-size: 5.5pt !important;
            letter-spacing: 0.04em !important;
          }
          .channel-agent-reference-book-report-root .rpt-print-value {
            font-size: 6.5pt !important;
            line-height: 1.08 !important;
            font-weight: 600 !important;
          }
          .channel-agent-reference-book-report-root .rpt-print-body {
            margin-top: 1mm !important;
          }

          .carb-print-root {
            color: #000 !important;
            font-family: Verdana, Geneva, Tahoma, sans-serif;
            font-size: 7pt;
            line-height: 1.15;
          }
          .carb-print-group {
            margin: 0 0 1.5mm;
            break-inside: auto;
          }
          .carb-print-group-title {
            font-size: 7.5pt;
            font-weight: 700;
            margin: 0;
            padding: 0.65mm 1.1mm;
            background: #ececec;
            border: 0.5pt solid #000;
            border-bottom: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            break-after: avoid;
            page-break-after: avoid;
          }
          .carb-print-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          .carb-print-table thead {
            display: table-header-group;
          }
          .carb-print-table th {
            font-size: 6pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            text-align: left;
            padding: 0.55mm 0.8mm;
            border: 0.45pt solid #000;
            background: #f3f3f3;
            color: #000 !important;
            line-height: 1.1;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .carb-print-table td {
            vertical-align: top;
            padding: 0.65mm 0.8mm;
            border-left: 0.45pt solid #bbb;
            border-right: 0.45pt solid #bbb;
            border-bottom: 0.4pt solid #999;
            border-top: 0;
            font-size: 6.75pt;
            line-height: 1.15;
            color: #000 !important;
            word-break: break-word;
            overflow-wrap: anywhere;
          }
          .carb-print-table tbody tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .carb-print-table tbody tr:last-child td {
            border-bottom: 0.5pt solid #000;
          }
          .carb-print-table col.carb-col-no { width: 7%; }
          .carb-print-table col.carb-col-book { width: 16%; }
          .carb-print-table col.carb-col-ref { width: 22%; }
          .carb-print-table col.carb-col-pages { width: 10%; }
          .carb-print-table col.carb-col-created { width: 18%; }
          .carb-print-table col.carb-col-updated { width: 18%; }
          .carb-print-table col.carb-col-status { width: 9%; }
          .carb-print-line {
            display: block;
          }
          .carb-print-line + .carb-print-line {
            margin-top: 0.2mm;
          }
          .carb-print-strong {
            font-weight: 700;
          }
          .carb-print-muted {
            color: #333 !important;
          }
          .carb-print-nums {
            font-variant-numeric: tabular-nums;
          }
        }
        @media screen {
          .carb-print-root { display: none; }
        }
      `}</style>

      {Array.from(groups.entries()).map(([groupKey, groupRows]) => {
        const title = agentGroupTitleFromName(groupRows[0]?.agency?.name);
        return (
          <section key={groupKey} className="carb-print-group">
            <div className="carb-print-group-title">{title}</div>
            <table className="carb-print-table">
              <colgroup>
                <col className="carb-col-no" />
                <col className="carb-col-book" />
                <col className="carb-col-ref" />
                <col className="carb-col-pages" />
                <col className="carb-col-created" />
                <col className="carb-col-updated" />
                <col className="carb-col-status" />
              </colgroup>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Book</th>
                  <th>Reference</th>
                  <th>Pages</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.map((row) => {
                  const b = mapChannelAgentReferenceBookCompactFromReportRow(row);
                  return (
                    <tr key={row.id ?? `${b.bookNumber}-${b.sNo}`}>
                      <td>
                        <span className="carb-print-line carb-print-nums carb-print-strong">
                          {b.sNo}
                        </span>
                      </td>
                      <td>
                        <span className="carb-print-line carb-print-strong">{b.bookNumber}</span>
                      </td>
                      <td>
                        <span className="carb-print-line carb-print-nums">
                          Start: {b.startRef}
                        </span>
                        <span className="carb-print-line carb-print-nums carb-print-muted">
                          End: {b.endRef}
                        </span>
                      </td>
                      <td>
                        <span className="carb-print-line carb-print-nums carb-print-strong">
                          {b.pages}
                        </span>
                      </td>
                      <td>
                        <span className="carb-print-line carb-print-strong">{b.createdBy}</span>
                        <span className="carb-print-line carb-print-muted">{b.createdAt}</span>
                      </td>
                      <td>
                        <span className="carb-print-line carb-print-strong">{b.updatedBy}</span>
                        <span className="carb-print-line carb-print-muted">{b.updatedAt}</span>
                      </td>
                      <td>
                        <span className="carb-print-line carb-print-strong">{b.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
