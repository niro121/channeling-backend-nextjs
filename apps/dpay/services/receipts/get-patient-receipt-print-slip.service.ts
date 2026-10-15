import prisma from '@/lib/prisma';

export type PatientReceiptPrintKind = 'payment' | 'cancel' | 'refund';

export type PatientReceiptPrintSlip = {
  kind: PatientReceiptPrintKind;
  /** Original payment receipt number, when this slip refunds one. */
  originalReceiptNumber: string;
};

/**
 * Read-only. Decides which slip to print from the receipt and its bill.
 * Does not update the receipt.
 */
export async function getPatientReceiptPrintSlip(
  receiptId: string
): Promise<PatientReceiptPrintSlip> {
  const id = receiptId.trim();
  if (!id) return { kind: 'payment', originalReceiptNumber: '' };

  try {
    const receipt = await prisma.patientBillReceipt.findUnique({
      where: { id },
      select: {
        status: true,
        refundOfReceiptId: true,
        bill: { select: { status: true } },
      },
    });

    if (!receipt || receipt.status !== 'refund') {
      return { kind: 'payment', originalReceiptNumber: '' };
    }

    let originalReceiptNumber = '';
    if (receipt.refundOfReceiptId) {
      const original = await prisma.patientBillReceipt.findUnique({
        where: { id: receipt.refundOfReceiptId },
        select: { receiptNumber: true },
      });
      originalReceiptNumber = original?.receiptNumber?.trim() || '';
    }

    return {
      kind: receipt.bill.status === 'cancelled' ? 'cancel' : 'refund',
      originalReceiptNumber,
    };
  } catch (error: unknown) {
    console.error('getPatientReceiptPrintSlip failed', error);
    return { kind: 'payment', originalReceiptNumber: '' };
  }
}
