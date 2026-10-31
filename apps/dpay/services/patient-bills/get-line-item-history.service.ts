import prisma from '@/lib/prisma';
import type { BillLineItemHistoryEntry } from '@/types/patient-bill';
import { mapLineItemHistoryRecord } from '@/lib/patient-bills/line-item-history';

export type GetLineItemHistoryResult =
  | { success: true; data: BillLineItemHistoryEntry[] }
  | { success: false; message: string };

export async function getPatientBillLineItemHistory(
  lineItemId: string
): Promise<GetLineItemHistoryResult> {
  if (!lineItemId?.trim()) {
    return { success: false, message: 'Line item id is required.' };
  }

  try {
    const records = await prisma.patientBillItemHistory.findMany({
      where: { lineItemId },
      orderBy: { changedAt: 'asc' },
    });

    return {
      success: true,
      data: records.map(mapLineItemHistoryRecord),
    };
  } catch (error: unknown) {
    console.error('getPatientBillLineItemHistory error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load line item history';
    return { success: false, message };
  }
}
