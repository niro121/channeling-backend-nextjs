import prisma from '@/lib/prisma';

export type DpayShiftLine = {
  shiftId: string;
  kind: 'patient_receipt' | 'patient_refund' | 'doctor_payment' | 'doctor_payment_cancel';
  receiptNumber: string;
  at: string;
  paymentMethod: number;
  amount: number;
  patientName: string | null;
  doctorName: string | null;
  billNumber: string | null;
};

function methodCode(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getDpayShiftLines(shiftIds: string[]): Promise<DpayShiftLine[]> {
  const ids = [...new Set(shiftIds.map((id) => id.trim()).filter(Boolean))];
  if (!ids.length) return [];

  const [receipts, payments] = await Promise.all([
    prisma.patientBillReceipt.findMany({
      where: { shiftId: { in: ids } },
      select: {
        shiftId: true,
        receiptNumber: true,
        amountPaid: true,
        paymentMethod: true,
        paymentDate: true,
        status: true,
        bill: { select: { customerName: true, billNumber: true } },
      },
    }),
    prisma.doctorPayment.findMany({
      where: { shiftId: { in: ids } },
      select: {
        shiftId: true,
        receiptNumber: true,
        netAmount: true,
        paymentMethod: true,
        createdAt: true,
        status: true,
        doctorName: true,
      },
    }),
  ]);

  const lines: DpayShiftLine[] = [];
  for (const receipt of receipts) {
    if (!receipt.shiftId) continue;
    if (receipt.status === 'cancelled') continue;
    const refund = receipt.status === 'refund';
    lines.push({
      shiftId: receipt.shiftId,
      kind: refund ? 'patient_refund' : 'patient_receipt',
      receiptNumber: receipt.receiptNumber,
      at: receipt.paymentDate.toISOString(),
      paymentMethod: methodCode(receipt.paymentMethod),
      amount: Math.abs(receipt.amountPaid),
      patientName: receipt.bill.customerName,
      doctorName: null,
      billNumber: receipt.bill.billNumber,
    });
  }
  for (const payment of payments) {
    if (!payment.shiftId || payment.status === 'cancelled') continue;
    lines.push({
      shiftId: payment.shiftId,
      kind: payment.status === 'refund' ? 'doctor_payment_cancel' : 'doctor_payment',
      receiptNumber: payment.receiptNumber,
      at: payment.createdAt.toISOString(),
      paymentMethod: methodCode(payment.paymentMethod),
      amount: Math.abs(payment.netAmount),
      patientName: null,
      doctorName: payment.doctorName,
      billNumber: null,
    });
  }
  return lines.sort((a, b) => a.at.localeCompare(b.at));
}
