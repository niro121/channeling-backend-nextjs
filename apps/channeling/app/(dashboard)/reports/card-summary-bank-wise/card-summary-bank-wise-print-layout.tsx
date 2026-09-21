'use client';

import moment from 'moment';
import { formatReceiptAmount } from '@/lib/format-money';
import type {
  CardSummaryBankWiseReportFormat,
  CardSummaryBankWiseReportRow,
} from '@/types/reports/card-summary-bank-wise';

type Props = {
  format: CardSummaryBankWiseReportFormat;
  rows: CardSummaryBankWiseReportRow[];
};

/**
 * Print-only A4 portrait for Card Summary - Bank Wise.
 * Summary: No. | Bank Name | Count | Total
 * Detail: No. | Receipt | Details (stacked) | Bank | Card No | Total
 */
export function CardSummaryBankWisePrintLayout({ format, rows }: Props) {
  const totalCount = rows.reduce((acc, r) => acc + (Number(r.count) || 0), 0);
  const totalAmount = rows.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);

  return (
    <div className="csbw-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm 8mm 12mm;
          }

          .card-summary-bank-wise-report-root .rpt-print-header {
            margin-bottom: 2mm !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-brand-row {
            height: 12mm !important;
            gap: 5mm !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-logo {
            height: 12mm !important;
            max-width: 44mm !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-titles {
            height: 12mm !important;
            padding: 2mm 0 0.4mm !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-org {
            height: 4mm !important;
            font-size: 13pt !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-title-gap {
            height: 0.6mm !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-report-name {
            height: 3.8mm !important;
            font-size: 9.5pt !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-rule {
            margin-top: 1.2mm !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-summary {
            margin-top: 2mm !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-summary-bar {
            padding: 0.9mm 2mm !important;
            font-size: 7pt !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1mm 3mm !important;
            padding: 1.5mm 2mm !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-label {
            margin: 0 0 0.3mm !important;
            font-size: 6pt !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-value {
            font-size: 8pt !important;
            line-height: 1.15 !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-body {
            margin-top: 2.5mm !important;
          }

          .card-summary-bank-wise-report-root .rpt-print-root table.csbw-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-family: Helvetica, Arial, sans-serif !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-root table.csbw-print-table thead {
            display: table-header-group !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-root table.csbw-print-table th,
          .card-summary-bank-wise-report-root .rpt-print-root table.csbw-print-table td {
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
          .card-summary-bank-wise-report-root .rpt-print-root table.csbw-print-table th {
            background: #e8e8e8 !important;
            font-weight: 700 !important;
            font-size: 5.75pt !important;
            text-align: left !important;
            vertical-align: middle !important;
            padding: 0.7mm 0.7mm !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-root table.csbw-print-table th *,
          .card-summary-bank-wise-report-root .rpt-print-root table.csbw-print-table td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: #000 !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-root table.csbw-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .card-summary-bank-wise-report-root .csbw-line {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .card-summary-bank-wise-report-root .csbw-strong {
            font-weight: 700 !important;
          }
          .card-summary-bank-wise-report-root .csbw-k {
            font-weight: 700 !important;
            margin-right: 0.6mm !important;
            display: inline !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-root table.csbw-print-table td .csbw-k {
            font-weight: 700 !important;
          }
          .card-summary-bank-wise-report-root .csbw-muted {
            color: #333 !important;
          }
          .card-summary-bank-wise-report-root .csbw-clamp2 {
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            overflow: hidden !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            max-height: 2.4em !important;
          }
          .card-summary-bank-wise-report-root .csbw-nums {
            font-variant-numeric: tabular-nums !important;
          }
          .card-summary-bank-wise-report-root .csbw-center {
            text-align: center !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
          }
          .card-summary-bank-wise-report-root .csbw-right {
            text-align: right !important;
          }
          .card-summary-bank-wise-report-root .rpt-print-root table.csbw-print-table tr.csbw-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
            vertical-align: middle !important;
          }

          /* Summary widths */
          .card-summary-bank-wise-report-root .csbw-s0 { width: 8% !important; }
          .card-summary-bank-wise-report-root .csbw-s1 { width: 52% !important; }
          .card-summary-bank-wise-report-root .csbw-s2 { width: 18% !important; }
          .card-summary-bank-wise-report-root .csbw-s3 { width: 22% !important; }

          /* Detail widths */
          .card-summary-bank-wise-report-root .csbw-d0 { width: 5% !important; }
          .card-summary-bank-wise-report-root .csbw-d1 { width: 14% !important; }
          .card-summary-bank-wise-report-root .csbw-d2 { width: 36% !important; }
          .card-summary-bank-wise-report-root .csbw-d3 { width: 16% !important; }
          .card-summary-bank-wise-report-root .csbw-d4 { width: 14% !important; }
          .card-summary-bank-wise-report-root .csbw-d5 { width: 15% !important; }
        }
      `}</style>

      {format === 'summary' ? (
        <table className="csbw-print-table">
          <colgroup>
            <col className="csbw-s0" />
            <col className="csbw-s1" />
            <col className="csbw-s2" />
            <col className="csbw-s3" />
          </colgroup>
          <thead>
            <tr>
              <th className="csbw-s0">No.</th>
              <th className="csbw-s1">Bank Name</th>
              <th className="csbw-s2 csbw-right">Count</th>
              <th className="csbw-s3 csbw-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="csbw-center">
                  No records found.
                </td>
              </tr>
            ) : (
              <>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td className="csbw-s0 csbw-center">{i + 1}</td>
                    <td className="csbw-s1">
                      <span className="csbw-line csbw-strong csbw-clamp2">
                        {r.bankName || '—'}
                      </span>
                    </td>
                    <td className="csbw-s2 csbw-right csbw-nums">{Number(r.count) || 0}</td>
                    <td className="csbw-s3 csbw-right csbw-nums csbw-strong">
                      {formatReceiptAmount(Number(r.totalAmount) || 0)}
                    </td>
                  </tr>
                ))}
                <tr className="csbw-total">
                  <td className="csbw-s0" />
                  <td className="csbw-s1">Total</td>
                  <td className="csbw-s2 csbw-right csbw-nums">{totalCount}</td>
                  <td className="csbw-s3 csbw-right csbw-nums">
                    {formatReceiptAmount(totalAmount)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      ) : (
        <table className="csbw-print-table">
          <colgroup>
            <col className="csbw-d0" />
            <col className="csbw-d1" />
            <col className="csbw-d2" />
            <col className="csbw-d3" />
            <col className="csbw-d4" />
            <col className="csbw-d5" />
          </colgroup>
          <thead>
            <tr>
              <th className="csbw-d0">No.</th>
              <th className="csbw-d1">Receipt</th>
              <th className="csbw-d2">Details</th>
              <th className="csbw-d3">Bank</th>
              <th className="csbw-d4">Card No</th>
              <th className="csbw-d5 csbw-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="csbw-center">
                  No records found.
                </td>
              </tr>
            ) : (
              <>
                {rows.map((r, i) => {
                  const created =
                    r.createdAt != null
                      ? moment(r.createdAt).format('YYYY-MM-DD HH:mm')
                      : '—';
                  return (
                    <tr key={r.id}>
                      <td className="csbw-d0 csbw-center">{i + 1}</td>
                      <td className="csbw-d1">
                        <span className="csbw-line csbw-strong csbw-clamp2">
                          {r.receiptNoString || '—'}
                        </span>
                      </td>
                      <td className="csbw-d2">
                        <span className="csbw-line csbw-clamp2">
                          <span className="csbw-k">Loc</span>
                          {r.userLocation || '—'}
                        </span>
                        <span className="csbw-line csbw-clamp2">
                          <span className="csbw-k">User</span>
                          {r.user || '—'}
                        </span>
                        <span className="csbw-line csbw-muted">
                          <span className="csbw-k">At</span>
                          {created}
                        </span>
                        {r.remarks ? (
                          <span className="csbw-line csbw-muted csbw-clamp2">
                            <span className="csbw-k">Remark</span>
                            {r.remarks}
                          </span>
                        ) : null}
                      </td>
                      <td className="csbw-d3">
                        <span className="csbw-line csbw-clamp2">{r.bankName || '—'}</span>
                      </td>
                      <td className="csbw-d4">
                        <span className="csbw-line csbw-clamp2">{r.cardReference || '—'}</span>
                      </td>
                      <td className="csbw-d5 csbw-right csbw-nums csbw-strong">
                        {formatReceiptAmount(Number(r.totalAmount) || 0)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="csbw-total">
                  <td className="csbw-d0" colSpan={5}>
                    Total
                  </td>
                  <td className="csbw-d5 csbw-right csbw-nums">
                    {formatReceiptAmount(totalAmount)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
