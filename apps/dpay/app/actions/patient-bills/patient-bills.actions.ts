'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/server-permissions';
import { fetchServerSession } from '@/lib/session';
import { getPatientBills } from '@/services/patient-bills/get-patient-bills.service';
import { getPatientBillById } from '@/services/patient-bills/get-patient-bill.service';
import { createPatientBill } from '@/services/patient-bills/create-patient-bill.service';
import { updatePatientBill } from '@/services/patient-bills/update-patient-bill.service';
import { updatePatientBillDetails } from '@/services/patient-bills/update-patient-bill-details.service';
import { addPatientBillLineItem } from '@/services/patient-bills/add-patient-bill-line-item.service';
import { removePatientBillLineItem } from '@/services/patient-bills/remove-patient-bill-line-item.service';
import { recordPatientBillPayment } from '@/services/patient-bills/record-patient-bill-payment.service';
import { cancelPatientBill } from '@/services/patient-bills/cancel-patient-bill.service';
import { closePatientBill } from '@/services/patient-bills/close-patient-bill.service';
import { getPatientBillLineItemHistory } from '@/services/patient-bills/get-line-item-history.service';
import { getBillActivityLogs } from '@/services/patient-bills/get-bill-activity-logs.service';
import { logActivityNonBlocking } from '@/lib/activity-log';
import type {
  AddPatientBillLineItemInput,
  GetPatientBillsParams,
  PatientBillDraft,
  PatientBillPaymentMethod,
  RecordPatientBillPaymentInput,
} from '@/types/patient-bill';

export async function getPatientBillsAction(params: GetPatientBillsParams = {}) {
  await requirePermission('patient-bills', 'view');

  const session = await fetchServerSession();
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'patient-bills.patient-bills.visited',
      entityType: 'PatientBill',
      entityId: null,
      importance: 'low',
      metadata: params?.keyword
        ? { keyword: params.keyword, status: params.status }
        : { status: params.status },
    });
  }

  return getPatientBills(params);
}

export async function getPatientBillByIdAction(id: string) {
  await requirePermission('patient-bills', 'view');

  const session = await fetchServerSession();
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'patient-bills.patient-bill.visited',
      entityType: 'PatientBill',
      entityId: id,
      importance: 'low',
    });
  }

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

    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'patient-bills.patient-bill.created',
        entityType: 'PatientBill',
        entityId: result.id,
        metadata: { bxtNumber: result.bxtNumber, billNumber: result.billNumber },
        importance: 'high',
      });
    }
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

    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'patient-bills.patient-bill.updated',
        entityType: 'PatientBill',
        entityId: result.id,
        importance: 'high',
      });
    }
  }

  return result;
}

export async function updatePatientBillDetailsAction(
  id: string,
  details: Pick<
    PatientBillDraft,
    'admissionDate' | 'dischargeDate' | 'customerName' | 'customerNicPhone' | 'customerAddress'
  >
) {
  await requirePermission('patient-bills', 'edit');
  const session = await fetchServerSession();
  const result = await updatePatientBillDetails(
    id,
    details,
    session?.user?.id ?? null,
    session?.user?.name ?? null
  );

  if (result.success) {
    revalidatePath('/patient-bills');
    revalidatePath(`/patient-bills/${id}`);
    revalidatePath(`/patient-bills/${id}/edit`);

    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'patient-bills.patient-bill.updated.details',
        entityType: 'PatientBill',
        entityId: result.id,
        importance: 'high',
      });
    }
  }

  return result;
}

export async function addPatientBillLineItemAction(input: AddPatientBillLineItemInput) {
  await requirePermission('patient-bills', 'edit');
  const session = await fetchServerSession();
  const result = await addPatientBillLineItem(
    input,
    session?.user?.id ?? null,
    session?.user?.name ?? null
  );

  if (result.success) {
    revalidatePath('/patient-bills');
    revalidatePath(`/patient-bills/${input.billId}`);

    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'patient-bills.patient-bill.line-item.created',
        entityType: 'PatientBillItem',
        entityId: result.lineItemId,
        importance: 'high',
        metadata: {
          billId: input.billId,
          doctorName: input.doctorName,
          amount: input.amount,
        },
      });
    }
  }

  return result;
}

