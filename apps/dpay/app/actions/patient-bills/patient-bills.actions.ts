'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/server-permissions';
import { fetchServerSession } from '@/lib/session';
import { getPatientBills } from '@/services/patient-bills/get-patient-bills.service';
import { getPatientBillById } from '@/services/patient-bills/get-patient-bill.service';
import { createPatientBill } from '@/services/patient-bills/create-patient-bill.service';
import { updatePatientBill } from '@/services/patient-bills/update-patient-bill.service';
import { recordPatientBillPayment } from '@/services/patient-bills/record-patient-bill-payment.service';
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
  const result = await createPatientBill(draft, session?.user?.id ?? null);

  if (result.success) {
    revalidatePath('/patient-bills');
  }

  return result;
}

export async function updatePatientBillAction(id: string, draft: PatientBillDraft) {
  await requirePermission('patient-bills', 'edit');
  const result = await updatePatientBill(id, draft);

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
  const result = await recordPatientBillPayment(input, session?.user?.id ?? null);

  if (result.success) {
    revalidatePath('/patient-bills');
    revalidatePath(`/patient-bills/${input.billId}`);
  }

  return result;
}
