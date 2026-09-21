'use client';

import moment from 'moment';
import { formatCents } from '@/lib/format-money';
import type { CompletedHandoversReportRow } from '@/types/reports/completed-handovers';

type Props = {
  rows: CompletedHandoversReportRow[];
};

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return moment(d).format('YYYY-MM-DD HH:mm');
}

function MethodsBlock({
  cash,
  card,
  slip,
  cheque,
  credit,
  eWallet,
}: {
  cash: number;
  card: number;
  slip: number;
  cheque: number;
  credit: number;
  eWallet: number;
}) {
  return (
    <div className="chr-methods">
      <div className="chr-methods-col">
        <span className="chr-line">
          <span className="chr-k">Cash</span>
          {formatCents(cash)}
        </span>
        <span className="chr-line">
          <span className="chr-k">Card</span>
          {formatCents(card)}
        </span>
        <span className="chr-line">
          <span className="chr-k">Slip</span>
          {formatCents(slip)}
        </span>
        <span className="chr-line">
          <span className="chr-k">Cheque</span>
          {formatCents(cheque)}
        </span>
      </div>
      <div className="chr-methods-col">
        <span className="chr-line">
          <span className="chr-k">Credit</span>
          {formatCents(credit)}
        </span>
        <span className="chr-line">
          <span className="chr-k">E-wallet</span>
          {formatCents(eWallet)}
        </span>
      </div>
    </div>
  );
}

/**
 * Print-only A4 portrait for Handovers Report (16 data columns → compact).
 * No. | Parties | Methods (2-part) | Total | Status
 * Branded header via ReportPrintLayout (ReportTemplate). Actions omitted.
 */
