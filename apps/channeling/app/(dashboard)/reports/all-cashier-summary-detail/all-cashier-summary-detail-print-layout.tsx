'use client';

import { formatReceiptAmount } from '@/lib/format-money';
import type {
  AllCashierUserDetailRow,
  AllCashierUserSummaryRow,
  CashierSummaryPaymentAmounts,
} from '@/types/report';

type SummaryProps = {
  mode: 'summary';
  summaryRows: AllCashierUserSummaryRow[];
  grandTotals: CashierSummaryPaymentAmounts | null;
  totalReceipts: number;
};

type DetailProps = {
  mode: 'detail';
  detailRows: AllCashierUserDetailRow[];
  grandTotals: CashierSummaryPaymentAmounts | null;
  totalReceipts: number;
};

type Props = SummaryProps | DetailProps;

function formatAmount(n: number | undefined | null): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0.00';
  return formatReceiptAmount(num);
}

function PaymentsBlock({ amounts }: { amounts: CashierSummaryPaymentAmounts }) {
  return (
    <>
      <span className="acs-line">
        <span className="acs-k">Cash</span>
        {formatAmount(amounts.cash)}
      </span>
      <span className="acs-line">
        <span className="acs-k">Card</span>
        {formatAmount(amounts.creditCard)}
      </span>
      <span className="acs-line">
        <span className="acs-k">Slip</span>
        {formatAmount(amounts.slip)}
      </span>
      <span className="acs-line">
        <span className="acs-k">Cheque</span>
        {formatAmount(amounts.cheque)}
      </span>
      <span className="acs-line">
        <span className="acs-k">Agent</span>
        {formatAmount(amounts.agent)}
      </span>
      <span className="acs-line">
        <span className="acs-k">Credit</span>
        {formatAmount(amounts.agentCredit)}
      </span>
      <span className="acs-line">
        <span className="acs-k">E-wallet</span>
        {formatAmount(amounts.eWallet)}
      </span>
    </>
  );
}

function SignatureLine() {
  return <div className="acs-sig" aria-hidden />;
}

/**
 * Print-only A4 portrait for All Cashier Summary and Detail.
 * Summary & Detail: compact categorized columns (payments stacked).
 */
