'use client';

import type { DailyReturnsSummaryReportRow } from '@/types/reports/daily-returns-summary';

type Props = {
  rows: DailyReturnsSummaryReportRow[];
};

const money = (n: number) =>
  Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function MethodsBlock({
  cash,
  creditCard,
  slip,
  cheque,
  eWallet,
  agent,
  credit,
}: {
  cash: number;
  creditCard: number;
  slip: number;
  cheque: number;
  eWallet: number;
  agent: number;
  credit: number;
}) {
  return (
    <div className="drs-methods">
      <div className="drs-methods-col">
        <span className="drs-line">
          <span className="drs-k">Cash</span>
          {money(cash)}
        </span>
        <span className="drs-line">
          <span className="drs-k">Card</span>
          {money(creditCard)}
        </span>
        <span className="drs-line">
          <span className="drs-k">Slip</span>
          {money(slip)}
        </span>
        <span className="drs-line">
          <span className="drs-k">Cheque</span>
          {money(cheque)}
        </span>
      </div>
      <div className="drs-methods-col">
        <span className="drs-line">
          <span className="drs-k">E-Wallet</span>
          {money(eWallet)}
        </span>
        <span className="drs-line">
          <span className="drs-k">Agent</span>
          {money(agent)}
        </span>
        <span className="drs-line">
          <span className="drs-k">Credit</span>
          {money(credit)}
        </span>
      </div>
    </div>
  );
}

/**
 * Print-only compact A4 portrait for Daily Returns Summary.
 * Columns: No. | Receipt Type | Count | Methods (stacked) | Float Total
 * Dense rows so more receipt types fit per page; branded header via ReportPrintLayout.
 */
