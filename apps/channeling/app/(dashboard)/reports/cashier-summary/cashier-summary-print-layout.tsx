'use client';

import { formatReceiptAmount } from '@/lib/format-money';
import type {
  CashierSummaryPaymentAmounts,
  CashierSummaryReportSection,
} from '@/types/report';

const PAYMENT_KEYS: (keyof CashierSummaryPaymentAmounts)[] = [
  'cash',
  'creditCard',
  'slip',
  'cheque',
  'agent',
  'agentCredit',
  'eWallet',
];

const AGENCY_BILL_SECTION_KEYS = new Set([
  'agentBilled',
  'agentRefunded',
  'agentCanceled',
  'agentDeposit',
  'agentDepositCanceled',
]);

const CASH_SUMMARY_KEYS: (keyof CashierSummaryPaymentAmounts)[] = [
  'cash',
  'creditCard',
  'cheque',
  'eWallet',
];

type DetailProps = {
  mode: 'detail';
  sections: CashierSummaryReportSection[];
  grandTotals: CashierSummaryPaymentAmounts | null;
};

type SummaryProps = {
  mode: 'summary';
};

type Props = DetailProps | SummaryProps;

function formatAmount(n: number | undefined | null): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0.00';
  return formatReceiptAmount(num);
}

function sumAmounts(
  t: CashierSummaryPaymentAmounts,
  keys: (keyof CashierSummaryPaymentAmounts)[]
): number {
  return keys.reduce((acc, k) => acc + Number(t[k] ?? 0), 0);
}

function sectionHasAnyTotal(section: CashierSummaryReportSection): boolean {
  return PAYMENT_KEYS.some((k) => section.totals[k] !== 0);
}

function PaymentsBlock({ amounts }: { amounts: CashierSummaryPaymentAmounts }) {
  return (
    <>
      <span className="ucs-line">
        <span className="ucs-k">Cash</span>
        {formatAmount(amounts.cash)}
      </span>
      <span className="ucs-line">
        <span className="ucs-k">Card</span>
        {formatAmount(amounts.creditCard)}
      </span>
      <span className="ucs-line">
        <span className="ucs-k">Slip</span>
        {formatAmount(amounts.slip)}
      </span>
      <span className="ucs-line">
        <span className="ucs-k">Cheque</span>
        {formatAmount(amounts.cheque)}
      </span>
      <span className="ucs-line">
        <span className="ucs-k">Agent</span>
        {formatAmount(amounts.agent)}
      </span>
      <span className="ucs-line">
        <span className="ucs-k">Credit</span>
        {formatAmount(amounts.agentCredit)}
      </span>
      <span className="ucs-line">
        <span className="ucs-k">E-wallet</span>
        {formatAmount(amounts.eWallet)}
      </span>
    </>
  );
}

/**
 * Print styles + Detail compact tables for Userwise Cashier Detail - Channel.
 * Summary keeps existing on-screen tables for print; Detail uses compact columns.
 * Both formats: A4 portrait + ReportPrintLayout branded header.
 */
