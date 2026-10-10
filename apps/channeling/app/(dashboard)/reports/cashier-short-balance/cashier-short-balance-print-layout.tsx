'use client';

import { formatCents } from '@/lib/format-money';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import type { CashierShortBalanceReportRow } from '@/types/reports/cashier-short-balance';

type Props = {
  rows: CashierShortBalanceReportRow[];
};

function fmtAccount(name: string | null, code: string | null): string {
  const n = (name ?? '').trim() || '—';
  return code ? `${n} (${code})` : n;
}

function fmtBranch(name: string | null, code: string | null): string {
  const n = (name ?? '').trim();
  if (!n && !code) return '—';
  if (n && code) return `${n} (${code})`;
  return n || code || '—';
}

/**
 * Print-only A4 portrait for Cashier Short Balance.
 * Header is the shared ReportPrintLayout. Body matches the compact portrait PDF table.
 */
export function CashierShortBalancePrintLayout({ rows }: Props) {
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
    <div className="csb-print-root">
      <style>{`
        @media print {
          .cashier-short-balance-report-root,
          .cashier-short-balance-report-root.rpt-template-root {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            color: #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .cashier-short-balance-report-root .rpt-template-card,
          .cashier-short-balance-report-root .rpt-template-card > div,
          .cashier-short-balance-report-root .rpt-print-root,
          .cashier-short-balance-report-root .rpt-print-header,
          .cashier-short-balance-report-root .rpt-print-summary,
          .cashier-short-balance-report-root .rpt-print-body,
          .cashier-short-balance-report-root .csb-print-root {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            box-sizing: border-box !important;
          }

          .cashier-short-balance-report-root .rpt-print-root table.csb-print-table {
            width: 100% !important;
            max-width: none !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-family: Helvetica, Arial, sans-serif !important;
            border: 0.2mm solid #000 !important;
          }
          .cashier-short-balance-report-root .rpt-print-root table.csb-print-table thead {
            display: table-header-group !important;
          }
          .cashier-short-balance-report-root .rpt-print-root table.csb-print-table th,
          .cashier-short-balance-report-root .rpt-print-root table.csb-print-table td {
            border: 0.2mm solid #000 !important;
            color: #000 !important;
            background: #fff !important;
            padding: 0.7mm !important;
            font-size: 5.5pt !important;
            line-height: 1.2 !important;
            font-weight: 400 !important;
            vertical-align: middle !important;
            text-align: left !important;
            overflow: hidden !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .cashier-short-balance-report-root .rpt-print-root table.csb-print-table th {
            background: #e8e8e8 !important;
            font-weight: 700 !important;
            font-size: 5pt !important;
            text-align: left !important;
            vertical-align: middle !important;
          }
          .cashier-short-balance-report-root .rpt-print-root table.csb-print-table th.csb-amt,
          .cashier-short-balance-report-root .rpt-print-root table.csb-print-table td.csb-amt {
            text-align: right !important;
            font-variant-numeric: tabular-nums !important;
            white-space: nowrap !important;
            word-break: normal !important;
            overflow-wrap: normal !important;
          }
          .cashier-short-balance-report-root .rpt-print-root table.csb-print-table th *,
          .cashier-short-balance-report-root .rpt-print-root table.csb-print-table td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: #000 !important;
          }
          .cashier-short-balance-report-root .rpt-print-root table.csb-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .cashier-short-balance-report-root .rpt-print-root table.csb-print-table tr.csb-total td {
            font-weight: 700 !important;
            background: #fff !important;
            vertical-align: middle !important;
          }
          .cashier-short-balance-report-root .rpt-print-root table.csb-print-table th:first-child,
          .cashier-short-balance-report-root .rpt-print-root table.csb-print-table td:first-child {
            border-left: 0.35mm solid #000 !important;
          }
          .cashier-short-balance-report-root .rpt-print-root table.csb-print-table th:last-child,
          .cashier-short-balance-report-root .rpt-print-root table.csb-print-table td:last-child {
            border-right: 0.35mm solid #000 !important;
            box-shadow: inset -0.35mm 0 0 #000 !important;
          }

          .cashier-short-balance-report-root .csb-account { width: 18% !important; }
          .cashier-short-balance-report-root .csb-cashier { width: 14% !important; }
          .cashier-short-balance-report-root .csb-branch { width: 12% !important; }
          .cashier-short-balance-report-root .csb-amt { width: 8% !important; }
          .cashier-short-balance-report-root .csb-total-col { width: 8% !important; }
        }
      `}</style>

      <table className="csb-print-table">
        <thead>
          <tr>
            <th className="csb-account">Account</th>
            <th className="csb-cashier">Cashier</th>
            <th className="csb-branch">Branch</th>
            <th className="csb-amt">Cash</th>
            <th className="csb-amt">Card</th>
            <th className="csb-amt">Credit</th>
            <th className="csb-amt">Slip</th>
            <th className="csb-amt">Cheque</th>
            <th className="csb-amt">E-Wallet</th>
            <th className="csb-amt csb-total-col">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={10} style={{ textAlign: 'center' }}>
                No records found.
              </td>
            </tr>
          ) : (
            <>
              {rows.map((r) => (
                <tr key={r.accountId}>
                  <td className="csb-account">{fmtAccount(r.accountName, r.accountCode)}</td>
                  <td className="csb-cashier">
                    {formatUserDisplayName(
                      r.cashierName,
                      r.cashierUserId ?? undefined,
                      r.cashierStaffCode
                    ) || '—'}
                  </td>
                  <td className="csb-branch">{fmtBranch(r.locationName, r.locationCode)}</td>
                  <td className="csb-amt">{formatCents(r.cashCents)}</td>
                  <td className="csb-amt">{formatCents(r.cardCents)}</td>
                  <td className="csb-amt">{formatCents(r.creditCents)}</td>
                  <td className="csb-amt">{formatCents(r.slipCents)}</td>
                  <td className="csb-amt">{formatCents(r.checkCents)}</td>
                  <td className="csb-amt">{formatCents(r.eWalletCents)}</td>
                  <td className="csb-amt csb-total-col">{formatCents(r.totalCents)}</td>
                </tr>
              ))}
              <tr className="csb-total">
                <td className="csb-account" colSpan={3}>
                  Total
                </td>
                <td className="csb-amt">{formatCents(totals.cashCents)}</td>
                <td className="csb-amt">{formatCents(totals.cardCents)}</td>
                <td className="csb-amt">{formatCents(totals.creditCents)}</td>
                <td className="csb-amt">{formatCents(totals.slipCents)}</td>
                <td className="csb-amt">{formatCents(totals.checkCents)}</td>
                <td className="csb-amt">{formatCents(totals.eWalletCents)}</td>
                <td className="csb-amt csb-total-col">{formatCents(totals.totalCents)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
