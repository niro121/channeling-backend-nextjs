'use client';

import { formatCents } from '@/lib/format-money';
import type { CashBookReportRow } from '@/types/reports/cash-book';

type Props = {
  rows: CashBookReportRow[];
  closingBalanceCents: number | null;
};

/**
 * Print-only A4 portrait for Cash Book — matches on-screen report columns
 * (no No. column): Date | Journal # | Account | Description | Type | Debit | Credit | Balance
 */
export function CashBookPrintLayout({ rows, closingBalanceCents }: Props) {
  return (
    <div className="cb-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm 8mm 12mm;
          }

          .cash-book-report-root .rpt-print-header {
            margin-bottom: 2mm !important;
          }
          .cash-book-report-root .rpt-print-brand-row {
            height: 12mm !important;
            gap: 5mm !important;
          }
          .cash-book-report-root .rpt-print-logo {
            height: 12mm !important;
            max-width: 44mm !important;
          }
          .cash-book-report-root .rpt-print-titles {
            height: 12mm !important;
            padding: 2mm 0 0.4mm !important;
          }
          .cash-book-report-root .rpt-print-org {
            height: 4mm !important;
            font-size: 13pt !important;
          }
          .cash-book-report-root .rpt-print-title-gap {
            height: 0.6mm !important;
          }
          .cash-book-report-root .rpt-print-report-name {
            height: 3.8mm !important;
            font-size: 9.5pt !important;
          }
          .cash-book-report-root .rpt-print-rule {
            margin-top: 1.2mm !important;
          }
          .cash-book-report-root .rpt-print-summary {
            margin-top: 2mm !important;
          }
          .cash-book-report-root .rpt-print-summary-bar {
            padding: 0.9mm 2mm !important;
            font-size: 7pt !important;
          }
          .cash-book-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1mm 3mm !important;
            padding: 1.5mm 2mm !important;
          }
          .cash-book-report-root .rpt-print-label {
            margin: 0 0 0.3mm !important;
            font-size: 6pt !important;
          }
          .cash-book-report-root .rpt-print-value {
            font-size: 8pt !important;
            line-height: 1.15 !important;
          }
          .cash-book-report-root .rpt-print-body {
            margin-top: 2.5mm !important;
          }

          .cash-book-report-root .rpt-print-root table.cb-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-family: Helvetica, Arial, sans-serif !important;
          }
          .cash-book-report-root .rpt-print-root table.cb-print-table thead {
            display: table-header-group !important;
          }
          .cash-book-report-root .rpt-print-root table.cb-print-table th,
          .cash-book-report-root .rpt-print-root table.cb-print-table td {
            border: 0.2mm solid #000 !important;
            color: #000 !important;
            background: #fff !important;
            padding: 0.5mm 0.55mm !important;
            font-size: 5.5pt !important;
            line-height: 1.15 !important;
            font-weight: 400 !important;
            vertical-align: top !important;
            text-align: left !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .cash-book-report-root .rpt-print-root table.cb-print-table th {
            background: #e8e8e8 !important;
            font-weight: 700 !important;
            font-size: 5.25pt !important;
            text-align: left !important;
            vertical-align: middle !important;
            padding: 0.65mm 0.55mm !important;
          }
          .cash-book-report-root .rpt-print-root table.cb-print-table th *,
          .cash-book-report-root .rpt-print-root table.cb-print-table td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: #000 !important;
          }
          .cash-book-report-root .rpt-print-root table.cb-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .cash-book-report-root .cb-line {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .cash-book-report-root .cb-strong {
            font-weight: 700 !important;
          }
          .cash-book-report-root .cb-clamp2 {
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            overflow: hidden !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            max-height: 2.4em !important;
          }
          .cash-book-report-root .cb-nums {
            font-variant-numeric: tabular-nums !important;
          }
          .cash-book-report-root .cb-center {
            text-align: center !important;
            vertical-align: middle !important;
          }
          .cash-book-report-root .cb-right {
            text-align: right !important;
          }
          .cash-book-report-root .rpt-print-root table.cb-print-table tr.cb-opening td,
          .cash-book-report-root .rpt-print-root table.cb-print-table tr.cb-closing td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
            vertical-align: middle !important;
          }

          .cash-book-report-root .cb-c0 { width: 14% !important; }
          .cash-book-report-root .cb-c1 { width: 9% !important; }
          .cash-book-report-root .cb-c2 { width: 16% !important; }
          .cash-book-report-root .cb-c3 { width: 19% !important; }
          .cash-book-report-root .cb-c4 { width: 10% !important; }
          .cash-book-report-root .cb-c5 { width: 10% !important; }
          .cash-book-report-root .cb-c6 { width: 10% !important; }
          .cash-book-report-root .cb-c7 { width: 12% !important; }
        }
      `}</style>

      <table className="cb-print-table">
        <colgroup>
          <col className="cb-c0" />
          <col className="cb-c1" />
          <col className="cb-c2" />
          <col className="cb-c3" />
          <col className="cb-c4" />
          <col className="cb-c5" />
          <col className="cb-c6" />
          <col className="cb-c7" />
        </colgroup>
        <thead>
          <tr>
            <th className="cb-c0">Date</th>
            <th className="cb-c1">Journal #</th>
            <th className="cb-c2">Account</th>
            <th className="cb-c3">Description</th>
            <th className="cb-c4">Type</th>
            <th className="cb-c5 cb-right">Debit</th>
            <th className="cb-c6 cb-right">Credit</th>
            <th className="cb-c7 cb-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="cb-center">
                No records found.
              </td>
            </tr>
          ) : (
            <>
              {rows.map((r) => {
                const isOpening = r.id === 'opening-balance-row';
                const dateLabel = Number.isNaN(new Date(r.date).getTime())
                  ? '-'
                  : new Date(r.date).toLocaleString();
                return (
                  <tr key={r.id} className={isOpening ? 'cb-opening' : undefined}>
                    <td className="cb-c0">
                      <span className="cb-line cb-clamp2">{dateLabel}</span>
                    </td>
                    <td className="cb-c1">
                      {isOpening ? '-' : (r.journalNumber != null ? String(r.journalNumber) : '-')}
                    </td>
                    <td className="cb-c2">
                      <span className="cb-line cb-clamp2">
                        {isOpening ? '-' : (r.accountLabel || '-')}
                      </span>
                    </td>
                    <td className="cb-c3">
                      <span className="cb-line cb-clamp2 cb-strong">
                        {r.description || '-'}
                      </span>
                    </td>
                    <td className="cb-c4">
                      <span className="cb-line cb-clamp2">
                        {isOpening ? '-' : (r.paymentMethodLabel || '-')}
                      </span>
                    </td>
                    <td className="cb-c5 cb-right cb-nums">
                      {r.debitAmount > 0 ? formatCents(r.debitAmount) : '-'}
                    </td>
                    <td className="cb-c6 cb-right cb-nums">
                      {r.creditAmount > 0 ? formatCents(r.creditAmount) : '-'}
                    </td>
                    <td className="cb-c7 cb-right cb-nums cb-strong">
                      {formatCents(r.runningBalance)}
                    </td>
                  </tr>
                );
              })}
              {closingBalanceCents != null ? (
                <tr className="cb-closing">
                  <td className="cb-c0" colSpan={7}>
                    Closing Balance
                  </td>
                  <td className="cb-c7 cb-right cb-nums">
                    {formatCents(closingBalanceCents)}
                  </td>
                </tr>
              ) : null}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
