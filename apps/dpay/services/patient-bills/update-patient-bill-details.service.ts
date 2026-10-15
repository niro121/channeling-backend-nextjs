import prisma from '@/lib/prisma';
import type { PatientBillDraft } from '@/types/patient-bill';

export type UpdatePatientBillDetailsResult =
  | { success: true; id: string }
  | { success: false; message: string };

export async function updatePatientBillDetails(
  id: string,
  details: Pick<
    PatientBillDraft,
    'admissionDate' | 'dischargeDate' | 'customerName' | 'customerNicPhone' | 'customerAddress'
  >,
  updatedBy?: string | null,
  updatedByName?: string | null
): Promise<UpdatePatientBillDetailsResult> {
  if (!id?.trim()) {
    return { success: false, message: 'Invalid bill ID' };
  }

  if (!details.admissionDate) {
    return { success: false, message: 'Admission date is required' };
  }

  if (!details.customerName.trim()) {
    return { success: false, message: 'Customer name is required' };
  }

  try {
    const existing = await prisma.patientBill.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return { success: false, message: 'Patient bill not found' };
    }

    if (existing.status === 'cancelled') {
      return { success: false, message: 'Cannot edit a cancelled patient bill.' };
    }

    if (existing.status === 'closed') {
      return { success: false, message: 'Cannot edit a closed patient bill.' };
    }

    await prisma.patientBill.update({
      where: { id },
      data: {
        admissionDate: new Date(details.admissionDate),
        dischargeDate: details.dischargeDate ? new Date(details.dischargeDate) : null,
        customerName: details.customerName.trim(),
        customerNicPhone: details.customerNicPhone.trim() || null,
        customerAddress: details.customerAddress.trim() || null,
        updatedBy: updatedBy ?? undefined,
        updatedByName: updatedByName ?? undefined,
      },
    });

    return { success: true, id };
  } catch (error: unknown) {
    console.error('updatePatientBillDetails error', error);
    const message =
      error instanceof Error ? error.message : 'Failed to update patient bill';
    return { success: false, message };
  }
}
