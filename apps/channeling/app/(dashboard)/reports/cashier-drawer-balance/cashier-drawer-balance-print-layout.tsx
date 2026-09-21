'use client';

import { formatCents } from '@/lib/format-money';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import type { CashierDrawerBalanceReportRow } from '@/types/reports/cashier-drawer-balance';

type Props = {
  rows: CashierDrawerBalanceReportRow[];
};

function fmtTill(name: string | null, code: string | null): string {
  const n = (name ?? '').trim() || '—';
  return code ? `${n} (${code})` : n;
}

/**
 * Print-only A4 portrait for Cashier Drawer Balance.
 * Matches vertical PDF: flat columns (no compact / stacked payments).
 * Header via ReportPrintLayout.
 */
export function CashierDrawerBalancePrintLayout({ rows }: Props) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.cashCents += r.cashCents;
      acc.cardCents += r.cardCents;
      acc.creditCents += r.creditCents;
      acc.slipCents += r.slipCents;
      acc.checkCents += r.checkCents;
      acc.eWalletCents += r.eWalletCents;
      acc.totalCents += r.totalCents;
      return acc;
    },
    {
      cashCents: 0,
      cardCents: 0,
      creditCents: 0,
      slipCents: 0,
      checkCents: 0,
      eWalletCents: 0,
      totalCents: 0,
    }
  );

  return (
    <div className="cdb-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm 8mm 12mm;
          }

          .cashier-drawer-balance-report-root .rpt-print-header {
            margin-bottom: 2mm !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-brand-row {
            height: 12mm !important;
            gap: 5mm !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-logo {
            height: 12mm !important;
            max-width: 44mm !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-titles {
            height: 12mm !important;
            padding: 2mm 0 0.4mm !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-org {
            height: 4mm !important;
            font-size: 13pt !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-title-gap {
            height: 0.6mm !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-report-name {
            height: 3.8mm !important;
            font-size: 9.5pt !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-rule {
            margin-top: 1.2mm !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-summary {
            margin-top: 2mm !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-summary-bar {
            padding: 0.9mm 2mm !important;
            font-size: 7pt !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1mm 3mm !important;
            padding: 1.5mm 2mm !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-label {
            margin: 0 0 0.3mm !important;
            font-size: 6pt !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-value {
            font-size: 8pt !important;
            line-height: 1.15 !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-body {
            margin-top: 2.5mm !important;
          }

          .cashier-drawer-balance-report-root .rpt-print-root table.cdb-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-family: Helvetica, Arial, sans-serif !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-root table.cdb-print-table thead {
            display: table-header-group !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-root table.cdb-print-table th,
          .cashier-drawer-balance-report-root .rpt-print-root table.cdb-print-table td {
            border: 0.2mm solid #000 !important;
            color: #000 !important;
            background: #fff !important;
            padding: 0.9mm 0.7mm !important;
            font-size: 6.5pt !important;
            line-height: 1.2 !important;
            font-weight: 400 !important;
            vertical-align: top !important;
            text-align: left !important;
            overflow: hidden !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-root table.cdb-print-table th {
            background: #e8e8e8 !important;
            font-weight: 700 !important;
            font-size: 6pt !important;
            text-align: left !important;
            vertical-align: middle !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-root table.cdb-print-table th.cdb-amt,
          .cashier-drawer-balance-report-root .rpt-print-root table.cdb-print-table td.cdb-amt {
            text-align: right !important;
            font-variant-numeric: tabular-nums !important;
            white-space: nowrap !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-root table.cdb-print-table th *,
          .cashier-drawer-balance-report-root .rpt-print-root table.cdb-print-table td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: #000 !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-root table.cdb-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .cashier-drawer-balance-report-root .rpt-print-root table.cdb-print-table tr.cdb-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
            vertical-align: middle !important;
          }

          .cashier-drawer-balance-report-root .cdb-till { width: 26% !important; }
          .cashier-drawer-balance-report-root .cdb-cashier { width: 16% !important; }
          .cashier-drawer-balance-report-root .cdb-amt { width: 8.3% !important; }
          .cashier-drawer-balance-report-root .cdb-total { width: 8.2% !important; }
        }
      `}</style>

      <table className="cdb-print-table">
        <thead>
          <tr>
            <th className="cdb-till">Till</th>
            <th className="cdb-cashier">Cashier</th>
            <th className="cdb-amt">Cash</th>
            <th className="cdb-amt">Card</th>
            <th className="cdb-amt">Credit</th>
            <th className="cdb-amt">Slip</th>
            <th className="cdb-amt">Cheque</th>
            <th className="cdb-amt">E-Wallet</th>
            <th className="cdb-amt cdb-total">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={9} style={{ textAlign: 'center' }}>
                No records found.
              </td>
            </tr>
          ) : (
            <>
              {rows.map((r) => (
                <tr key={r.tillAccountId}>
                  <td className="cdb-till">{fmtTill(r.tillAccountName, r.tillAccountCode)}</td>
                  <td className="cdb-cashier">
                    {formatUserDisplayName(
                      r.cashierName,
                      r.cashierUserId ?? undefined,
                      r.cashierStaffCode
                    ) || '—'}
                  </td>
                  <td className="cdb-amt">{formatCents(r.cashCents)}</td>
                  <td className="cdb-amt">{formatCents(r.cardCents)}</td>
                  <td className="cdb-amt">{formatCents(r.creditCents)}</td>
                  <td className="cdb-amt">{formatCents(r.slipCents)}</td>
                  <td className="cdb-amt">{formatCents(r.checkCents)}</td>
                  <td className="cdb-amt">{formatCents(r.eWalletCents)}</td>
                  <td className="cdb-amt cdb-total">{formatCents(r.totalCents)}</td>
                </tr>
              ))}
              <tr className="cdb-total">
                <td className="cdb-till" colSpan={2}>
                  Total
                </td>
                <td className="cdb-amt">{formatCents(totals.cashCents)}</td>
                <td className="cdb-amt">{formatCents(totals.cardCents)}</td>
                <td className="cdb-amt">{formatCents(totals.creditCents)}</td>
                <td className="cdb-amt">{formatCents(totals.slipCents)}</td>
                <td className="cdb-amt">{formatCents(totals.checkCents)}</td>
                <td className="cdb-amt">{formatCents(totals.eWalletCents)}</td>
                <td className="cdb-amt cdb-total">{formatCents(totals.totalCents)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
