'use client';

import moment from 'moment';
import type { ChannelReportReceiptWiseRow } from '@/types/reports/channel-report-receipt-wise';

function dash(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

function formatMoney(value: unknown): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return '0.00';
  return n.toFixed(2);
}

function formatReceiptDate(value: Date | string | null | undefined): string {
  if (!value) return '-';
  return moment(value).format('YYYY-MM-DD hh:mm A');
}

function formatSessionDate(value: Date | string | null | undefined): string {
  if (!value) return '-';
  return moment(value).format('YYYY-MM-DD');
}

type CompactReceipt = {
  receiptNo: string;
  receiptDate: string;
  paymentMethod: string;
  transactionType: string;
  cancelLine: string | null;
  reversedLine: string | null;
  amount: string;
  wht: string;
  net: string;
  appNo: string;
  sessionWhen: string;
  consultant: string;
  patientName: string;
  bookingStatus: string;
  agency: string;
  creditCustomer: string;
  creator: string;
  handover: string;
};

function mapCompactReceipt(row: ChannelReportReceiptWiseRow): CompactReceipt {
  const cancel = dash(row.cancelReason);
  const reversed = dash(row.reversedReceiptNo);
  const whtNum = Number(row.whdAmount ?? 0);

  return {
    receiptNo: dash(row.receiptNo),
    receiptDate: formatReceiptDate(row.receiptDate),
    paymentMethod: dash(row.receiptMethod),
    transactionType: dash(row.transactionType),
    cancelLine: cancel !== '-' ? `Cancel: ${cancel}` : null,
    reversedLine: reversed !== '-' ? `Rev: ${reversed}` : null,
    amount: formatMoney(row.receiptAmount),
    wht: whtNum !== 0 ? formatMoney(row.whdAmount) : '-',
    net: formatMoney(row.netAmount ?? row.receiptAmount),
    appNo: dash(row.appointmentNo),
    sessionWhen: `${formatSessionDate(row.sessionDate)} · ${dash(row.sessionTime)}`,
    consultant: dash(row.consultant),
    patientName: dash(row.patientName),
    bookingStatus: dash(row.bookingStatus),
    agency: dash(row.agency),
    creditCustomer: dash(row.creditCustomer),
    creator: dash(row.creator),
    handover: dash(row.handedToStaff),
  };
}

type Props = {
  rows: ChannelReportReceiptWiseRow[];
};

/**
 * Print-only compact A4 portrait table for Receipt Report.
 * Matches Channel Booking / Schedule compact readability (labeled lines, 6 bands).
 */
