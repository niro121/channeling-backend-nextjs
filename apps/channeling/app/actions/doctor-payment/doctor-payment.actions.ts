"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requirePermission } from "@/lib/server-permissions";
import { getEligibleBookingsService } from "@/services/doctor-payment/get-eligible-bookings.service";
import { getDoctorPaymentBookingDetailsService } from "@/services/doctor-payment/get-doctor-payment-booking-details.service";
import {
  processDoctorPaymentService,
  type ProcessDoctorPaymentInput,
} from "@/services/doctor-payment/process-doctor-payment.service";
import {
  getDoctorPaymentListService,
  type GetDoctorPaymentListParams,
} from "@/services/doctor-payment/get-doctor-payment-list.service";
import {
  getDoctorPaymentReceiptDetail,
  getDoctorCancelReceiptDetail,
} from "@/services/doctor-payment/get-doctor-payment-receipt-detail.service";
import {
  cancelDoctorPaymentService,
  type CancelDoctorPaymentResult,
} from "@/services/doctor-payment/cancel-doctor-payment.service";
import { getEarliestPendingPaymentDateService } from "@/services/doctor-payment/get-earliest-pending-payment-date.service";

export async function getEligibleDoctorPaymentBookings(doctorId: string, dateFrom: string, dateTo: string) {
  await requirePermission("doctor-payments", "view");
  return getEligibleBookingsService({ doctorId, dateFrom, dateTo });
}

export async function getEarliestPendingDoctorPaymentDate(doctorId: string) {
  await requirePermission("doctor-payments", "view");
  return getEarliestPendingPaymentDateService({ doctorId });
}

export async function getDoctorPaymentBookingDetails(bookingIds: string[]) {
  await requirePermission("doctor-payments", "view");
  return getDoctorPaymentBookingDetailsService(bookingIds);
}

export async function processDoctorPaymentAction(input: ProcessDoctorPaymentInput) {
  await requirePermission("doctor-payments", "add");
  return processDoctorPaymentService(input);
}

export async function getDoctorPaymentList(params: GetDoctorPaymentListParams) {
  await requirePermission("doctor-payments", "view");
  return getDoctorPaymentListService(params);
}

export async function getDoctorPaymentReceiptForPrint(receiptId: string) {
  await requirePermission("doctor-payments", "view");
  return getDoctorPaymentReceiptDetail(receiptId);
}

export async function getDoctorCancelReceiptForPrint(
  cancelReceiptId: string,
  options: { doctorName?: string; originalReceiptNoString?: string } = {}
) {
  await requirePermission("doctor-payments", "view");
  return getDoctorCancelReceiptDetail(cancelReceiptId, options);
}

export async function cancelDoctorPaymentAction(
  receiptId: string,
  cancelReason: string
): Promise<CancelDoctorPaymentResult> {
  await requirePermission("doctor-payments", "add");

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;
  if (!userId) {
    return { success: false, errorCode: "UNAUTHORIZED", message: "You must be logged in to cancel a doctor payment." };
  }

  return cancelDoctorPaymentService({
    receiptId,
    canceledBy: userId,
    cancelReason: cancelReason.trim(),
  });
}