export function CompletedHandoversPrintLayout({ rows }: Props) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.cash += Number(r.cashCents) || 0;
      acc.card += Number(r.cardCents) || 0;
      acc.slip += Number(r.slipCents) || 0;
      acc.cheque += Number(r.checkCents) || 0;
      acc.credit += Number(r.creditCents) || 0;
      acc.eWallet += Number(r.eWalletCents) || 0;
      acc.total += Number(r.totalCents) || 0;
      return acc;
    },
    { cash: 0, card: 0, slip: 0, cheque: 0, credit: 0, eWallet: 0, total: 0 }
  );

  return (
    <div className="chr-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm 8mm 12mm;
          }

          .completed-handovers-report-root .rpt-print-header {
            margin-bottom: 2mm !important;
          }
          .completed-handovers-report-root .rpt-print-brand-row {
            height: 12mm !important;
            gap: 5mm !important;
          }
          .completed-handovers-report-root .rpt-print-logo {
            height: 12mm !important;
            max-width: 44mm !important;
          }
          .completed-handovers-report-root .rpt-print-titles {
            height: 12mm !important;
            padding: 2mm 0 0.4mm !important;
          }
          .completed-handovers-report-root .rpt-print-org {
            height: 4mm !important;
            font-size: 13pt !important;
          }
          .completed-handovers-report-root .rpt-print-title-gap {
            height: 0.6mm !important;
          }
          .completed-handovers-report-root .rpt-print-report-name {
            height: 3.8mm !important;
            font-size: 9.5pt !important;
          }
          .completed-handovers-report-root .rpt-print-rule {
            margin-top: 1.2mm !important;
          }
          .completed-handovers-report-root .rpt-print-summary {
            margin-top: 2mm !important;
          }
          .completed-handovers-report-root .rpt-print-summary-bar {
            padding: 0.9mm 2mm !important;
            font-size: 7pt !important;
          }
          .completed-handovers-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1mm 3mm !important;
            padding: 1.5mm 2mm !important;
          }
          .completed-handovers-report-root .rpt-print-label {
            margin: 0 0 0.3mm !important;
            font-size: 6pt !important;
          }
          .completed-handovers-report-root .rpt-print-value {
            font-size: 8pt !important;
            line-height: 1.15 !important;
          }
          .completed-handovers-report-root .rpt-print-body {
            margin-top: 2.5mm !important;
          }

          .completed-handovers-report-root .rpt-print-root table.chr-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-family: Helvetica, Arial, sans-serif !important;
          }
          .completed-handovers-report-root .rpt-print-root table.chr-print-table thead {
            display: table-header-group !important;
          }
          .completed-handovers-report-root .rpt-print-root table.chr-print-table th,
          .completed-handovers-report-root .rpt-print-root table.chr-print-table td {
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
          .completed-handovers-report-root .rpt-print-root table.chr-print-table th {
            background: #e8e8e8 !important;
            font-weight: 700 !important;
            font-size: 5.75pt !important;
            text-align: left !important;
            vertical-align: middle !important;
            padding: 0.7mm 0.7mm !important;
          }
          .completed-handovers-report-root .rpt-print-root table.chr-print-table th *,
          .completed-handovers-report-root .rpt-print-root table.chr-print-table td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: #000 !important;
          }
          .completed-handovers-report-root .rpt-print-root table.chr-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .completed-handovers-report-root .chr-line {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .completed-handovers-report-root .chr-strong {
            font-weight: 700 !important;
          }
          .completed-handovers-report-root .chr-k {
            font-weight: 700 !important;
            margin-right: 0.6mm !important;
            display: inline !important;
          }
          .completed-handovers-report-root .rpt-print-root table.chr-print-table td .chr-k {
            font-weight: 700 !important;
          }
          .completed-handovers-report-root .chr-muted {
            color: #333 !important;
          }
          .completed-handovers-report-root .chr-clamp2 {
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            overflow: hidden !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            max-height: 2.4em !important;
          }
          .completed-handovers-report-root .chr-nums {
            font-variant-numeric: tabular-nums !important;
          }
          .completed-handovers-report-root .chr-center {
            text-align: center !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
          }
          .completed-handovers-report-root .chr-right {
            text-align: right !important;
          }
          .completed-handovers-report-root .chr-methods {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            column-gap: 1.5mm !important;
            width: 100% !important;
          }
          .completed-handovers-report-root .chr-methods-col {
            min-width: 0 !important;
          }
          .completed-handovers-report-root .rpt-print-root table.chr-print-table tr.chr-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
            vertical-align: middle !important;
          }

          .completed-handovers-report-root .chr-c0 { width: 5% !important; }
          .completed-handovers-report-root .chr-c1 { width: 20% !important; }
          .completed-handovers-report-root .chr-c2 { width: 30% !important; }
          .completed-handovers-report-root .chr-c3 { width: 12% !important; }
          .completed-handovers-report-root .chr-c4 { width: 33% !important; }
        }
      `}</style>

      <table className="chr-print-table">
        <colgroup>
          <col className="chr-c0" />
          <col className="chr-c1" />
          <col className="chr-c2" />
          <col className="chr-c3" />
          <col className="chr-c4" />
        </colgroup>
        <thead>
          <tr>
            <th className="chr-c0">No.</th>
            <th className="chr-c1">Parties</th>
            <th className="chr-c2">Methods</th>
            <th className="chr-c3 chr-right">Total</th>
            <th className="chr-c4">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="chr-center">
                No records found.
              </td>
            </tr>
          ) : (
            <>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="chr-c0 chr-center">{i + 1}</td>
                  <td className="chr-c1">
                    <span className="chr-line chr-clamp2">
                      <span className="chr-k">From</span>
                      {r.fromUserName || '—'}
                    </span>
                    <span className="chr-line chr-clamp2">
                      <span className="chr-k">To</span>
                      {r.toUserName || '—'}
                    </span>
                    <span className="chr-line chr-muted">
                      <span className="chr-k">Shift</span>
                      {fmtDate(r.shiftStartedAt)}
                    </span>
                  </td>
                  <td className="chr-c2 chr-nums">
                    <MethodsBlock
                      cash={r.cashCents}
                      card={r.cardCents}
                      slip={r.slipCents}
                      cheque={r.checkCents}
                      credit={r.creditCents}
                      eWallet={r.eWalletCents}
                    />
                  </td>
                  <td className="chr-c3 chr-right chr-nums chr-strong">
                    {formatCents(r.totalCents)}
                  </td>
                  <td className="chr-c4">
                    <span className="chr-line chr-clamp2">
                      <span className="chr-k">Status</span>
                      {r.statusLabel || '—'}
                    </span>
                    <span className="chr-line chr-clamp2">
                      <span className="chr-k">Recon</span>
                      {r.reconciliationStatusLabel || '—'}
                    </span>
                    <span className="chr-line chr-muted">
                      <span className="chr-k">Handed</span>
                      {fmtDate(r.createdAt)}
                    </span>
                    <span className="chr-line chr-muted">
                      <span className="chr-k">Done</span>
                      {fmtDate(r.completedAt)}
                    </span>
                    {r.discrepancyReason?.trim() ? (
                      <span className="chr-line chr-muted chr-clamp2">
                        <span className="chr-k">Disc</span>
                        {r.discrepancyReason}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
              <tr className="chr-total">
                <td className="chr-c0" />
                <td className="chr-c1">Total</td>
                <td className="chr-c2 chr-nums">
                  <MethodsBlock
                    cash={totals.cash}
                    card={totals.card}
                    slip={totals.slip}
                    cheque={totals.cheque}
                    credit={totals.credit}
                    eWallet={totals.eWallet}
                  />
                </td>
                <td className="chr-c3 chr-right chr-nums">{formatCents(totals.total)}</td>
                <td className="chr-c4" />
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
