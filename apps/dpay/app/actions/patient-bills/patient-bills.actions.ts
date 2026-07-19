'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/server-permissions';
import { fetchServerSession } from '@/lib/session';
import { getPatientBills } from '@/services/patient-bills/get-patient-bills.service';
import { getPatientBillById } from '@/services/patient-bills/get-patient-bill.service';
import { createPatientBill } from '@/services/patient-bills/create-patient-bill.service';
import { updatePatientBill } from '@/services/patient-bills/update-patient-bill.service';
import { recordPatientBillPayment } from '@/services/patient-bills/record-patient-bill-payment.service';
import { cancelPatientBill } from '@/services/patient-bills/cancel-patient-bill.service';
import { closePatientBill } from '@/services/patient-bills/close-patient-bill.service';
import { getPatientBillLineItemHistory } from '@/services/patient-bills/get-line-item-history.service';
import type {
  GetPatientBillsParams,
  PatientBillDraft,
  RecordPatientBillPaymentInput,
} from '@/types/patient-bill';

export async function getPatientBillsAction(params: GetPatientBillsParams = {}) {
  await requirePermission('patient-bills', 'view');
  return getPatientBills(params);
}

export async function getPatientBillByIdAction(id: string) {
  await requirePermission('patient-bills', 'view');
  return getPatientBillById(id);
}

export async function createPatientBillAction(draft: PatientBillDraft) {
  await requirePermission('patient-bills', 'add');
  const session = await fetchServerSession();
  const result = await createPatientBill(
    draft,
    session?.user?.id ?? null,
    session?.user?.name ?? null
  );

  if (result.success) {
    revalidatePath('/patient-bills');
  }

  return result;
}

export async function updatePatientBillAction(id: string, draft: PatientBillDraft) {
  await requirePermission('patient-bills', 'edit');
  const session = await fetchServerSession();
  const result = await updatePatientBill(
    id,
    draft,
    session?.user?.id ?? null,
    session?.user?.name ?? null
  );

  if (result.success) {
    revalidatePath('/patient-bills');
    revalidatePath(`/patient-bills/${id}`);
    revalidatePath(`/patient-bills/${id}/edit`);
  }

  return result;
}

export async function recordPatientBillPaymentAction(input: RecordPatientBillPaymentInput) {
  await requirePermission('patient-bills', 'edit');
  const session = await fetchServerSession();
  const result = await recordPatientBillPayment(
    input,
    session?.user?.id ?? null,
    session?.user?.name ?? null
  );

  if (result.success) {
    revalidatePath('/patient-bills');
    revalidatePath(`/patient-bills/${input.billId}`);
    revalidatePath('/receipts');
  }

  return result;
}

export async function cancelPatientBillAction(billId: string, cancelReason: string) {
  await requirePermission('patient-bills', 'edit');
  const session = await fetchServerSession();
  if (!session?.user?.id) {
    return { success: false as const, message: 'You must be logged in to cancel a patient bill.' };
  }

  const result = await cancelPatientBill({
    billId,
    cancelReason,
    canceledBy: session.user.id,
    canceledByName: session.user.name ?? null,
  });

  if (result.success) {
    revalidatePath('/patient-bills');
    revalidatePath(`/patient-bills/${billId}`);
    revalidatePath('/receipts');
  }

  return result;
}

export async function closePatientBillAction(billId: string) {
  await requirePermission('patient-bills', 'edit');
  const session = await fetchServerSession();
  if (!session?.user?.id) {
    return { success: false as const, message: 'You must be logged in to close a patient bill.' };
  }

  const result = await closePatientBill(billId);

  if (result.success) {
    revalidatePath('/patient-bills');
    revalidatePath(`/patient-bills/${billId}`);
  }

  return result;
}

export async function getPatientBillLineItemHistoryAction(lineItemId: string) {
  await requirePermission('patient-bills', 'view');
  return getPatientBillLineItemHistory(lineItemId);
}
