"use server";

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
import { getDoctorPaymentReceiptDetail } from "@/services/doctor-payment/get-doctor-payment-receipt-detail.service";

export async function getEligibleDoctorPaymentBookings(doctorId: string, dateFrom: string, dateTo: string) {
  await requirePermission("doctor-payments", "view");
  return getEligibleBookingsService({ doctorId, dateFrom, dateTo });
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
