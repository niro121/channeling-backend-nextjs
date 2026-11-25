import { format } from 'date-fns';
import type { PatientBillDetail } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { isActiveLineItem } from '@/lib/patient-bills/line-item-status';
import { printReceiptHtml } from '@/lib/receipts/print-receipt';

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const LETTERHEAD_PHONE = '091 7694059 / 60';
const LETTERHEAD_EMAIL = 'info@ruhunuhospital.lk';
const LETTERHEAD_WEB = 'www.ruhunuhospital.lk';

export type FinalBillPrintLetterhead = {
  locationName?: string | null;
  addressLine?: string | null;
};

function invoiceRow(label: string, value: string, strong = false): string {
  const valueClass = strong ? 'value strong' : 'value';
  const labelHtml = strong ? `<strong>${escapeHtml(label)}</strong>` : escapeHtml(label);
  return `<tr>
    <td class="label">${labelHtml}</td>
    <td class="colon">:</td>
    <td class="${valueClass}">${escapeHtml(value)}</td>
  </tr>`;
}

export function buildFinalBillPrintHtml(
  bill: PatientBillDetail,
  letterhead?: FinalBillPrintLetterhead
) {
  const activeItems = bill.lineItems.filter(isActiveLineItem);
  const lineRows = activeItems
    .map(
      (item, index) => `<tr>
        <td class="num">${index + 1}</td>
        <td>${escapeHtml(item.doctorName || '—')}</td>
        <td class="amount">${Number(item.amount) === 0 ? 'FOC' : escapeHtml(formatLkr(item.amount))}</td>
      </tr>`
    )
    .join('');

  const headerRows = invoiceRow('Patient Name', bill.customerName);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Professional Bill ${escapeHtml(bill.billNumber)}</title>
    <style>
      @page { size: A4 portrait; margin: 12mm; }
      html, body { margin: 0; padding: 0; width: 100%; background: #fff; }
      * { color: #000 !important; background: transparent !important; box-shadow: none !important; }
      body {
        font-family: Verdana, Geneva, Tahoma, sans-serif;
        font-size: 11pt;
        line-height: 1.4;
        color: #000;
        padding: 0;
      }
      .invoice-wrap { width: 100%; max-width: 100%; margin: 0 auto; text-align: center; }
      .hospital-name { font-size: 16pt; font-weight: 700; margin: 0; line-height: 1.25; }
      .contact { font-size: 10pt; font-weight: 600; margin: 2px 0 0; line-height: 1.4; }
      .bill-title { font-size: 15pt; font-weight: 700; margin: 14px 0 10px; }
      .invoice-fields {
        margin: 0 auto 14px;
        border-collapse: collapse;
        text-align: left;
        width: 100%;
        max-width: 170mm;
      }
      .invoice-fields td {
        border: none;
        padding: 2.5px 0;
        font-size: 11pt;
        vertical-align: top;
        line-height: 1.4;
      }
      .invoice-fields .label { width: 42mm; min-width: 42mm; max-width: 42mm; padding-right: 6px; white-space: nowrap; }
      .invoice-fields .colon { width: 5mm; min-width: 5mm; max-width: 5mm; padding-right: 8px; text-align: center; }
      .invoice-fields .value { font-weight: 400; }
      .invoice-fields .strong { font-weight: 700; }
      .lines {
        width: 100%;
        max-width: 170mm;
        margin: 0 auto;
        border-collapse: collapse;
        text-align: left;
        font-size: 10.5pt;
      }
      .lines th, .lines td {
        border-bottom: 1px solid #000;
        padding: 5px 6px 5px 0;
        vertical-align: top;
      }
      .lines th { font-weight: 700; }
      .lines .num { width: 10mm; text-align: center; }
      .lines .amount { text-align: right; white-space: nowrap; padding-right: 0; }
      .totals {
        width: 100%;
        max-width: 170mm;
        margin: 12px auto 0;
        border-collapse: collapse;
        text-align: left;
      }
      .totals td {
        padding: 3px 0;
        font-size: 11pt;
      }
      .totals .label { width: auto; }
      .totals .amount { text-align: right; white-space: nowrap; font-weight: 700; }
      .totals tr.grand td { padding-top: 8px; font-size: 12pt; }
      .signature-wrap {
        width: 100%;
        max-width: 170mm;
        margin: 40px auto 0;
        display: flex;
        justify-content: flex-end;
      }
      .signature-box { width: 60mm; text-align: center; }
      .signature-line { border-top: 1px solid #000; margin-top: 30mm; padding-top: 4px; font-size: 10.5pt; }
    </style>
  </head>
  <body>
    <div class="invoice-wrap">
      <div class="bill-title">Professional Bill</div>
      <table class="invoice-fields">
        <colgroup>
          <col class="label" />
          <col class="colon" />
          <col class="value" />
        </colgroup>
        <tbody>
        ${headerRows}
        </tbody>
      </table>
      <table class="lines">
        <thead>
          <tr>
            <th class="num">#</th>
            <th>Doctor</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineRows || `<tr><td colspan="3">No line items</td></tr>`}
        </tbody>
      </table>
      <table class="totals">
        <tbody>
          <tr>
            <td class="label">Total Amount</td>
            <td class="amount">${escapeHtml(formatLkr(bill.totalAmount))}</td>
          </tr>
          <tr>
            <td class="label">Paid Amount</td>
            <td class="amount">${escapeHtml(formatLkr(bill.paidAmount))}</td>
          </tr>
          <tr class="grand">
            <td class="label"><strong>Outstanding</strong></td>
            <td class="amount">${escapeHtml(formatLkr(bill.outstandingAmount))}</td>
          </tr>
        </tbody>
      </table>
      <div class="signature-wrap">
        <div class="signature-box">
          <div class="signature-line">Patient/Guardian</div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

/** A4 final bill print after closing a patient bill. */
export function printFinalBill(
  bill: PatientBillDetail,
  letterhead?: FinalBillPrintLetterhead
) {
  printReceiptHtml(buildFinalBillPrintHtml(bill, letterhead), {
    width: '210mm',
    height: '297mm',
  });
}
