import { format } from 'date-fns';
import jsPDF from 'jspdf';
import type { PatientBillReceipt } from '@/types/patient-bill';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { paymentMethodLabel } from '@/lib/receipts/helpers';

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildReceiptPrintHtml(receipt: PatientBillReceipt, bxtNumber: string) {
  const paymentDate = format(new Date(receipt.paymentDate), 'yyyy-MM-dd');
  const method = paymentMethodLabel(receipt.paymentMethod);
  const reference = receipt.referenceNumber?.trim() || '—';
  const remarks = receipt.remarks?.trim() || '—';

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
    <div class="row"><span class="label">Receipt Number</span><span class="value highlight">${escapeHtml(receipt.receiptNumber)}</span></div>
    <div class="row"><span class="label">BXT Number</span><span class="value">${escapeHtml(bxtNumber)}</span></div>
    <div class="row"><span class="label">Payment Date</span><span class="value">${paymentDate}</span></div>
    <div class="row"><span class="label">Amount Paid</span><span class="value highlight">${escapeHtml(formatLkr(receipt.amountPaid))}</span></div>
    <div class="row"><span class="label">Payment Method</span><span class="value">${escapeHtml(method)}</span></div>
    <div class="row"><span class="label">Reference Number</span><span class="value">${escapeHtml(reference)}</span></div>
    <div class="row"><span class="label">Remarks</span><span class="value">${escapeHtml(remarks)}</span></div>
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

function getReceiptDetailRows(receipt: PatientBillReceipt, bxtNumber: string) {
  const paymentDate = format(new Date(receipt.paymentDate), 'yyyy-MM-dd');
  const method = paymentMethodLabel(receipt.paymentMethod);
  const reference = receipt.referenceNumber?.trim() || '—';
  const remarks = receipt.remarks?.trim() || '—';

  return [
    ['Receipt Number', receipt.receiptNumber],
    ['BXT Number', bxtNumber],
    ['Payment Date', paymentDate],
    ['Amount Paid', formatLkr(receipt.amountPaid)],
    ['Payment Method', method],
    ['Reference Number', reference],
    ['Remarks', remarks],
  ] as const;
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

  getReceiptDetailRows(receipt, bxtNumber).forEach(([label, value]) => {
    doc.setTextColor(107, 114, 128);
    doc.text(label, margin, y);
    doc.setTextColor(label === 'Amount Paid' ? 4 : 17, label === 'Amount Paid' ? 120 : 24, label === 'Amount Paid' ? 87 : 39);
    doc.setFont('helvetica', label === 'Receipt Number' || label === 'Amount Paid' ? 'bold' : 'normal');
    doc.text(value, valueX, y, { align: 'right', maxWidth: pageWidth - margin * 2 - 70 });
    doc.setFont('helvetica', 'normal');
    y += 12;

    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y - 6, valueX, y - 6);
  });

  doc.save(`${receipt.receiptNumber}.pdf`);
}