export function CashierSummaryPrintLayout(props: Props) {
  return (
    <div className="ucs-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm 8mm 12mm;
          }

          .cashier-summary-report-root .ucs-screen-detail {
            display: none !important;
          }
          .cashier-summary-report-root .ucs-print-only {
            display: block !important;
          }

          .cashier-summary-report-root .rpt-print-header {
            margin-bottom: 2mm !important;
            height: auto !important;
            overflow: visible !important;
            position: static !important;
          }
          .cashier-summary-report-root .rpt-print-brand-row {
            height: 12mm !important;
            gap: 5mm !important;
          }
          .cashier-summary-report-root .rpt-print-logo {
            height: 12mm !important;
            max-width: 44mm !important;
          }
          .cashier-summary-report-root .rpt-print-titles {
            height: 12mm !important;
            padding: 2mm 0 0.4mm !important;
          }
          .cashier-summary-report-root .rpt-print-org {
            height: 4mm !important;
            font-size: 13pt !important;
          }
          .cashier-summary-report-root .rpt-print-title-gap {
            height: 0.6mm !important;
          }
          .cashier-summary-report-root .rpt-print-report-name {
            height: 3.8mm !important;
            font-size: 9.5pt !important;
          }
          .cashier-summary-report-root .rpt-print-rule {
            margin-top: 1.2mm !important;
          }
          .cashier-summary-report-root .rpt-print-summary {
            margin-top: 2mm !important;
            height: auto !important;
            overflow: visible !important;
          }
          .cashier-summary-report-root .rpt-print-summary-bar {
            padding: 0.9mm 2mm !important;
            font-size: 7pt !important;
          }
          .cashier-summary-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1mm 3mm !important;
            padding: 1.5mm 2mm !important;
            height: auto !important;
            overflow: visible !important;
          }
          .cashier-summary-report-root .rpt-print-label {
            margin: 0 0 0.3mm !important;
            font-size: 6pt !important;
          }
          .cashier-summary-report-root .rpt-print-value {
            height: auto !important;
            overflow: visible !important;
            font-size: 8pt !important;
            line-height: 1.25 !important;
            white-space: pre-line !important;
          }
          .cashier-summary-report-root .rpt-print-root .whitespace-pre-line {
            white-space: pre-line !important;
          }
          .cashier-summary-report-root .rpt-print-body {
            margin-top: 2.5mm !important;
            position: static !important;
            clear: both !important;
          }

          /* Summary: keep existing tables readable on portrait */
          .cashier-summary-report-root .ucs-screen-summary .overflow-x-auto,
          .cashier-summary-report-root .ucs-screen-summary .overflow-auto {
            overflow: visible !important;
          }
          .cashier-summary-report-root .ucs-screen-summary table {
            table-layout: fixed !important;
            width: 100% !important;
          }
          .cashier-summary-report-root .ucs-screen-summary th,
          .cashier-summary-report-root .ucs-screen-summary td {
            font-size: 6.5pt !important;
            padding: 0.8mm 0.6mm !important;
            line-height: 1.15 !important;
          }
          .cashier-summary-report-root .ucs-screen-summary thead th,
          .cashier-summary-report-root .ucs-screen-summary th {
            font-size: 6pt !important;
          }
          .cashier-summary-report-root .cashier-section-empty {
            display: none !important;
          }

          .cashier-summary-report-root .rpt-print-root table.ucs-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-family: Helvetica, Arial, sans-serif !important;
          }
          .cashier-summary-report-root .rpt-print-root table.ucs-print-table thead {
            display: table-header-group !important;
          }
          .cashier-summary-report-root .rpt-print-root table.ucs-print-table th,
          .cashier-summary-report-root .rpt-print-root table.ucs-print-table td {
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
          .cashier-summary-report-root .rpt-print-root table.ucs-print-table th {
            background: #e8e8e8 !important;
            font-weight: 700 !important;
            font-size: 6pt !important;
            text-align: left !important;
            vertical-align: middle !important;
          }
          .cashier-summary-report-root .rpt-print-root table.ucs-print-table th *,
          .cashier-summary-report-root .rpt-print-root table.ucs-print-table td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: #000 !important;
          }
          .cashier-summary-report-root .rpt-print-root table.ucs-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .cashier-summary-report-root .ucs-line {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .cashier-summary-report-root .ucs-strong {
            font-weight: 700 !important;
          }
          .cashier-summary-report-root .ucs-muted {
            color: #333 !important;
            font-size: 5.75pt !important;
          }
          .cashier-summary-report-root .ucs-k {
            font-weight: 700 !important;
            margin-right: 0.6mm !important;
          }
          .cashier-summary-report-root .ucs-clamp2 {
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            overflow: hidden !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            max-height: 2.5em !important;
          }
          .cashier-summary-report-root .ucs-nums {
            font-variant-numeric: tabular-nums !important;
          }
          .cashier-summary-report-root .ucs-center {
            text-align: center !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
          }
          .cashier-summary-report-root .rpt-print-root table.ucs-print-table tr.ucs-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
            vertical-align: middle !important;
          }

          .cashier-summary-report-root .ucs-section {
            margin-bottom: 3mm !important;
            break-inside: auto !important;
            page-break-inside: auto !important;
            break-before: auto !important;
            page-break-before: auto !important;
          }
          .cashier-summary-report-root .ucs-section-title {
            font-size: 8pt !important;
            font-weight: 700 !important;
            margin: 0 0 1mm !important;
            color: #000 !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          .cashier-summary-report-root .ucs-section table.ucs-print-table {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }

          .cashier-summary-report-root .ucs-d0 { width: 4% !important; }
          .cashier-summary-report-root .ucs-d1 { width: 16% !important; }
          .cashier-summary-report-root .ucs-d2 { width: 18% !important; }
          .cashier-summary-report-root .ucs-d3 { width: 28% !important; }
          .cashier-summary-report-root .ucs-d4 { width: 34% !important; }

          .cashier-summary-report-root .ucs-footer-wrap {
            margin-top: 3mm !important;
            max-width: 70mm !important;
          }
          .cashier-summary-report-root .ucs-footer-title {
            font-size: 7pt !important;
            font-weight: 700 !important;
            margin: 0 0 1mm !important;
            text-transform: uppercase !important;
          }
          .cashier-summary-report-root .rpt-print-root table.ucs-footer-table th,
          .cashier-summary-report-root .rpt-print-root table.ucs-footer-table td {
            font-size: 7pt !important;
            padding: 0.8mm 1.2mm !important;
          }
        }

        @media screen {
          .cashier-summary-report-root .ucs-print-only {
            display: none !important;
          }
        }
      `}</style>

      {props.mode === 'detail' ? (
        <div className="ucs-print-only hidden print:block">
          <DetailPrintBody {...props} />
        </div>
      ) : null}
    </div>
  );
}

function DetailPrintBody({ sections, grandTotals }: DetailProps) {
  return (
    <>
      {sections.map((section) => {
        const showRows = section.rows.length > 0;
        const hasTotals = sectionHasAnyTotal(section);
        if (!showRows && !hasTotals) return null;

        const isIncomeExpense = section.key === 'incomeExpense';
        const isAgency = AGENCY_BILL_SECTION_KEYS.has(section.key);
        const partyLabel = isIncomeExpense ? 'Name / Type' : isAgency ? 'Agency / Consultant' : 'Patient / Consultant';

        return (
          <div key={section.key} className="ucs-section">
            <h3 className="ucs-section-title">{section.title}</h3>
            {showRows ? (
              <table className="ucs-print-table">
                <colgroup>
                  <col className="ucs-d0" />
                  <col className="ucs-d1" />
                  <col className="ucs-d2" />
                  <col className="ucs-d3" />
                  <col className="ucs-d4" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="ucs-d0">No.</th>
                    <th className="ucs-d1">Tx / Shift</th>
                    <th className="ucs-d2">Receipt / Session</th>
                    <th className="ucs-d3">{partyLabel}</th>
                    <th className="ucs-d4">Payments</th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, idx) => {
                    const tx =
                      row.txCreated instanceof Date
                        ? row.txCreated.toLocaleString()
                        : String(row.txCreated ?? '—');
                    return (
                      <tr key={`${section.key}-${idx}`}>
                        <td className="ucs-d0 ucs-center">{idx + 1}</td>
                        <td className="ucs-d1">
                          <span className="ucs-line ucs-strong">{tx}</span>
                          <span className="ucs-line ucs-muted">{row.shiftLabel ?? '—'}</span>
                        </td>
                        <td className="ucs-d2">
                          <span className="ucs-line ucs-strong">{row.receiptId || '—'}</span>
                          <span className="ucs-line ucs-muted">Bill {row.billId ?? '—'}</span>
                          <span className="ucs-line ucs-muted">{row.sessionDateTime ?? '—'}</span>
                        </td>
                        <td className="ucs-d3">
                          {isIncomeExpense ? (
                            <>
                              <span className="ucs-line ucs-strong ucs-clamp2">
                                {row.name ?? '—'}
                              </span>
                              <span className="ucs-line ucs-muted">{row.type ?? '—'}</span>
                            </>
                          ) : (
                            <>
                              <span className="ucs-line ucs-strong ucs-clamp2">
                                {row.patient ?? '—'}
                              </span>
                              <span className="ucs-line ucs-muted ucs-clamp2">
                                {row.consultant ?? '—'}
                              </span>
                            </>
                          )}
                        </td>
                        <td className="ucs-d4 ucs-nums">
                          <PaymentsBlock amounts={row} />
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="ucs-total">
                    <td className="ucs-d0" />
                    <td className="ucs-d1" colSpan={3}>
                      Total
                    </td>
                    <td className="ucs-d4 ucs-nums">
                      <PaymentsBlock amounts={section.totals} />
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table className="ucs-print-table">
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>Total</th>
                    <th>Payments</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="ucs-total">
                    <td>Total</td>
                    <td className="ucs-nums">
                      <PaymentsBlock amounts={section.totals} />
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      {grandTotals ? <CreditCashFooterPrint totals={grandTotals} /> : null}
    </>
  );
}

function CreditCashFooterPrint({ totals }: { totals: CashierSummaryPaymentAmounts }) {
  const slip = Number(totals.slip);
  const creditCustomer = Number(totals.agentCredit);
  const creditSectionTotal = slip + creditCustomer;
  const cashSectionTotal = sumAmounts(totals, CASH_SUMMARY_KEYS);
  const agentTotal = Number(totals.agent);
  const grandCombined = creditSectionTotal + cashSectionTotal;

  return (
    <div className="ucs-footer-wrap">
      <div className="ucs-footer-title">Cashier summary (credit vs cash)</div>
      <table className="ucs-print-table ucs-footer-table">
        <thead>
          <tr>
            <th colSpan={2}>Credit Summary</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Slip Total</td>
            <td className="ucs-nums" style={{ textAlign: 'right' }}>
              {formatAmount(slip)}
            </td>
          </tr>
          <tr>
            <td>Credit Total</td>
            <td className="ucs-nums" style={{ textAlign: 'right' }}>
              {formatAmount(creditCustomer)}
            </td>
          </tr>
          <tr className="ucs-total">
            <td>Total</td>
            <td className="ucs-nums" style={{ textAlign: 'right' }}>
              {formatAmount(creditSectionTotal)}
            </td>
          </tr>
        </tbody>
        <thead>
          <tr>
            <th colSpan={2}>Cash Summary</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cash Total</td>
            <td className="ucs-nums" style={{ textAlign: 'right' }}>
              {formatAmount(totals.cash)}
            </td>
          </tr>
          <tr>
            <td>Credit Card Total</td>
            <td className="ucs-nums" style={{ textAlign: 'right' }}>
              {formatAmount(totals.creditCard)}
            </td>
          </tr>
          <tr>
            <td>Cheque Total</td>
            <td className="ucs-nums" style={{ textAlign: 'right' }}>
              {formatAmount(totals.cheque)}
            </td>
          </tr>
          <tr>
            <td>E-wallet Total</td>
            <td className="ucs-nums" style={{ textAlign: 'right' }}>
              {formatAmount(totals.eWallet)}
            </td>
          </tr>
          <tr className="ucs-total">
            <td>Total</td>
            <td className="ucs-nums" style={{ textAlign: 'right' }}>
              {formatAmount(cashSectionTotal)}
            </td>
          </tr>
          <tr className="ucs-total">
            <td>Grand Total</td>
            <td className="ucs-nums" style={{ textAlign: 'right' }}>
              {formatAmount(grandCombined)}
            </td>
          </tr>
          <tr>
            <td>Agent Total</td>
            <td className="ucs-nums" style={{ textAlign: 'right' }}>
              {formatAmount(agentTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
