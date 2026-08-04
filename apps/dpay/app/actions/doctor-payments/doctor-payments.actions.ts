'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/server-permissions';
import { fetchServerSession } from '@/lib/session';
import { getDoctorsForPayment } from '@/services/doctor-payments/get-doctors-for-payment.service';
import { getEligibleBillsForDoctor } from '@/services/doctor-payments/get-eligible-bills.service';
import { processDoctorPayment } from '@/services/doctor-payments/process-doctor-payment.service';
import { getDoctorPayments } from '@/services/doctor-payments/get-doctor-payments.service';
import { getDoctorPaymentById } from '@/services/doctor-payments/get-doctor-payment.service';
import { cancelDoctorPayment } from '@/services/doctor-payments/cancel-doctor-payment.service';
import type {
  GetDoctorPaymentsParams,
  ProcessDoctorPaymentInput,
} from '@/types/doctor-payment';
import type { PatientBillPaymentMethod } from '@/types/patient-bill';

export async function getDoctorPaymentsAction(params: GetDoctorPaymentsParams = {}) {
  await requirePermission('doctor-payments', 'view');
  return getDoctorPayments(params);
}

export async function getDoctorPaymentByIdAction(id: string) {
  await requirePermission('doctor-payments', 'view');
  return getDoctorPaymentById(id);
}

export async function getDoctorsForPaymentAction() {
  await requirePermission('doctor-payments', 'add');
  return getDoctorsForPayment();
}

export async function getEligibleBillsForDoctorAction(doctorName: string) {
  await requirePermission('doctor-payments', 'add');
  return getEligibleBillsForDoctor(doctorName);
}

export async function processDoctorPaymentAction(input: ProcessDoctorPaymentInput) {
  await requirePermission('doctor-payments', 'add');
  const session = await fetchServerSession();
  const result = await processDoctorPayment(
    input,
    session?.user?.id ?? null,
    session?.user?.name ?? null
  );

  if (result.success) {
    revalidatePath('/doctor-payments');
  }

  return result;
}

export async function cancelDoctorPaymentAction(input: {
  paymentId: string;
  cancelReason: string;
  refundPaymentMethod: PatientBillPaymentMethod;
  bank?: string;
  bankId?: string;
  cardReference?: string;
  slipReference?: string;
  slipDate?: string;
}) {
  await requirePermission('doctor-payments', 'add');
  const session = await fetchServerSession();
  if (!session?.user?.id) {
    return { success: false as const, message: 'You must be logged in to cancel a doctor payment.' };
  }

  const result = await cancelDoctorPayment({
    paymentId: input.paymentId,
    cancelReason: input.cancelReason,
    refundPaymentMethod: input.refundPaymentMethod,
    bank: input.bank,
    bankId: input.bankId,
    cardReference: input.cardReference,
    slipReference: input.slipReference,
    slipDate: input.slipDate,
    canceledBy: session.user.id,
    canceledByName: session.user.name ?? null,
  });

  if (result.success) {
    revalidatePath('/doctor-payments');
  }

  return result;
}
