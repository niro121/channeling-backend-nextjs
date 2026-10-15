import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { RECEIPT_PAYMENT_METHOD } from '@archmage/shared';
import type { PatientBillReceipt } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import {
  parsePaymentMethodCode,
  paymentMethodLabel,
  paymentReferenceDisplay,
} from '@/lib/receipts/helpers';
import { formatIssuedLocation } from '@/lib/location';

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Fixed contact lines on the patient receipt letterhead. */
const RECEIPT_LETTERHEAD_PHONE = '091 7694059 / 60';
const RECEIPT_LETTERHEAD_EMAIL = 'info@ruhunuhospital.lk';
const RECEIPT_LETTERHEAD_WEB = 'www.ruhunuhospital.lk';

export type ReceiptPrintLetterhead = {
  /** Current Channeling location name, read at print time. */
  locationName?: string | null;
  /** Channeling location address (address line 1, line 2, city). */
  addressLine?: string | null;
  /** True when this receipt was already printed at least once. */
  isDuplicate?: boolean;
  /** payment = original slip, cancel / refund = the separate DPAY-REF slip. */
  slip?: 'payment' | 'cancel' | 'refund';
  /** Original payment number shown on a cancel or refund slip. */
  originalReceiptNumber?: string | null;
};

type ReceiptDetailRow = {
  label: string;
  value: string;
  highlight?: boolean;
};

/** Same fields as Payment Details dialog — shared by print HTML and PDF. */
function getReceiptDetailRows(
  receipt: PatientBillReceipt,
  bxtNumber: string
): ReceiptDetailRow[] {
  const status = receipt.status ?? 'active';
  const paymentDate = format(new Date(receipt.paymentDate), 'yyyy-MM-dd HH:mm:ss');
  const method = paymentMethodLabel(receipt.paymentMethod);
  const remarks = receipt.remarks?.trim() || '—';
  const createdBy = receipt.createdByName?.trim() || '—';
  const code = parsePaymentMethodCode(receipt.paymentMethod);
  const issuedLocation = formatIssuedLocation({
    locationName: receipt.locationName,
    locationCode: receipt.locationCode,
  });

  const statusLabel =
    status === 'cancelled' ? 'Cancelled' : status === 'refund' ? 'Refund' : 'Active';

  const rows: ReceiptDetailRow[] = [
    { label: 'Status', value: statusLabel },
    { label: 'Receipt Number', value: receipt.receiptNumber, highlight: true },
    { label: 'BHT Number', value: bxtNumber },
  ];

  if (issuedLocation !== '—') {
    rows.push({ label: 'Issued Location', value: issuedLocation });
  }

  rows.push(
    { label: 'Payment Date', value: paymentDate },
    { label: 'Amount Paid', value: formatLkr(receipt.amountPaid), highlight: true },
    { label: 'Payment Method', value: method },
  );

  if (receipt.bank?.trim()) {
    rows.push({ label: 'Bank', value: receipt.bank.trim() });
  }

  if (code === RECEIPT_PAYMENT_METHOD.CREDIT_CARD && receipt.cardReference?.trim()) {
    rows.push({ label: 'Card Reference', value: receipt.cardReference.trim() });
  } else if (code === RECEIPT_PAYMENT_METHOD.E_WALLET && receipt.cardReference?.trim()) {
    rows.push({ label: 'E-Wallet Reference', value: receipt.cardReference.trim() });
  } else if (
    (code === RECEIPT_PAYMENT_METHOD.SLIP || code === RECEIPT_PAYMENT_METHOD.CHECK) &&
    receipt.slipReference?.trim()
  ) {
    rows.push({
      label: code === RECEIPT_PAYMENT_METHOD.CHECK ? 'Cheque Number' : 'Slip Reference',
      value: receipt.slipReference.trim(),
    });
  }

  if (
    (code === RECEIPT_PAYMENT_METHOD.SLIP || code === RECEIPT_PAYMENT_METHOD.CHECK) &&
    receipt.slipDate
  ) {
    rows.push({
      label: code === RECEIPT_PAYMENT_METHOD.CHECK ? 'Cheque Date' : 'Slip Date',
      value: format(new Date(receipt.slipDate), 'yyyy-MM-dd'),
    });
  }

  if (
    !receipt.bank?.trim() &&
    !receipt.cardReference?.trim() &&
    !receipt.slipReference?.trim()
  ) {
    rows.push({
      label: 'Reference',
      value: paymentReferenceDisplay(receipt),
    });
  }

  rows.push(
    { label: 'Remarks', value: remarks },
    { label: 'Created By', value: createdBy }
  );

  if (receipt.cancelReceiptNumber?.trim()) {
    rows.push({
      label: 'Refund Receipt',
      value: receipt.cancelReceiptNumber.trim(),
      highlight: true,
    });
  }

  if (status === 'refund') {
    const refundReason = receipt.cancelReason?.trim();
    if (refundReason) {
      rows.push({ label: 'Refund Reason', value: refundReason });
    }
  }

  if (status === 'cancelled') {
    const cancelReason = receipt.cancelReason?.trim();
    if (cancelReason) {
      rows.push({ label: 'Cancel Reason', value: cancelReason });
    }
    if (receipt.canceledAt) {
      rows.push({
        label: 'Cancelled At',
        value: format(new Date(receipt.canceledAt), 'yyyy-MM-dd HH:mm:ss'),
      });
    }
    rows.push({
      label: 'Cancelled By',
      value: receipt.canceledByName?.trim() || '—',
    });
  }

  return rows;
}


