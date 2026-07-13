'use server';

import prisma from '@/lib/prisma';

/**
 * Earliest session date with unpaid doctor payment for this doctor.
 * Used to default Make Doctor Payment "From date".
 */
export type GetEarliestPendingPaymentDateResult =
  | { success: true; dateFrom: string | null }
  | { success: false; errorCode: string; message: string };

function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getEarliestPendingPaymentDateService(params: {
  doctorId: string;
}): Promise<GetEarliestPendingPaymentDateResult> {
  const doctorId = params.doctorId?.trim();
  if (!doctorId) {
    return { success: false, errorCode: 'VALIDATION', message: 'Doctor is required.' };
  }

  try {
    const session = await prisma.session.findFirst({
      where: {
        doctorId,
        bookings: {
          some: {
            status: 1,
            doctorPayment: false,
          },
        },
      },
      orderBy: { date: 'asc' },
      select: { date: true },
    });

    if (!session?.date) {
      return { success: true, dateFrom: null };
    }

    const d = session.date instanceof Date ? session.date : new Date(session.date);
    if (Number.isNaN(d.getTime())) {
      return { success: true, dateFrom: null };
    }

    return { success: true, dateFrom: toISODateLocal(d) };
  } catch (error: unknown) {
    console.error('getEarliestPendingPaymentDateService error:', error);
    return {
      success: false,
      errorCode: 'SERVER',
      message: error instanceof Error ? error.message : 'Failed to load earliest pending payment date.',
    };
  }
}
