import prisma from '@/lib/prisma';
import { resolveUserPrintCode } from '@/lib/location';

export type DoctorPaymentPrintSlip = {
  createdByCode: string;
  canceledByCode: string;
  printedByCode: string;
};

const EMPTY_SLIP: DoctorPaymentPrintSlip = {
  createdByCode: '',
  canceledByCode: '',
  printedByCode: '',
};

/**
 * Read-only. Staff codes for the doctor payment receipt lines.
 * Does not update the payment.
 */
export async function getDoctorPaymentPrintSlip(
  paymentId: string,
  printedByUserId?: string | null
): Promise<DoctorPaymentPrintSlip> {
  const id = paymentId.trim();
  if (!id) return EMPTY_SLIP;

  try {
    const payment = await prisma.doctorPayment.findUnique({
      where: { id },
      select: { createdBy: true, canceledBy: true },
    });
    if (!payment) return EMPTY_SLIP;

    const [createdByCode, canceledByCode, printedByCode] = await Promise.all([
      resolveUserPrintCode(payment.createdBy),
      resolveUserPrintCode(payment.canceledBy),
      resolveUserPrintCode(printedByUserId),
    ]);

    return { createdByCode, canceledByCode, printedByCode };
  } catch (error: unknown) {
    console.error('getDoctorPaymentPrintSlip failed', error);
    return EMPTY_SLIP;
  }
}
