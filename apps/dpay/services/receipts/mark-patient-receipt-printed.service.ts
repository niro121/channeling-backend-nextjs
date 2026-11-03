import prisma from '@/lib/prisma';

export type MarkPatientReceiptPrintedResult =
  | { success: true; isDuplicate: boolean }
  | { success: false; message: string };

/**
 * Same rule as the channeling booking receipt: the first print is the original.
 * A print count that is already 1 or more marks this copy as a duplicate, then the count increases.
 * Older receipts with no printCount are treated as never printed.
 */
export async function markPatientReceiptPrinted(
  receiptId: string
): Promise<MarkPatientReceiptPrintedResult> {
  const id = receiptId.trim();
  if (!id) return { success: false, message: 'Receipt is required.' };

  try {
    const existing = await prisma.patientBillReceipt.findUnique({
      where: { id },
      select: { id: true, printCount: true, printedAt: true },
    });
    if (!existing) return { success: false, message: 'Receipt not found.' };

    const previousCount = Number(existing.printCount ?? 0);
    const isDuplicate = previousCount >= 1;

    await prisma.patientBillReceipt.update({
      where: { id },
      data: {
        printCount: previousCount + 1,
        ...(previousCount === 0 && !existing.printedAt ? { printedAt: new Date() } : {}),
      },
    });

    return { success: true, isDuplicate };
  } catch (error: unknown) {
    console.error('markPatientReceiptPrinted failed', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to record the print.',
    };
  }
}