export function AllCashierSummaryDetailPrintLayout(props: Props) {
  return (
    <div className="acs-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm 8mm 12mm;
          }

          .all-cashier-summary-detail-report-root .acs-screen-table {
            display: none !important;
          }
          .all-cashier-summary-detail-report-root .acs-print-only {
            display: block !important;
          }

          .all-cashier-summary-detail-report-root .rpt-print-header {
            margin-bottom: 2mm !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-brand-row {
            height: 12mm !important;
            gap: 5mm !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-logo {
            height: 12mm !important;
            max-width: 44mm !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-titles {
            height: 12mm !important;
            padding: 2mm 0 0.4mm !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-org {
            height: 4mm !important;
            font-size: 13pt !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-title-gap {
            height: 0.6mm !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-report-name {
            height: 3.8mm !important;
            font-size: 9.5pt !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-rule {
            margin-top: 1.2mm !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-summary {
            margin-top: 2mm !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-summary-bar {
            padding: 0.9mm 2mm !important;
            font-size: 7pt !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 1mm 3mm !important;
            padding: 1.5mm 2mm !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-label {
            margin: 0 0 0.3mm !important;
            font-size: 6pt !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-value {
            font-size: 8pt !important;
            line-height: 1.15 !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-body {
            margin-top: 2.5mm !important;
          }

          .all-cashier-summary-detail-report-root .rpt-print-root table.acs-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            font-family: Helvetica, Arial, sans-serif !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-root table.acs-print-table thead {
            display: table-header-group !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-root table.acs-print-table th,
          .all-cashier-summary-detail-report-root .rpt-print-root table.acs-print-table td {
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
          .all-cashier-summary-detail-report-root .rpt-print-root table.acs-print-table th {
            background: #e8e8e8 !important;
            font-weight: 700 !important;
            font-size: 6pt !important;
            text-align: left !important;
            vertical-align: middle !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-root table.acs-print-table th *,
          .all-cashier-summary-detail-report-root .rpt-print-root table.acs-print-table td * {
            font-size: inherit !important;
            line-height: inherit !important;
            color: #000 !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-root table.acs-print-table tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .all-cashier-summary-detail-report-root .acs-line {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .all-cashier-summary-detail-report-root .acs-strong {
            font-weight: 700 !important;
          }
          .all-cashier-summary-detail-report-root .acs-muted {
            color: #333 !important;
            font-size: 5.75pt !important;
          }
          .all-cashier-summary-detail-report-root .acs-k {
            font-weight: 700 !important;
            margin-right: 0.6mm !important;
          }
          .all-cashier-summary-detail-report-root .acs-clamp2 {
            display: -webkit-box !important;
            -webkit-box-orient: vertical !important;
            -webkit-line-clamp: 2 !important;
            overflow: hidden !important;
            white-space: normal !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            max-height: 2.5em !important;
          }
          .all-cashier-summary-detail-report-root .acs-nums {
            text-align: right !important;
            font-variant-numeric: tabular-nums !important;
            white-space: nowrap !important;
          }
          .all-cashier-summary-detail-report-root .acs-center {
            text-align: center !important;
            vertical-align: middle !important;
            white-space: nowrap !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-root table.acs-print-table tr.acs-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
            vertical-align: middle !important;
          }
          .all-cashier-summary-detail-report-root .rpt-print-root table.acs-print-table tr.acs-user-total td {
            font-weight: 700 !important;
            background: #f7f7f7 !important;
          }

          .all-cashier-summary-detail-report-root .acs-sig {
            display: block !important;
            border-bottom: 0.3mm dotted #000 !important;
            min-height: 4mm !important;
            width: 100% !important;
            margin-top: 1mm !important;
          }

          .all-cashier-summary-detail-report-root .acs-s0 { width: 5% !important; }
          .all-cashier-summary-detail-report-root .acs-s1 { width: 22% !important; }
          .all-cashier-summary-detail-report-root .acs-s2 { width: 10% !important; }
          .all-cashier-summary-detail-report-root .acs-s3 { width: 33% !important; }
          .all-cashier-summary-detail-report-root .acs-s4 { width: 15% !important; }
          .all-cashier-summary-detail-report-root .acs-s5 { width: 15% !important; }

          .all-cashier-summary-detail-report-root .acs-d0 { width: 4% !important; }
          .all-cashier-summary-detail-report-root .acs-d1 { width: 16% !important; }
          .all-cashier-summary-detail-report-root .acs-d2 { width: 18% !important; }
          .all-cashier-summary-detail-report-root .acs-d3 { width: 8% !important; }
          .all-cashier-summary-detail-report-root .acs-d4 { width: 28% !important; }
          .all-cashier-summary-detail-report-root .acs-d5 { width: 13% !important; }
          .all-cashier-summary-detail-report-root .acs-d6 { width: 13% !important; }

          .all-cashier-summary-detail-report-root .acs-user-block {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 3mm !important;
          }
          .all-cashier-summary-detail-report-root .acs-user-block:last-child {
            margin-bottom: 0 !important;
          }
        }

        @media screen {
          .all-cashier-summary-detail-report-root .acs-print-only {
            display: none !important;
          }
        }
      `}</style>

      {props.mode === 'summary' ? (
        <SummaryPrintTable {...props} />
      ) : (
        <DetailPrintTable {...props} />
      )}
    </div>
  );
}

function SummaryPrintTable({
  summaryRows,
  grandTotals,
  totalReceipts,
}: SummaryProps) {
  return (
    <table className="acs-print-table">
      <colgroup>
        <col className="acs-s0" />
        <col className="acs-s1" />
        <col className="acs-s2" />
        <col className="acs-s3" />
        <col className="acs-s4" />
        <col className="acs-s5" />
      </colgroup>
      <thead>
        <tr>
          <th className="acs-s0">No.</th>
          <th className="acs-s1">User</th>
          <th className="acs-s2 acs-nums">Receipts</th>
          <th className="acs-s3">Payments</th>
          <th className="acs-s4">Handover Date</th>
          <th className="acs-s5">Checked By</th>
        </tr>
      </thead>
      <tbody>
        {summaryRows.length === 0 ? (
          <tr>
            <td colSpan={6} className="acs-center">
              No records found.
            </td>
          </tr>
        ) : (
          <>
            {summaryRows.map((r, i) => (
              <tr key={r.userId}>
                <td className="acs-s0 acs-center">{i + 1}</td>
                <td className="acs-s1">
                  <span className="acs-line acs-strong acs-clamp2">{r.userName}</span>
                </td>
                <td className="acs-s2 acs-nums">{r.receiptCount}</td>
                <td className="acs-s3 acs-nums">
                  <PaymentsBlock amounts={r} />
                </td>
                <td className="acs-s4">
                  <SignatureLine />
                </td>
                <td className="acs-s5">
                  <SignatureLine />
                </td>
              </tr>
            ))}
            {grandTotals ? (
              <tr className="acs-total">
                <td className="acs-s0" />
                <td className="acs-s1">Total</td>
                <td className="acs-s2 acs-nums">{totalReceipts}</td>
                <td className="acs-s3 acs-nums">
                  <PaymentsBlock amounts={grandTotals} />
                </td>
                <td className="acs-s4" />
                <td className="acs-s5" />
              </tr>
            ) : null}
          </>
        )}
      </tbody>
    </table>
  );
}

function DetailPrintTable({
  detailRows,
  grandTotals,
  totalReceipts,
}: DetailProps) {
  if (detailRows.length === 0) {
    return (
      <table className="acs-print-table">
        <tbody>
          <tr>
            <td className="acs-center">No records found.</td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <div>
      {detailRows.map((u, idx) => (
        <div key={u.userId} className="acs-user-block">
          <table className="acs-print-table">
            <colgroup>
              <col className="acs-d0" />
              <col className="acs-d1" />
              <col className="acs-d2" />
              <col className="acs-d3" />
              <col className="acs-d4" />
              <col className="acs-d5" />
              <col className="acs-d6" />
            </colgroup>
            <thead>
              <tr>
                <th className="acs-d0">No.</th>
                <th className="acs-d1">User</th>
                <th className="acs-d2">Section</th>
                <th className="acs-d3 acs-nums">Receipts</th>
                <th className="acs-d4">Payments</th>
                <th className="acs-d5">Handover Date</th>
                <th className="acs-d6">Checked By</th>
              </tr>
            </thead>
            <tbody>
              {u.sections.map((s, i) => (
                <tr key={`${u.userId}-${s.key}`}>
                  <td className="acs-d0 acs-center">{i === 0 ? idx + 1 : ''}</td>
                  <td className="acs-d1">
                    {i === 0 ? (
                      <span className="acs-line acs-strong acs-clamp2">{u.userName}</span>
                    ) : null}
                  </td>
                  <td className="acs-d2">
                    <span className="acs-line acs-clamp2">{s.title}</span>
                  </td>
                  <td className="acs-d3 acs-nums">{s.receiptCount}</td>
                  <td className="acs-d4 acs-nums">
                    <PaymentsBlock amounts={s.totals} />
                  </td>
                  {i === 0 ? (
                    <>
                      <td className="acs-d5" rowSpan={u.sections.length + 1}>
                        <SignatureLine />
                      </td>
                      <td className="acs-d6" rowSpan={u.sections.length + 1}>
                        <SignatureLine />
                      </td>
                    </>
                  ) : null}
                </tr>
              ))}
              <tr className="acs-user-total">
                <td className="acs-d0" />
                <td className="acs-d1" colSpan={2}>
                  User Total
                </td>
                <td className="acs-d3 acs-nums">{u.receiptCount}</td>
                <td className="acs-d4 acs-nums">
                  <PaymentsBlock amounts={u.totals} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      {grandTotals ? (
        <table className="acs-print-table" style={{ marginTop: '2mm' }}>
          <colgroup>
            <col className="acs-d0" />
            <col className="acs-d1" />
            <col className="acs-d2" />
            <col className="acs-d3" />
            <col className="acs-d4" />
            <col className="acs-d5" />
            <col className="acs-d6" />
          </colgroup>
          <tbody>
            <tr className="acs-total">
              <td className="acs-d0" />
              <td className="acs-d1" colSpan={2}>
                Grand Total
                <span className="acs-line acs-muted">Receipts {totalReceipts}</span>
              </td>
              <td className="acs-d3 acs-nums">{totalReceipts}</td>
              <td className="acs-d4 acs-nums">
                <PaymentsBlock amounts={grandTotals} />
              </td>
              <td className="acs-d5" />
              <td className="acs-d6" />
            </tr>
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
