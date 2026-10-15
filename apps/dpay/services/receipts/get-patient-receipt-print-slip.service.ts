import prisma from '@/lib/prisma';
import { resolveUserPrintCode } from '@/lib/location';

export type PatientReceiptPrintKind = 'payment' | 'cancel' | 'refund';

export type PatientReceiptPrintSlip = {
  kind: PatientReceiptPrintKind;
  /** Original payment receipt number, when this slip refunds one. */
  originalReceiptNumber: string;
  createdByCode: string;
  printedByCode: string;
  canceledByCode: string;
  createdAt: string;
  patientName: string;
};

const EMPTY_SLIP: PatientReceiptPrintSlip = {
  kind: 'payment',
  originalReceiptNumber: '',
  createdByCode: '',
  printedByCode: '',
  canceledByCode: '',
  createdAt: '',
  patientName: '',
};

/**
 * Read-only. Decides which slip to print and the staff codes for the print lines.
 * Does not update the receipt.
 */
export async function getPatientReceiptPrintSlip(
  receiptId: string,
  printedByUserId?: string | null
): Promise<PatientReceiptPrintSlip> {
  const id = receiptId.trim();
  if (!id) return EMPTY_SLIP;

  try {
    const receipt = await prisma.patientBillReceipt.findUnique({
      where: { id },
      select: {
        status: true,
        refundOfReceiptId: true,
        createdAt: true,
        createdBy: true,
        canceledBy: true,
        bill: { select: { status: true, customerName: true } },
      },
    });

    if (!receipt) return EMPTY_SLIP;

    const [createdByCode, printedByCode, canceledByCode] = await Promise.all([
      resolveUserPrintCode(receipt.createdBy),
      resolveUserPrintCode(printedByUserId),
      resolveUserPrintCode(receipt.canceledBy),
    ]);

    const base = {
      createdByCode,
      printedByCode,
      canceledByCode,
      createdAt: receipt.createdAt.toISOString(),
      patientName: receipt.bill.customerName?.trim() || '',
    };

    if (receipt.status !== 'refund') {
      return { ...base, kind: 'payment', originalReceiptNumber: '' };
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
      ...base,
      kind: receipt.bill.status === 'cancelled' ? 'cancel' : 'refund',
      originalReceiptNumber,
    };
  } catch (error: unknown) {
    console.error('getPatientReceiptPrintSlip failed', error);
    return EMPTY_SLIP;
  }
}
