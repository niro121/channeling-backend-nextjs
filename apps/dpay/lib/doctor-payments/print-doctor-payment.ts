import { format } from 'date-fns';
import { RECEIPT_PAYMENT_METHOD } from '@archmage/shared';
import type { DoctorPaymentDetail } from '@/types/doctor-payment';
import { formatLkr } from '@/lib/patient-bills/calculations';
import {
  parsePaymentMethodCode,
  paymentMethodLabel,
  paymentReferenceDisplay,
} from '@/lib/receipts/helpers';
import { formatIssuedLocation } from '@/lib/location';
import { printReceiptHtml } from '@/lib/receipts/print-receipt';

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

type DetailRow = {
  label: string;
  value: string;
  highlight?: boolean;
};

/** Same fields as Doctor Payment Details dialog — used for print HTML. */
function getDoctorPaymentDetailRows(detail: DoctorPaymentDetail): DetailRow[] {
  const statusLabel =
    detail.status === 'cancelled'
      ? 'Cancelled'
      : detail.status === 'refund'
        ? 'Refund'
        : 'Paid';
  const method = paymentMethodLabel(detail.paymentMethod);
  const code = parsePaymentMethodCode(detail.paymentMethod);
  const issuedLocation = formatIssuedLocation({
    locationName: detail.locationName,
    locationCode: detail.locationCode,
  });

  const rows: DetailRow[] = [
    { label: 'Status', value: statusLabel },
    { label: 'Receipt Number', value: detail.receiptNumber, highlight: true },
    { label: 'Doctor', value: detail.doctorName },
  ];

  if (issuedLocation !== '—') {
    rows.push({ label: 'Issued Location', value: issuedLocation });
  }

  rows.push(
    { label: 'Payment Method', value: method },
    { label: 'Total Amount', value: formatLkr(detail.totalAmount) },
    { label: 'Net Amount', value: formatLkr(detail.netAmount), highlight: true }
  );

  if (detail.bank?.trim()) {
    rows.push({ label: 'Bank', value: detail.bank.trim() });
  }

  if (code === RECEIPT_PAYMENT_METHOD.CREDIT_CARD && detail.cardReference?.trim()) {
    rows.push({ label: 'Card Reference', value: detail.cardReference.trim() });
  } else if (code === RECEIPT_PAYMENT_METHOD.E_WALLET && detail.cardReference?.trim()) {
    rows.push({ label: 'E-Wallet Reference', value: detail.cardReference.trim() });
  } else if (
    (code === RECEIPT_PAYMENT_METHOD.SLIP || code === RECEIPT_PAYMENT_METHOD.CHECK) &&
    detail.slipReference?.trim()
  ) {
    rows.push({
      label: code === RECEIPT_PAYMENT_METHOD.CHECK ? 'Cheque Number' : 'Slip Reference',
      value: detail.slipReference.trim(),
    });
  }

  if (
    (code === RECEIPT_PAYMENT_METHOD.SLIP || code === RECEIPT_PAYMENT_METHOD.CHECK) &&
    detail.slipDate
  ) {
    rows.push({
      label: code === RECEIPT_PAYMENT_METHOD.CHECK ? 'Cheque Date' : 'Slip Date',
      value: format(new Date(detail.slipDate), 'yyyy-MM-dd'),
    });
  }

  if (
    !detail.bank?.trim() &&
    !detail.cardReference?.trim() &&
    !detail.slipReference?.trim()
  ) {
    rows.push({
      label: 'Reference',
      value: paymentReferenceDisplay({
        paymentMethod: detail.paymentMethod,
        referenceNumber: detail.referenceNumber ?? null,
        bank: detail.bank ?? null,
        cardReference: detail.cardReference ?? null,
        slipReference: detail.slipReference ?? null,
        slipDate: detail.slipDate ?? null,
      }),
    });
  }

  rows.push(
    { label: 'Remarks', value: detail.remarks?.trim() || '—' },
    { label: 'Created By', value: detail.createdBy },
    {
      label: 'Created',
      value: format(new Date(detail.createdAt), 'yyyy-MM-dd HH:mm'),
    }
  );

  if (detail.cancelReceiptNumber?.trim()) {
    rows.push({
      label: 'Refund Receipt',
      value: detail.cancelReceiptNumber.trim(),
      highlight: true,
    });
  }

  if (detail.status === 'refund') {
    const refundFor =
      detail.remarks?.match(/Refund for ([^:]+):/)?.[1]?.trim() || 'Original payment';
    rows.push({ label: 'Refund For', value: refundFor });
    if (detail.cancelReason?.trim()) {
      rows.push({ label: 'Refund Reason', value: detail.cancelReason.trim() });
    }
  }

  if (detail.status === 'cancelled') {
    if (detail.cancelReason?.trim()) {
      rows.push({ label: 'Cancel Reason', value: detail.cancelReason.trim() });
    }
    if (detail.canceledAt) {
      rows.push({
        label: 'Cancelled At',
        value: format(new Date(detail.canceledAt), 'yyyy-MM-dd HH:mm'),
      });
    }
  }

  return rows;
}

export type DoctorPaymentPrintLetterhead = {
  locationName?: string | null;
  addressLine?: string | null;
  isDuplicate?: boolean;
};

const LETTERHEAD_PHONE = '091 7694059 / 60';
const LETTERHEAD_EMAIL = 'info@ruhunuhospital.lk';
const LETTERHEAD_WEB = 'www.ruhunuhospital.lk';