export function ChannelReportReceiptWisePrintLayout({ rows }: Props) {
  const groups = new Map<string, ChannelReportReceiptWiseRow[]>();
  for (const row of rows) {
    const key = row.receiptScope?.trim() || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  let amountTotal = 0;
  let whtTotal = 0;
  let netTotal = 0;
  for (const row of rows) {
    amountTotal += Number(row.receiptAmount ?? 0) || 0;
    whtTotal += Number(row.whdAmount ?? 0) || 0;
    netTotal += Number(row.netAmount ?? row.receiptAmount ?? 0) || 0;
  }

  return (
    <div className="rr-print-root">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 5mm 18mm;
          }
          .receipt-report-root,
          .receipt-report-root.container {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .receipt-report-root .rpt-print-root,
          .receipt-report-root .rpt-print-body,
          .receipt-report-root .rpt-print-header,
          .receipt-report-root .rpt-print-summary,
          .receipt-report-root .rr-print-root,
          .receipt-report-root .rr-print-table {
            width: 100% !important;
            max-width: none !important;
            box-sizing: border-box !important;
          }

          .rr-print-root {
            color: #000 !important;
            font-family: Verdana, Geneva, Tahoma, sans-serif;
            font-size: 7pt;
            line-height: 1.15;
          }
          .rr-print-group {
            margin: 0 0 1.6mm;
            break-inside: auto;
          }
          .rr-print-group-title {
            font-size: 7.5pt;
            font-weight: 700;
            margin: 0;
            padding: 0.7mm 1.2mm;
            background: #ececec;
            border: 0.5pt solid #000;
            border-bottom: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            break-after: avoid;
            page-break-after: avoid;
          }
          .rr-print-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
          }
          .rr-print-table thead {
            display: table-header-group;
          }
          .rr-print-table th {
            font-size: 6pt;
            font-weight: 700;
            text-align: left;
            padding: 0.6mm 0.8mm;
            border: 0.5pt solid #000;
            background: #f3f3f3;
            color: #000 !important;
            line-height: 1.15;
            white-space: normal;
            word-break: normal;
            overflow-wrap: break-word;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .rr-print-table td {
            vertical-align: top;
            padding: 0.7mm 0.8mm;
            border: 0.4pt solid #999;
            font-size: 7.25pt;
            line-height: 1.25;
            color: #000 !important;
            white-space: normal;
            word-break: normal;
            overflow-wrap: break-word;
          }
          .rr-print-table tbody tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .rr-print-table tbody tr:last-child td {
            border-bottom: 0.5pt solid #000;
          }
          .rr-print-table col.rr-col-receipt { width: 14%; }
          .rr-print-table col.rr-col-payment { width: 15%; }
          .rr-print-table col.rr-col-amounts { width: 13%; }
          .rr-print-table col.rr-col-session { width: 20%; }
          .rr-print-table col.rr-col-patient { width: 22%; }
          .rr-print-table col.rr-col-audit { width: 16%; }
          .rr-print-line {
            display: block;
          }
          .rr-print-line + .rr-print-line {
            margin-top: 0.25mm;
          }
          .rr-print-strong {
            font-weight: 700;
          }
          .rr-print-muted {
            color: #333 !important;
          }
          .rr-print-nums {
            font-variant-numeric: tabular-nums;
          }
          .rr-print-kv {
            display: grid;
            grid-template-columns: 9mm 1fr;
            column-gap: 0.8mm;
            align-items: baseline;
          }
          .rr-print-k {
            font-size: 5.75pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            color: #444 !important;
          }
          .rr-print-v {
            min-width: 0;
          }
          .rr-print-totals {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 0.7pt solid #000;
            margin-top: 1.4mm;
            padding: 1mm 1.4mm;
          }
          .rr-print-totals-title {
            font-size: 7pt;
            font-weight: 700;
            margin: 0 0 0.6mm;
          }
          .rr-print-totals-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.5mm 2.5mm;
          }
          .rr-print-total-item {
            min-width: 0;
          }
          .rr-print-total-label {
            display: block;
            font-size: 5.5pt;
            font-weight: 700;
            text-transform: uppercase;
            color: #444 !important;
            line-height: 1.05;
          }
          .rr-print-total-value {
            display: block;
            font-size: 8pt;
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            line-height: 1.15;
          }
        }
        @media screen {
          .rr-print-root { display: none; }
        }
      `}</style>

      {Array.from(groups.entries()).map(([groupKey, groupRows]) => (
        <section key={groupKey} className="rr-print-group">
          <div className="rr-print-group-title">{groupKey}</div>
          <table className="rr-print-table">
            <colgroup>
              <col className="rr-col-receipt" />
              <col className="rr-col-payment" />
              <col className="rr-col-amounts" />
              <col className="rr-col-session" />
              <col className="rr-col-patient" />
              <col className="rr-col-audit" />
            </colgroup>
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Payment</th>
                <th>Amounts</th>
                <th>Session</th>
                <th>Patient / Parties</th>
                <th>Audit</th>
              </tr>
            </thead>
            <tbody>
              {groupRows.map((row) => {
                const r = mapCompactReceipt(row);
                return (
                  <tr key={row.id}>
                    <td>
                      <span className="rr-print-line rr-print-strong">{r.receiptNo}</span>
                      <span className="rr-print-line">{r.receiptDate}</span>
                    </td>
                    <td>
                      <span className="rr-print-line">{r.paymentMethod}</span>
                      <span className="rr-print-line">{r.transactionType}</span>
                      {r.cancelLine ? <span className="rr-print-line">{r.cancelLine}</span> : null}
                      {r.reversedLine ? <span className="rr-print-line">{r.reversedLine}</span> : null}
                    </td>
                    <td className="rr-print-nums">
                      <span className="rr-print-line">Amt&nbsp;&nbsp;{r.amount}</span>
                      <span className="rr-print-line">WHT&nbsp;&nbsp;{r.wht}</span>
                      <span className="rr-print-line">Net&nbsp;&nbsp;{r.net}</span>
                    </td>
                    <td>
                      <span className="rr-print-line">App #{r.appNo}</span>
                      <span className="rr-print-line">{r.sessionWhen}</span>
                      <span className="rr-print-line">{r.consultant}</span>
                    </td>
                    <td>
                      <span className="rr-print-line rr-print-strong">{r.patientName}</span>
                      <span className="rr-print-line">{r.bookingStatus}</span>
                      <span className="rr-print-line">Agy: {r.agency}</span>
                      <span className="rr-print-line">Credit: {r.creditCustomer}</span>
                    </td>
                    <td>
                      <span className="rr-print-line">By: {r.creator}</span>
                      <span className="rr-print-line">Hand: {r.handover}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      {rows.length > 0 ? (
        <div className="rr-print-totals">
          <div className="rr-print-totals-title">Total</div>
          <div className="rr-print-totals-grid">
            <div className="rr-print-total-item">
              <span className="rr-print-total-label">Amount</span>
              <span className="rr-print-total-value">{amountTotal.toFixed(2)}</span>
            </div>
            <div className="rr-print-total-item">
              <span className="rr-print-total-label">WHT</span>
              <span className="rr-print-total-value">{whtTotal.toFixed(2)}</span>
            </div>
            <div className="rr-print-total-item">
              <span className="rr-print-total-label">Net Amount</span>
              <span className="rr-print-total-value">{netTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
