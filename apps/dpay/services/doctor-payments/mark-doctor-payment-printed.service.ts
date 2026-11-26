import prisma from '@/lib/prisma';

export type MarkDoctorPaymentPrintedResult =
  | { success: true; isDuplicate: boolean }
  | { success: false; message: string };

/**
 * Same rule as the patient receipt: the first print is the original.
 * A print count that is already 1 or more marks this copy as a duplicate, then the count increases.
 * Older payments with no printCount are treated as never printed.
 */
export async function markDoctorPaymentPrinted(
  paymentId: string
): Promise<MarkDoctorPaymentPrintedResult> {
  const id = paymentId.trim();
  if (!id) return { success: false, message: 'Doctor payment is required.' };

  try {
    const existing = await prisma.doctorPayment.findUnique({
      where: { id },
      select: { id: true, printCount: true, printedAt: true },
    });
    if (!existing) return { success: false, message: 'Doctor payment not found.' };

    const previousCount = Number(existing.printCount ?? 0);
    const isDuplicate = previousCount >= 1;

    await prisma.doctorPayment.update({
      where: { id },
      data: {
        printCount: previousCount + 1,
        ...(previousCount === 0 && !existing.printedAt ? { printedAt: new Date() } : {}),
      },
    });

    return { success: true, isDuplicate };
  } catch (error: unknown) {
    console.error('markDoctorPaymentPrinted failed', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to record the print.',
    };
  }
}
