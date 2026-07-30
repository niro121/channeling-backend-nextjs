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


export function buildReceiptPrintHtml(receipt: PatientBillReceipt, bxtNumber: string) {
  const rowsHtml = getReceiptDetailRows(receipt, bxtNumber)
    .map((row) => {
      const valueClass = row.highlight ? 'value highlight' : 'value';
      return `<div class="row"><span class="label">${escapeHtml(row.label)}</span><span class="${valueClass}">${escapeHtml(row.value)}</span></div>`;
    })
    .join('\n    ');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Receipt ${escapeHtml(receipt.receiptNumber)}</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 24px; color: #111; max-width: 480px; margin: 0 auto; }
      h1 { font-size: 18px; margin: 0 0 16px; }
      .row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
      .label { color: #6b7280; }
      .value { font-weight: 600; text-align: right; }
      .highlight { color: #047857; font-weight: 700; }
    </style>
  </head>
  <body>
    <h1>Payment Receipt</h1>
    ${rowsHtml}
  </body>
</html>`;
}

export function printReceiptHtml(html: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Print receipt');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
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
