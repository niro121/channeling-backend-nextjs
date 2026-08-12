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

  if (detail.bills.length > 0) {
    rows.push({
      label: 'Included Bills',
      value: detail.bills
        .map(
          (bill) =>
            `${bill.billNumber} · ${bill.patientName} · ${formatLkr(bill.payableAmount)}`
        )
        .join(' | '),
    });
  }

  return rows;
}

export function buildDoctorPaymentPrintHtml(detail: DoctorPaymentDetail) {
  const title =
    detail.status === 'refund'
      ? 'Doctor Payment Refund'
      : detail.status === 'cancelled'
        ? 'Doctor Payment (Cancelled)'
        : 'Doctor Payment Receipt';

  const rowsHtml = getDoctorPaymentDetailRows(detail)
    .map((row) => {
      const valueClass = row.highlight ? 'value highlight' : 'value';
      return `<div class="row"><span class="label">${escapeHtml(row.label)}</span><span class="${valueClass}">${escapeHtml(row.value)}</span></div>`;
    })
    .join('\n    ');

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)} ${escapeHtml(detail.receiptNumber)}</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 24px; color: #111; max-width: 480px; margin: 0 auto; }
      h1 { font-size: 18px; margin: 0 0 16px; }
      .row { display: flex; justify-content: space-between; gap: 16px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
      .label { color: #6b7280; flex-shrink: 0; }
      .value { font-weight: 600; text-align: right; word-break: break-word; }
      .highlight { color: #047857; font-weight: 700; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(title)}</h1>
    ${rowsHtml}
  </body>
</html>`;
}

/** Same iframe print path as patient bill receipts. */
export function printDoctorPayment(detail: DoctorPaymentDetail) {
  printReceiptHtml(buildDoctorPaymentPrintHtml(detail));
}
