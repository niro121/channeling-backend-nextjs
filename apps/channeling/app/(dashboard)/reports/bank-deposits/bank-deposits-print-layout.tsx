'use client';

import moment from 'moment';
import { formatReceiptAmount } from '@/lib/format-money';
import type { BankDepositsReportRow } from '@/types/reports/bank-deposits';

type Props = {
  rows: BankDepositsReportRow[];
};

/**
 * Print-only A4 portrait for Bank Deposits (9 screen columns → compact).
 * Columns: No. | Type | Receipt | Details (Loc / User / At / Approved by / Approved at / Remark) | Bank Account | Total
 * Branded header comes from ReportPrintLayout via ReportTemplate.
 */
export function BankDepositsPrintLayout({ rows }: Props) {
  const totalAmount = rows.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);

  return (
    <div className="bd-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm 8mm 12mm;
          }

          .bank-deposits-report-root .rpt-print-header {
            margin-bottom: 2mm !important;
          }
          .bank-deposits-report-root .rpt-print-brand-row {
            height: 12mm !important;
            gap: 5mm !important;
          }
          .bank-deposits-report-root .rpt-print-logo {
            height: 12mm !important;
            max-width: 44mm !important;
          }
          .bank-deposits-report-root .rpt-print-titles {
            height: 12mm !important;
            padding: 2mm 0 0.4mm !important;
          }
          .bank-deposits-report-root .rpt-print-org {
            height: 4mm !important;
            font-size: 13pt !important;
          }
          .bank-deposits-report-root .rpt-print-title-gap {
            height: 0.6mm !important;
          }
          .bank-deposits-report-root .rpt-print-report-name {
            height: 3.8mm !important;
            font-size: 9.5pt !important;
          }
          .bank-deposits-report-root .rpt-print-rule {
            margin-top: 1.2mm !important;
          }
          .bank-deposits-report-root .rpt-print-summary {
            margin-top: 2mm !important;
          }
          .bank-deposits-report-root .rpt-print-summary-bar {
            padding: 0.9mm 2mm !important;
            font-size: 7pt !important;
          }
          .bank-deposits-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1mm 3mm !important;
            padding: 1.5mm 2mm !important;
          }
          .bank-deposits-report-root .rpt-print-label {
            margin: 0 0 0.3mm !important;
            font-size: 6pt !important;
          }
          .bank-deposits-report-root .rpt-print-value {
            font-size: 8pt !important;
            line-height: 1.15 !important;
          }
          .bank-deposits-report-root .rpt-print-body {
            margin-top: 2.5mm !important;
          }

          .bank-deposits-report-root .rpt-print-root table.bd-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-family: Helvetica, Arial, sans-serif !important;
          }
          .bank-deposits-report-root .rpt-print-root table.bd-print-table thead {
            display: table-header-group !important;
          }
          .bank-deposits-report-root .rpt-print-root table.bd-print-table th,
          .bank-deposits-report-root .rpt-print-root table.bd-print-table td {
            border: 0.2mm solid #000 !important;
            color: #000 !important;
            background: #fff !important;
            padding: 0.55mm 0.7mm !important;
            font-size: 6pt !important;
            line-height: 1.15 !important;
            font-weight: 400 !important;
            vertical-align: top !important;
            text-align: left !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bank-deposits-report-root .rpt-print-root table.bd-print-table th {
            background: #e8e8e8 !important;
            font-weight: 700 !important;
            font-size: 5.75pt !important;
            text-align: left !important;
            vertical-align: middle !important;
            padding: 0.7mm 0.7mm !important;
          }
          .bank-deposits-report-root .rpt-print-root table.bd-print-table th *,
          .bank-deposits-report-root .rpt-print-root table.bd-print-table td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: #000 !important;
          }
          .bank-deposits-report-root .rpt-print-root table.bd-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .bank-deposits-report-root .bd-line {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .bank-deposits-report-root .bd-strong {
            font-weight: 700 !important;
          }
          .bank-deposits-report-root .bd-k {
            font-weight: 700 !important;
            margin-right: 0.6mm !important;
            display: inline !important;
          }
          .bank-deposits-report-root .rpt-print-root table.bd-print-table td .bd-k {
            font-weight: 700 !important;
          }
          .bank-deposits-report-root .bd-muted {
            color: #333 !important;
          }
          .bank-deposits-report-root .bd-clamp2 {
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            overflow: hidden !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            max-height: 2.4em !important;
          }
          .bank-deposits-report-root .bd-nums {
            font-variant-numeric: tabular-nums !important;
          }
          .bank-deposits-report-root .bd-center {
            text-align: center !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
          }
          .bank-deposits-report-root .bd-right {
            text-align: right !important;
          }
          .bank-deposits-report-root .rpt-print-root table.bd-print-table tr.bd-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
            vertical-align: middle !important;
          }
          .bank-deposits-report-root .rpt-print-root table.bd-print-table tr.bd-withdraw td {
            color: #000 !important;
          }

          .bank-deposits-report-root .bd-c0 { width: 5% !important; }
          .bank-deposits-report-root .bd-c1 { width: 12% !important; }
          .bank-deposits-report-root .bd-c2 { width: 12% !important; }
          .bank-deposits-report-root .bd-c3 { width: 34% !important; }
          .bank-deposits-report-root .bd-c4 { width: 22% !important; }
          .bank-deposits-report-root .bd-c5 { width: 15% !important; }
        }
      `}</style>

      <table className="bd-print-table">
        <colgroup>
          <col className="bd-c0" />
          <col className="bd-c1" />
          <col className="bd-c2" />
          <col className="bd-c3" />
          <col className="bd-c4" />
          <col className="bd-c5" />
        </colgroup>
        <thead>
          <tr>
            <th className="bd-c0">No.</th>
            <th className="bd-c1">Type</th>
            <th className="bd-c2">Receipt</th>
            <th className="bd-c3">Details</th>
            <th className="bd-c4">Bank Account</th>
            <th className="bd-c5 bd-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="bd-center">
                No records found.
              </td>
            </tr>
          ) : (
            <>
              {rows.map((r, i) => {
                const isWithdraw = r.transactionType === 'Bank Withdraw';
                const created =
                  r.createdAt != null
                    ? moment(r.createdAt).format('YYYY-MM-DD HH:mm')
                    : '—';
                const approvedAt =
                  r.approvedAt != null
                    ? moment(r.approvedAt).format('YYYY-MM-DD HH:mm')
                    : '—';
                return (
                  <tr key={r.id} className={isWithdraw ? 'bd-withdraw' : undefined}>
                    <td className="bd-c0 bd-center">{i + 1}</td>
                    <td className="bd-c1">
                      <span className="bd-line bd-strong bd-clamp2">
                        {r.transactionType || '—'}
                      </span>
                    </td>
                    <td className="bd-c2">
                      <span className="bd-line bd-clamp2">{r.receiptNoString || '—'}</span>
                    </td>
                    <td className="bd-c3">
                      <span className="bd-line bd-clamp2">
                        <span className="bd-k">Loc</span>
                        {r.userLocation || '—'}
                      </span>
                      <span className="bd-line bd-clamp2">
                        <span className="bd-k">User</span>
                        {r.user || '—'}
                      </span>
                      <span className="bd-line bd-muted">
                        <span className="bd-k">At</span>
                        {created}
                      </span>
                      <span className="bd-line bd-clamp2">
                        <span className="bd-k">Approved by</span>
                        {r.approvedBy || '—'}
                      </span>
                      <span className="bd-line bd-muted">
                        <span className="bd-k">Approved at</span>
                        {approvedAt}
                      </span>
                      {r.remarks ? (
                        <span className="bd-line bd-muted bd-clamp2">
                          <span className="bd-k">Remark</span>
                          {r.remarks}
                        </span>
                      ) : null}
                    </td>
                    <td className="bd-c4">
                      <span className="bd-line bd-clamp2">{r.bankAccountName || '—'}</span>
                    </td>
                    <td className="bd-c5 bd-right bd-nums bd-strong">
                      {formatReceiptAmount(Number(r.totalAmount) || 0)}
                    </td>
                  </tr>
                );
              })}
              <tr className="bd-total">
                <td className="bd-c0" colSpan={5}>
                  Total
                </td>
                <td className="bd-c5 bd-right bd-nums">
                  {formatReceiptAmount(totalAmount)}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
