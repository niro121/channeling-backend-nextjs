'use client';

import moment from 'moment';
import { formatReceiptAmount } from '@/lib/format-money';
import type { AgentCollectionReceiptReportRow } from '@/types/reports/agent-collection-receipt';

type Props = {
  rows: AgentCollectionReceiptReportRow[];
};

function isNegative(row: AgentCollectionReceiptReportRow): boolean {
  return (row.receiptAmount ?? 0) < 0;
}

function dash(value: string | null | undefined): string {
  if (value == null || value === '') return '—';
  return value;
}

/**
 * Print-only compact A4 portrait for Agent Collection Receipt.
 * Columns: No. | Date / User | Receipt | Agent | Amounts | Payment Refs
 */
export function AgentCollectionReceiptPrintLayout({ rows }: Props) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.receipt += Number(r.receiptAmount) || 0;
      acc.cash += Number(r.cashAmount) || 0;
      acc.card += Number(r.cardAmount) || 0;
      acc.cheque += Number(r.chequeAmount) || 0;
      acc.slip += Number(r.slipAmount) || 0;
      acc.eWallet += Number(r.eWalletAmount) || 0;
      return acc;
    },
    { receipt: 0, cash: 0, card: 0, cheque: 0, slip: 0, eWallet: 0 }
  );

  return (
    <div className="acr-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm 8mm 12mm;
          }

          .agent-collection-receipt-report-root .rpt-print-header {
            margin-bottom: 2mm !important;
          }
          .agent-collection-receipt-report-root .rpt-print-brand-row {
            height: 12mm !important;
            gap: 5mm !important;
          }
          .agent-collection-receipt-report-root .rpt-print-logo {
            height: 12mm !important;
            max-width: 44mm !important;
          }
          .agent-collection-receipt-report-root .rpt-print-titles {
            height: 12mm !important;
            padding: 2mm 0 0.4mm !important;
          }
          .agent-collection-receipt-report-root .rpt-print-org {
            height: 4mm !important;
            font-size: 13pt !important;
          }
          .agent-collection-receipt-report-root .rpt-print-title-gap {
            height: 0.6mm !important;
          }
          .agent-collection-receipt-report-root .rpt-print-report-name {
            height: 3.8mm !important;
            font-size: 9.5pt !important;
          }
          .agent-collection-receipt-report-root .rpt-print-rule {
            margin-top: 1.2mm !important;
          }
          .agent-collection-receipt-report-root .rpt-print-summary {
            margin-top: 2mm !important;
          }
          .agent-collection-receipt-report-root .rpt-print-summary-bar {
            padding: 0.9mm 2mm !important;
            font-size: 7pt !important;
          }
          .agent-collection-receipt-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1mm 3mm !important;
            padding: 1.5mm 2mm !important;
          }
          .agent-collection-receipt-report-root .rpt-print-label {
            margin: 0 0 0.3mm !important;
            font-size: 6pt !important;
          }
          .agent-collection-receipt-report-root .rpt-print-value {
            font-size: 8pt !important;
            line-height: 1.15 !important;
          }
          .agent-collection-receipt-report-root .rpt-print-body {
            margin-top: 2.5mm !important;
          }

          .agent-collection-receipt-report-root .rpt-print-root table.acr-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-family: Helvetica, Arial, sans-serif !important;
          }
          .agent-collection-receipt-report-root .rpt-print-root table.acr-print-table thead {
            display: table-header-group !important;
          }
          .agent-collection-receipt-report-root .rpt-print-root table.acr-print-table th,
          .agent-collection-receipt-report-root .rpt-print-root table.acr-print-table td {
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
          .agent-collection-receipt-report-root .rpt-print-root table.acr-print-table th {
            background: #e8e8e8 !important;
            font-weight: 700 !important;
            font-size: 6pt !important;
            text-align: left !important;
            vertical-align: middle !important;
          }
          .agent-collection-receipt-report-root .rpt-print-root table.acr-print-table th *,
          .agent-collection-receipt-report-root .rpt-print-root table.acr-print-table td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: inherit !important;
          }
          .agent-collection-receipt-report-root .rpt-print-root table.acr-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .agent-collection-receipt-report-root .acr-line {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .agent-collection-receipt-report-root .acr-strong {
            font-weight: 700 !important;
          }
          .agent-collection-receipt-report-root .acr-muted {
            color: #333 !important;
            font-size: 5.75pt !important;
          }
          .agent-collection-receipt-report-root .acr-k {
            font-weight: 700 !important;
            margin-right: 0.6mm !important;
          }
          .agent-collection-receipt-report-root .acr-clamp2 {
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            overflow: hidden !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            max-height: 2.5em !important;
          }
          .agent-collection-receipt-report-root .acr-center {
            text-align: center !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
          }
          .agent-collection-receipt-report-root .acr-nums {
            font-variant-numeric: tabular-nums !important;
          }
          .agent-collection-receipt-report-root .acr-neg {
            color: #b91c1c !important;
          }
          .agent-collection-receipt-report-root .rpt-print-root table.acr-print-table tr.acr-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
            vertical-align: middle !important;
          }

          .agent-collection-receipt-report-root .acr-c0 { width: 4% !important; }
          .agent-collection-receipt-report-root .acr-c1 { width: 14% !important; }
          .agent-collection-receipt-report-root .acr-c2 { width: 16% !important; }
          .agent-collection-receipt-report-root .acr-c3 { width: 16% !important; }
          .agent-collection-receipt-report-root .acr-c4 { width: 24% !important; }
          .agent-collection-receipt-report-root .acr-c5 { width: 26% !important; }
        }
      `}</style>

      <table className="acr-print-table">
        <colgroup>
          <col className="acr-c0" />
          <col className="acr-c1" />
          <col className="acr-c2" />
          <col className="acr-c3" />
          <col className="acr-c4" />
          <col className="acr-c5" />
        </colgroup>
        <thead>
          <tr>
            <th className="acr-c0">No.</th>
            <th className="acr-c1">Date / User</th>
            <th className="acr-c2">Receipt</th>
            <th className="acr-c3">Agent</th>
            <th className="acr-c4">Amounts</th>
            <th className="acr-c5">Payment Refs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const neg = isNegative(r);
            const negCls = neg ? 'acr-neg' : '';
            return (
              <tr key={r.id} className={negCls}>
                <td className="acr-c0 acr-center">{i + 1}</td>
                <td className="acr-c1">
                  <span className="acr-line acr-strong">
                    {r.createdAt ? moment(r.createdAt).format('YYYY-MM-DD') : '—'}
                  </span>
                  <span className="acr-line acr-muted">
                    {r.createdAt ? moment(r.createdAt).format('HH:mm:ss') : ''}
                  </span>
                  <span className="acr-line acr-muted acr-clamp2">
                    {dash(r.createdUser)}
                  </span>
                </td>
                <td className="acr-c2">
                  <span className="acr-line acr-strong acr-clamp2">
                    {dash(r.receiptNoString)}
                  </span>
                  {r.remarks ? (
                    <span className="acr-line acr-muted acr-clamp2">{r.remarks}</span>
                  ) : null}
                  {r.cancelReason ? (
                    <span className="acr-line acr-muted acr-clamp2">
                      Cancel: {r.cancelReason}
                    </span>
                  ) : null}
                </td>
                <td className="acr-c3">
                  <span className="acr-line acr-strong acr-clamp2">
                    {dash(r.agencyName)}
                  </span>
                  <span className="acr-line acr-muted">Code {dash(r.agencyCode)}</span>
                </td>
                <td className="acr-c4 acr-nums">
                  <span className="acr-line acr-strong">
                    <span className="acr-k">Receipt</span>
                    {formatReceiptAmount(r.receiptAmount ?? 0)}
                  </span>
                  <span className="acr-line">
                    <span className="acr-k">Cash</span>
                    {formatReceiptAmount(r.cashAmount ?? 0)}
                  </span>
                  <span className="acr-line">
                    <span className="acr-k">Card</span>
                    {formatReceiptAmount(r.cardAmount ?? 0)}
                  </span>
                  <span className="acr-line">
                    <span className="acr-k">Cheque</span>
                    {formatReceiptAmount(r.chequeAmount ?? 0)}
                  </span>
                  <span className="acr-line">
                    <span className="acr-k">Slip</span>
                    {formatReceiptAmount(r.slipAmount ?? 0)}
                  </span>
                  <span className="acr-line">
                    <span className="acr-k">E-Wallet</span>
                    {formatReceiptAmount(r.eWalletAmount ?? 0)}
                  </span>
                </td>
                <td className="acr-c5">
                  <span className="acr-line">
                    <span className="acr-k">Slip</span>
                    {dash(r.slipRef)}
                    {r.slipDate ? ` · ${r.slipDate}` : ''}
                  </span>
                  <span className="acr-line">
                    <span className="acr-k">Cheque</span>
                    {dash(r.chequeRef)}
                    {r.chequeDate ? ` · ${r.chequeDate}` : ''}
                  </span>
                  <span className="acr-line">
                    <span className="acr-k">Card</span>
                    {dash(r.cardRef)}
                  </span>
                  <span className="acr-line acr-clamp2">
                    <span className="acr-k">Bank</span>
                    {dash(r.bankName)}
                  </span>
                </td>
              </tr>
            );
          })}
          <tr className="acr-total">
            <td className="acr-c0" colSpan={4}>
              Total
            </td>
            <td className="acr-c4 acr-nums">
              <span className="acr-line">
                <span className="acr-k">Receipt</span>
                {formatReceiptAmount(totals.receipt)}
              </span>
              <span className="acr-line">
                <span className="acr-k">Cash</span>
                {formatReceiptAmount(totals.cash)}
              </span>
              <span className="acr-line">
                <span className="acr-k">Card</span>
                {formatReceiptAmount(totals.card)}
              </span>
              <span className="acr-line">
                <span className="acr-k">Cheque</span>
                {formatReceiptAmount(totals.cheque)}
              </span>
              <span className="acr-line">
                <span className="acr-k">Slip</span>
                {formatReceiptAmount(totals.slip)}
              </span>
              <span className="acr-line">
                <span className="acr-k">E-Wallet</span>
                {formatReceiptAmount(totals.eWallet)}
              </span>
            </td>
            <td className="acr-c5" />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