function invoiceRow(label: string, value: string, strong = false): string {
  const valueClass = strong ? 'value strong' : 'value';
  const labelHtml = strong ? `<strong>${escapeHtml(label)}</strong>` : escapeHtml(label);
  return `<tr>
    <td class="label">${labelHtml}</td>
    <td class="colon">:</td>
    <td class="${valueClass}">${escapeHtml(value)}</td>
  </tr>`;
}

export function buildDoctorPaymentPrintHtml(
  detail: DoctorPaymentDetail,
  letterhead?: DoctorPaymentPrintLetterhead
) {
  const status = detail.status ?? 'paid';
  const rowsHtml = getDoctorPaymentDetailRows(detail)
    .filter((row) => row.label !== 'Status')
    .map((row) => invoiceRow(row.label, row.value, Boolean(row.highlight)))
    .join('\n    ');

  const hospitalName =
    letterhead?.locationName?.trim() || detail.locationName?.trim() || 'Ruhunu Hospital';
  const addressLine = letterhead?.addressLine?.trim() || 'Karapitiya, Galle';

  const title =
    status === 'cancelled'
      ? 'Cancel Receipt'
      : status === 'refund'
        ? 'Refund Receipt'
        : 'Doctor Payment Receipt';

  let banner = '';
  if (letterhead?.isDuplicate) {
    banner = status === 'refund' ? '**Duplicate Copy**' : '**Duplicate**';
  } else if (status === 'cancelled') {
    banner = '**Canceled**';
  }
  const bannerHtml = banner ? `<div class="status-banner">${escapeHtml(banner)}</div>` : '';

  const billRows = detail.bills
    .map(
      (bill) => `<tr>
        <td>${escapeHtml(bill.billNumber)}</td>
        <td>${escapeHtml(bill.patientName)}</td>
        <td class="amount">${escapeHtml(formatLkr(bill.payableAmount))}</td>
      </tr>`
    )
    .join('');
  const billsHtml =
    detail.bills.length > 0
      ? `<table class="bills">
          <thead>
            <tr>
              <th>Bill No</th>
              <th>Patient</th>
              <th class="amount">Amount</th>
            </tr>
          </thead>
          <tbody>${billRows}</tbody>
        </table>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)} ${escapeHtml(detail.receiptNumber)}</title>
    <style>
      @page { size: A5 portrait; margin: 7mm 8mm; }
      html, body { margin: 0; padding: 0; width: 100%; background: #fff; }
      * { color: #000 !important; background: transparent !important; box-shadow: none !important; }
      body {
        font-family: Verdana, Geneva, Tahoma, sans-serif;
        font-size: 13pt;
        line-height: 1.4;
        color: #000;
        padding: 0;
      }
      .invoice-wrap { width: 100%; max-width: 100%; margin: 0 auto; text-align: center; }
      .hospital-name { font-size: 16pt; font-weight: 700; margin: 0; line-height: 1.25; }
      .contact { font-size: 10.5pt; font-weight: 600; margin: 2px 0 0; line-height: 1.4; }
      .bill-title { font-size: 15pt; font-weight: 700; margin: 10px 0 5px; }
      .status-banner { font-size: 13pt; font-weight: 700; margin: 3px 0 8px; }
      .invoice-fields {
        margin: 0 auto;
        border-collapse: collapse;
        text-align: left;
        width: auto;
        max-width: 100%;
      }
      .invoice-fields td {
        border: none;
        padding: 2.5px 0;
        font-size: 12.5pt;
        vertical-align: top;
        line-height: 1.4;
      }
      .invoice-fields .label { width: 48mm; min-width: 44mm; padding-right: 6px; white-space: nowrap; }
      .invoice-fields .colon { width: 5mm; padding-right: 8px; text-align: center; }
      .invoice-fields .value { font-weight: 400; }
      .invoice-fields .strong { font-weight: 700; }
      .bills {
        width: 100%;
        border-collapse: collapse;
        margin: 10px 0 0;
        text-align: left;
        font-size: 11pt;
      }
      .bills th, .bills td {
        border-bottom: 1px solid #000;
        padding: 3px 6px 3px 0;
        vertical-align: top;
      }
      .bills th { font-weight: 700; }
      .bills .amount { text-align: right; white-space: nowrap; padding-right: 0; }
    </style>
  </head>
  <body>
    <div class="invoice-wrap">
      <div class="hospital-name">${escapeHtml(hospitalName)}</div>
      <div class="hospital-name">${escapeHtml(addressLine)}</div>
      <p class="contact">Phone : ${escapeHtml(LETTERHEAD_PHONE)}</p>
      <p class="contact">Email : ${escapeHtml(LETTERHEAD_EMAIL)} | Web : ${escapeHtml(LETTERHEAD_WEB)}</p>
      <div class="bill-title">${escapeHtml(title)}</div>
      ${bannerHtml}
      <table class="invoice-fields"><tbody>
        ${rowsHtml}
      </tbody></table>
      ${billsHtml}
    </div>
  </body>
</html>`;
}

/** A5 print, same iframe size as the patient receipt. */
export function printDoctorPayment(
  detail: DoctorPaymentDetail,
  letterhead?: DoctorPaymentPrintLetterhead
) {
  printReceiptHtml(buildDoctorPaymentPrintHtml(detail, letterhead), {
    width: '148mm',
    height: '210mm',
  });
}