export async function removePatientBillLineItemAction(billId: string, lineItemId: string) {
  await requirePermission('patient-bills', 'edit');
  const session = await fetchServerSession();
  const result = await removePatientBillLineItem(
    billId,
    lineItemId,
    session?.user?.id ?? null,
    session?.user?.name ?? null
  );

  if (result.success) {
    revalidatePath('/patient-bills');
    revalidatePath(`/patient-bills/${billId}`);

    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'patient-bills.patient-bill.line-item.deleted',
        entityType: 'PatientBillItem',
        entityId: lineItemId,
        importance: 'high',
        metadata: { billId },
      });
    }
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

    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'patient-bills.patient-bill.payment.recorded',
        entityType: 'PatientBillReceipt',
        entityId: result.receiptId,
        importance: 'high',
        metadata: {
          billId: input.billId,
          receiptNumber: result.receiptNumber,
          amountReceived: input.amountReceived,
          paymentMethod: input.paymentMethod,
          bank: input.bank?.trim() || undefined,
          cardReference: input.cardReference?.trim() || undefined,
          slipReference: input.slipReference?.trim() || undefined,
          slipDate: input.slipDate?.trim() || undefined,
        },
      });
    }
  }

  return result;
}

export async function cancelPatientBillAction(
  billId: string,
  cancelReason: string,
  refund?: {
    refundPaymentMethod: PatientBillPaymentMethod;
    bank?: string;
    bankId?: string;
    cardReference?: string;
    slipReference?: string;
    slipDate?: string;
  }
) {
  await requirePermission('patient-bills', 'edit');
  const session = await fetchServerSession();
  if (!session?.user?.id) {
    return { success: false as const, message: 'You must be logged in to cancel a patient bill.' };
  }

  const result = await cancelPatientBill({
    billId,
    cancelReason,
    refundPaymentMethod: refund?.refundPaymentMethod,
    bank: refund?.bank,
    bankId: refund?.bankId,
    cardReference: refund?.cardReference,
    slipReference: refund?.slipReference,
    slipDate: refund?.slipDate,
    canceledBy: session.user.id,
    canceledByName: session.user.name ?? null,
  });

  if (result.success) {
    revalidatePath('/patient-bills');
    revalidatePath(`/patient-bills/${billId}`);
    revalidatePath('/receipts');

    logActivityNonBlocking({
      userId: session.user.id,
      action: 'patient-bills.patient-bill.cancelled',
      entityType: 'PatientBill',
      entityId: billId,
      importance: 'high',
      metadata: { cancelReason },
    });
  }

  return result;
}

export async function closePatientBillAction(billId: string) {
  await requirePermission('patient-bills', 'edit');
  const session = await fetchServerSession();
  if (!session?.user?.id) {
    return { success: false as const, message: 'You must be logged in to close a patient bill.' };
  }

  const result = await closePatientBill(
    billId,
    session.user.id,
    session.user.name ?? null
  );

  if (result.success) {
    revalidatePath('/patient-bills');
    revalidatePath(`/patient-bills/${billId}`);

    logActivityNonBlocking({
      userId: session.user.id,
      action: 'patient-bills.patient-bill.closed',
      entityType: 'PatientBill',
      entityId: billId,
      importance: 'high',
    });
  }

  return result;
}

export async function getPatientBillLineItemHistoryAction(lineItemId: string) {
  await requirePermission('patient-bills', 'view');
  return getPatientBillLineItemHistory(lineItemId);
}

export async function getPatientBillActivityLogsAction(
  billId: string,
  relatedEntityIds: string[] = []
) {
  await requirePermission('patient-bills', 'view');
  return getBillActivityLogs(billId, relatedEntityIds);
}
