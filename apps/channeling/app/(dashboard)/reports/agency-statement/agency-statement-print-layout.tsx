'use client';

import type { AgencyStatementReportData } from '@/types/reports/agency-statement';
import {
  buildAgencyStatementCompactRows,
} from './agency-statement-export-config';

type Props = {
  data: AgencyStatementReportData;
  periodFrom: string;
};

/**
 * Print-only compact A4 portrait ledger for Agency Statement.
 * Body mapping is shared with PDF via agency-statement-export-config.
 */
export function AgencyStatementPrintLayout({ data, periodFrom }: Props) {
  const rows = buildAgencyStatementCompactRows(data, periodFrom);

  return (
    <div className="as-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 5mm 18mm;
          }
          .agency-statement-report-root {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .agency-statement-report-root .rpt-print-root,
          .agency-statement-report-root .rpt-print-body,
          .agency-statement-report-root .rpt-print-header,
          .agency-statement-report-root .rpt-print-summary,
          .agency-statement-report-root .as-print-root,
          .agency-statement-report-root .as-print-table {
            width: 100% !important;
            max-width: none !important;
            box-sizing: border-box !important;
          }

          .as-print-root {
            color: #000 !important;
            font-family: Verdana, Geneva, Tahoma, sans-serif;
            font-size: 6.75pt;
            line-height: 1.12;
          }
          .as-print-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          .as-print-table thead {
            display: table-header-group;
          }
          .as-print-table th {
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
          .as-print-table td {
            vertical-align: top;
            padding: 0.55mm 0.7mm;
            border-left: 0.45pt solid #bbb;
            border-right: 0.45pt solid #bbb;
            border-bottom: 0.4pt solid #999;
            border-top: 0;
            font-size: 6.5pt;
            line-height: 1.12;
            color: #000 !important;
            word-break: normal;
            overflow-wrap: break-word;
          }
          .as-print-table tbody tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .as-print-table tbody tr:last-child td {
            border-bottom: 0.5pt solid #000;
          }
          .as-print-table col.as-col-no { width: 6%; }
          .as-print-table col.as-col-date { width: 12%; }
          .as-print-table col.as-col-detail { width: 28%; }
          .as-print-table col.as-col-fees { width: 22%; }
          .as-print-table col.as-col-bal { width: 12%; }
          .as-print-table col.as-col-meta { width: 20%; }
          .as-print-line {
            display: block;
          }
          .as-print-line + .as-print-line {
            margin-top: 0.15mm;
          }
          .as-print-strong {
            font-weight: 700;
          }
          .as-print-muted {
            color: #333 !important;
          }
          .as-print-nums {
            font-variant-numeric: tabular-nums;
          }
          .as-print-k {
            font-size: 5.5pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            color: #444 !important;
            margin-right: 0.5mm;
          }
          .as-print-opening td,
          .as-print-closing td {
            background: #f5f5f5 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-weight: 700;
          }
        }
        @media screen {
          .as-print-root { display: none; }
        }
      `}</style>

      <table className="as-print-table">
        <colgroup>
          <col className="as-col-no" />
          <col className="as-col-date" />
          <col className="as-col-detail" />
          <col className="as-col-fees" />
          <col className="as-col-bal" />
          <col className="as-col-meta" />
        </colgroup>
        <thead>
          <tr>
            <th>No.</th>
            <th>Date</th>
            <th>Detail</th>
            <th>Fees</th>
            <th>Balance</th>
            <th>Meta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, index) => {
            if (r.isOpening) {
              return (
                <tr key={`opening-${index}`} className="as-print-opening">
                  <td />
                  <td>
                    <span className="as-print-line as-print-nums">{r.date}</span>
                    <span className="as-print-line as-print-nums as-print-muted">{r.time}</span>
                  </td>
                  <td>
                    <span className="as-print-line as-print-strong">{r.particulars}</span>
                    <span className="as-print-line as-print-muted">{r.appointment}</span>
                  </td>
                  <td>
                    <span className="as-print-line as-print-nums as-print-muted">—</span>
                  </td>
                  <td>
                    <span className="as-print-line as-print-nums as-print-strong">{r.balance}</span>
                  </td>
                  <td />
                </tr>
              );
            }
            if (r.isClosing) {
              return (
                <tr key={`closing-${index}`} className="as-print-closing">
                  <td colSpan={4}>
                    <span className="as-print-line as-print-strong">{r.particulars}</span>
                  </td>
                  <td>
                    <span className="as-print-line as-print-nums as-print-strong">{r.balance}</span>
                  </td>
                  <td />
                </tr>
              );
            }
            return (
              <tr key={`${r.no}-${r.receiptNo}-${r.date}-${index}`}>
                <td>
                  <span className="as-print-line as-print-nums as-print-strong">{r.no}</span>
                </td>
                <td>
                  <span className="as-print-line as-print-nums as-print-strong">{r.date}</span>
                  <span className="as-print-line as-print-nums as-print-muted">{r.time}</span>
                </td>
                <td>
                  <span className="as-print-line as-print-strong">{r.particulars}</span>
                  <span className="as-print-line">
                    <span className="as-print-k">Rcpt</span>
                    {r.receiptNo}
                  </span>
                  <span className="as-print-line as-print-muted">
                    <span className="as-print-k">Appt</span>
                    {r.appointment}
                  </span>
                </td>
                <td>
                  <span className="as-print-line as-print-nums">
                    <span className="as-print-k">Doc</span>
                    {r.docFee}
                  </span>
                  <span className="as-print-line as-print-nums as-print-muted">
                    <span className="as-print-k">Hos</span>
                    {r.hosFee}
                  </span>
                  <span className="as-print-line as-print-nums as-print-muted">
                    <span className="as-print-k">Disc</span>
                    {r.discount}
                  </span>
                  <span className="as-print-line as-print-nums as-print-strong">
                    <span className="as-print-k">Amt</span>
                    {r.amount}
                  </span>
                </td>
                <td>
                  <span className="as-print-line as-print-nums as-print-strong">{r.balance}</span>
                </td>
                <td>
                  <span className="as-print-line">{r.comments}</span>
                  <span className="as-print-line as-print-muted">
                    <span className="as-print-k">By</span>
                    {r.createdBy}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