export function DailyReturnsSummaryPrintLayout({ rows }: Props) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.count += r.count;
      acc.cash += r.cash;
      acc.creditCard += r.creditCard;
      acc.slip += r.slip;
      acc.cheque += r.cheque;
      acc.eWallet += r.eWallet;
      acc.floatTotal += r.floatTotal;
      acc.agent += r.agent;
      acc.credit += r.credit;
      return acc;
    },
    {
      count: 0,
      cash: 0,
      creditCard: 0,
      slip: 0,
      cheque: 0,
      eWallet: 0,
      floatTotal: 0,
      agent: 0,
      credit: 0,
    }
  );

  return (
    <div className="drs-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm 8mm 12mm;
          }

          .daily-returns-summary-report-root .rpt-print-header {
            margin-bottom: 2mm !important;
          }
          .daily-returns-summary-report-root .rpt-print-brand-row {
            height: 12mm !important;
            gap: 5mm !important;
          }
          .daily-returns-summary-report-root .rpt-print-logo {
            height: 12mm !important;
            max-width: 44mm !important;
          }
          .daily-returns-summary-report-root .rpt-print-titles {
            height: 12mm !important;
            padding: 2mm 0 0.4mm !important;
          }
          .daily-returns-summary-report-root .rpt-print-org {
            height: 4mm !important;
            font-size: 13pt !important;
          }
          .daily-returns-summary-report-root .rpt-print-title-gap {
            height: 0.6mm !important;
          }
          .daily-returns-summary-report-root .rpt-print-report-name {
            height: 3.8mm !important;
            font-size: 9.5pt !important;
          }
          .daily-returns-summary-report-root .rpt-print-rule {
            margin-top: 1.2mm !important;
          }
          .daily-returns-summary-report-root .rpt-print-summary {
            margin-top: 2mm !important;
          }
          .daily-returns-summary-report-root .rpt-print-summary-bar {
            padding: 0.9mm 2mm !important;
            font-size: 7pt !important;
          }
          .daily-returns-summary-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1mm 3mm !important;
            padding: 1.5mm 2mm !important;
          }
          .daily-returns-summary-report-root .rpt-print-label {
            margin: 0 0 0.3mm !important;
            font-size: 6pt !important;
          }
          .daily-returns-summary-report-root .rpt-print-value {
            font-size: 8pt !important;
            line-height: 1.15 !important;
          }
          .daily-returns-summary-report-root .rpt-print-body {
            margin-top: 2.5mm !important;
          }

          .daily-returns-summary-report-root .rpt-print-root table.drs-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-family: Helvetica, Arial, sans-serif !important;
          }
          .daily-returns-summary-report-root .rpt-print-root table.drs-print-table thead {
            display: table-header-group !important;
          }
          .daily-returns-summary-report-root .rpt-print-root table.drs-print-table th,
          .daily-returns-summary-report-root .rpt-print-root table.drs-print-table td {
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
          .daily-returns-summary-report-root .rpt-print-root table.drs-print-table th {
            background: #e8e8e8 !important;
            font-weight: 700 !important;
            font-size: 5.75pt !important;
            text-align: left !important;
            vertical-align: middle !important;
            padding: 0.7mm 0.7mm !important;
          }
          .daily-returns-summary-report-root .rpt-print-root table.drs-print-table th *,
          .daily-returns-summary-report-root .rpt-print-root table.drs-print-table td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: #000 !important;
          }
          .daily-returns-summary-report-root .rpt-print-root table.drs-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .daily-returns-summary-report-root .drs-line {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .daily-returns-summary-report-root .drs-methods {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            column-gap: 1.5mm !important;
            row-gap: 0 !important;
            width: 100% !important;
          }
          .daily-returns-summary-report-root .drs-methods-col {
            min-width: 0 !important;
          }
          .daily-returns-summary-report-root .drs-strong {
            font-weight: 700 !important;
          }
          .daily-returns-summary-report-root .drs-k {
            font-weight: 700 !important;
            margin-right: 0.6mm !important;
          }
          .daily-returns-summary-report-root .drs-clamp2 {
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            overflow: hidden !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            max-height: 2.4em !important;
          }
          .daily-returns-summary-report-root .drs-nums {
            font-variant-numeric: tabular-nums !important;
          }
          .daily-returns-summary-report-root .drs-center {
            text-align: center !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
          }
          .daily-returns-summary-report-root .drs-right {
            text-align: right !important;
          }
          .daily-returns-summary-report-root .rpt-print-root table.drs-print-table tr.drs-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
            vertical-align: middle !important;
          }

          .daily-returns-summary-report-root .drs-c0 { width: 5% !important; }
          .daily-returns-summary-report-root .drs-c1 { width: 28% !important; }
          .daily-returns-summary-report-root .drs-c2 { width: 10% !important; }
          .daily-returns-summary-report-root .drs-c3 { width: 40% !important; }
          .daily-returns-summary-report-root .drs-c4 { width: 17% !important; }
        }
      `}</style>

      <table className="drs-print-table">
        <colgroup>
          <col className="drs-c0" />
          <col className="drs-c1" />
          <col className="drs-c2" />
          <col className="drs-c3" />
          <col className="drs-c4" />
        </colgroup>
        <thead>
          <tr>
            <th className="drs-c0">No.</th>
            <th className="drs-c1">Receipt Type</th>
            <th className="drs-c2 drs-center">Count</th>
            <th className="drs-c3">Methods</th>
            <th className="drs-c4 drs-right">Float Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="drs-center">
                No records found.
              </td>
            </tr>
          ) : (
            <>
              {rows.map((r, i) => (
                <tr key={String(r.key)}>
                  <td className="drs-c0 drs-center">{i + 1}</td>
                  <td className="drs-c1">
                    <span className="drs-line drs-strong drs-clamp2">{r.method || '—'}</span>
                  </td>
                  <td className="drs-c2 drs-center drs-nums">{r.count}</td>
                  <td className="drs-c3 drs-nums">
                    <MethodsBlock
                      cash={r.cash}
                      creditCard={r.creditCard}
                      slip={r.slip}
                      cheque={r.cheque}
                      eWallet={r.eWallet}
                      agent={r.agent}
                      credit={r.credit}
                    />
                  </td>
                  <td className="drs-c4 drs-nums drs-right drs-strong">
                    {money(r.floatTotal)}
                  </td>
                </tr>
              ))}
              <tr className="drs-total">
                <td className="drs-c0" />
                <td className="drs-c1">Sub Total</td>
                <td className="drs-c2 drs-center drs-nums">{totals.count}</td>
                <td className="drs-c3 drs-nums">
                  <MethodsBlock
                    cash={totals.cash}
                    creditCard={totals.creditCard}
                    slip={totals.slip}
                    cheque={totals.cheque}
                    eWallet={totals.eWallet}
                    agent={totals.agent}
                    credit={totals.credit}
                  />
                </td>
                <td className="drs-c4 drs-nums drs-right">{money(totals.floatTotal)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