function invoiceRow(label: string, value: string, strong = false): string {
  const valueClass = strong ? 'value strong' : 'value';
  const labelHtml = strong ? `<strong>${escapeHtml(label)}</strong>` : escapeHtml(label);
  return `<tr>
    <td class="label">${labelHtml}</td>
    <td class="colon">:</td>
    <td class="${valueClass}">${escapeHtml(value)}</td>
  </tr>`;
}

function paymentPrintRows(receipt: PatientBillReceipt, bxtNumber: string): ReceiptDetailRow[] {
  return getReceiptDetailRows(receipt, bxtNumber).filter((row) => row.label !== 'Status');
}

export function buildReceiptPrintHtml(
  receipt: PatientBillReceipt,
  bxtNumber: string,
  letterhead?: ReceiptPrintLetterhead
) {
  const status = receipt.status ?? 'active';
  let slip = letterhead?.slip ?? (status === 'refund' ? 'refund' : 'payment');
  if (status === 'refund' && slip === 'payment') slip = 'refund';
  const isCancelOrRefund = slip === 'cancel' || slip === 'refund';
  const rows = paymentPrintRows(receipt, bxtNumber);
  const rowsHtml = rows
    .map((row) => invoiceRow(row.label, row.value, Boolean(row.highlight)))
    .join('\n    ');

  const hospitalName =
    letterhead?.locationName?.trim() || receipt.locationName?.trim() || 'Ruhunu Hospital';
  const addressLine = letterhead?.addressLine?.trim() || 'Karapitiya, Galle';
  const addressHtml = `<div class="hospital-name">${escapeHtml(addressLine)}</div>`;

  const title =
    status === 'cancelled' || slip === 'cancel'
      ? 'Cancel Receipt'
      : slip === 'refund'
        ? 'Refund Receipt'
        : 'Payment Receipt';

  let banner = '';
  if (letterhead?.isDuplicate) {
    banner = isCancelOrRefund ? '**Duplicate Copy**' : '**Duplicate**';
  } else if (!isCancelOrRefund && status === 'cancelled') {
    banner = '**Canceled**';
  }
  const bannerHtml = banner ? `<div class="status-banner">${escapeHtml(banner)}</div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Receipt ${escapeHtml(receipt.receiptNumber)}</title>
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
    </style>
  </head>
  <body>
    <div class="invoice-wrap">
      <div class="hospital-name">${escapeHtml(hospitalName)}</div>
      ${addressHtml}
      <p class="contact">Phone : ${escapeHtml(RECEIPT_LETTERHEAD_PHONE)}</p>
      <p class="contact">Email : ${escapeHtml(RECEIPT_LETTERHEAD_EMAIL)} | Web : ${escapeHtml(RECEIPT_LETTERHEAD_WEB)}</p>
      <div class="bill-title">${escapeHtml(title)}</div>
      ${bannerHtml}
      <table class="invoice-fields"><tbody>
        ${rowsHtml}
      </tbody></table>
    </div>
  </body>
</html>`;
}

export function printReceiptHtml(
  html: string,
  options?: { width?: string; height?: string }
) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Print receipt');
  iframe.style.position = 'fixed';
  iframe.style.border = '0';
  if (options?.width) {
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = options.width;
    iframe.style.height = options.height ?? '210mm';
  } else {
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.visibility = 'hidden';
  }
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDoc = frameWindow?.document;
  if (!frameWindow || !frameDoc) {
    document.body.removeChild(iframe);
    return;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const runPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      window.setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1000);
    }
  };

  if (frameDoc.readyState === 'complete') {
    runPrint();
  } else {
    iframe.onload = runPrint;
    window.setTimeout(runPrint, 500);
  }
}

export function downloadReceiptPdf(receipt: PatientBillReceipt, bxtNumber: string) {
  const doc = new jsPDF({ orientation: 'p', format: 'a4' });
  const pageWidth =
    (typeof doc.internal.pageSize.getWidth === 'function'
      ? doc.internal.pageSize.getWidth()
      : doc.internal.pageSize.width) ?? 210;
  const margin = 20;
  const valueX = pageWidth - margin;

  doc.setFontSize(18);
  doc.setTextColor(4, 120, 87);
  doc.text('Payment Receipt', margin, 28);

  let y = 48;
  doc.setFontSize(11);

  getReceiptDetailRows(receipt, bxtNumber).forEach(({ label, value, highlight }) => {
    doc.setTextColor(107, 114, 128);
    doc.text(label, margin, y);
    doc.setTextColor(highlight ? 4 : 17, highlight ? 120 : 24, highlight ? 87 : 39);
    doc.setFont('helvetica', highlight ? 'bold' : 'normal');
    doc.text(value, valueX, y, { align: 'right', maxWidth: pageWidth - margin * 2 - 70 });
    doc.setFont('helvetica', 'normal');
    y += 12;

    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y - 6, valueX, y - 6);
  });

  doc.save(`${receipt.receiptNumber}.pdf`);
}
