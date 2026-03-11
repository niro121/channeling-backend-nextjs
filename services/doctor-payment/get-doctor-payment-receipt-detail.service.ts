"use server";

import prisma from "@/lib/prisma";
import { RECEIPT_METHOD } from "@/types/receipt";

export type DoctorPaymentLineItem = {
  date: string;
  session: string;
  noOfPatients: number;
  receiptNo: string;
  patientName: string;
  amountRs: number;
};

export type DoctorPaymentReceiptDetail = {
  id: string;
  receiptNoString: string;
  consultantName: string;
  documentStatus: string;
  locationName: string | null;
  amount: number;
  whd: number;
  whdPercentage: number;
  netAmount: number;
  totalPatientCount: number;
  lineItems: DoctorPaymentLineItem[];
  remarks: string;
  slipReference: string;
  createdAt: Date;
  createdByName: string | null;
  createdById: string | null;
};

export async function getDoctorPaymentReceiptDetail(
  receiptId: string
): Promise<{ success: true; data: DoctorPaymentReceiptDetail } | { success: false; message: string }> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId, method: RECEIPT_METHOD.DOCTOR_PAYMENT },
    include: { location: { select: { name: true } } },
  });
  if (!receipt) {
    return { success: false, message: "Doctor payment receipt not found." };
  }

  const bookings = await prisma.booking.findMany({
    where: { doctorPaymentReceiptId: receiptId },
    include: {
      session: { select: { date: true, startTime: true, endTime: true } },
      doctor: { select: { title: true, name: true } },
    },
    orderBy: [{ session: { date: "asc" } }, { session: { startTime: "asc" } }, { appointmentNo: "asc" }],
  });

  const firstBooking = bookings[0];
  const doctorName = firstBooking?.doctor
    ? [firstBooking.doctor.title, firstBooking.doctor.name].filter(Boolean).join(" ").trim() || "—"
    : "—";

  const lineItems: DoctorPaymentLineItem[] = [];
  let totalPatientCount = 0;
  for (const b of bookings) {
    const session = b.session;
    const sessionDate = session?.date instanceof Date ? session.date : new Date(session?.date ?? 0);
    const startTime = session?.startTime;
    const endTime = session?.endTime;
    const sessionStr =
      sessionDate && startTime != null && endTime != null
        ? `${sessionDate.toISOString().slice(0, 10)} ${formatTime(startTime)}–${formatTime(endTime)}`
        : "—";
    const professionalFee = b.professionalFee ?? 0;
    const discount = b.professionsalFeeDiscount ?? 0;
    const refunds = b.refundAmountProfessionalFee ?? 0;
    const amountRs = Math.max(0, professionalFee - discount - refunds);
    const patientName = [b.title, b.name].filter(Boolean).join(" ").trim() || "—";
    lineItems.push({
      date: sessionDate ? sessionDate.toISOString().slice(0, 10) : "—",
      session: sessionStr,
      noOfPatients: 1,
      receiptNo: b.bookingid_string ?? b.receiptNoString ?? "—",
      patientName,
      amountRs,
    });
    totalPatientCount += 1;
  }

  // Group by session for display (optional: we're sending flat line items; template can show one row per booking)
  const gross = Math.abs(receipt.amount);
  const whd = receipt.whd ?? 0;
  const netAmount = Math.max(0, gross - whd);

  let createdByName: string | null = null;
  let createdById: string | null = null;
  if (receipt.createdBy) {
    const creator = await prisma.user.findUnique({
      where: { id: receipt.createdBy },
      select: { name: true, id: true },
    });
    createdByName = creator?.name ?? null;
    createdById = creator?.id ?? null;
  }

  const data: DoctorPaymentReceiptDetail = {
    id: receipt.id,
    receiptNoString: receipt.receiptNoString,
    consultantName: doctorName,
    documentStatus: "PAID",
    locationName: receipt.location?.name ?? null,
    amount: gross,
    whd,
    whdPercentage: receipt.whdPercentage ?? 0,
    netAmount,
    totalPatientCount,
    lineItems,
    remarks: receipt.remarks ?? "",
    slipReference: receipt.slipReference ?? "",
    createdAt: receipt.createdAt,
    createdByName,
    createdById,
  };

  return { success: true, data };
}

function formatTime(t: Date | number): string {
  if (typeof t === "number") {
    const d = new Date(t * 1000);
    return d.toTimeString().slice(0, 5);
  }
  const d = t instanceof Date ? t : new Date(t);
  return d.toTimeString().slice(0, 5);
}

/**
 * Get receipt detail for the cancel/reversal receipt (method 5) for print/view.
 * Builds a DoctorPaymentReceiptDetail-shaped object so the same template can be used.
 */
export async function getDoctorCancelReceiptDetail(
  cancelReceiptId: string,
  options: { doctorName?: string; originalReceiptNoString?: string } = {}
): Promise<{ success: true; data: DoctorPaymentReceiptDetail } | { success: false; message: string }> {
  const receipt = await prisma.receipt.findUnique({
    where: { id: cancelReceiptId, method: RECEIPT_METHOD.DOCTOR_CANCEL },
    include: { location: { select: { name: true } } },
  });
  if (!receipt) {
    return { success: false, message: "Cancel receipt not found." };
  }

  let originalReceiptNoString = options.originalReceiptNoString ?? "";
  if (!originalReceiptNoString && receipt.reversedReceiptId) {
    const original = await prisma.receipt.findUnique({
      where: { id: receipt.reversedReceiptId },
      select: { receiptNoString: true },
    });
    originalReceiptNoString = original?.receiptNoString ?? "";
  }

  const gross = Math.abs(receipt.amount);
  const whd = receipt.whd ?? 0;
  const netAmount = Math.max(0, gross - whd);

  let createdByName: string | null = null;
  let createdById: string | null = null;
  if (receipt.createdBy) {
    const creator = await prisma.user.findUnique({
      where: { id: receipt.createdBy },
      select: { name: true, id: true },
    });
    createdByName = creator?.name ?? null;
    createdById = creator?.id ?? null;
  }

  const consultantName = options.doctorName?.trim() ?? "—";
  const reversalLine: DoctorPaymentLineItem = {
    date: receipt.createdAt ? new Date(receipt.createdAt).toISOString().slice(0, 10) : "—",
    session: "Reversal",
    noOfPatients: 0,
    receiptNo: receipt.receiptNoString,
    patientName: originalReceiptNoString ? `Reversal of ${originalReceiptNoString}` : receipt.remarks ?? "Reversal",
    amountRs: gross,
  };

  const data: DoctorPaymentReceiptDetail = {
    id: receipt.id,
    receiptNoString: receipt.receiptNoString,
    consultantName,
    documentStatus: "CANCELLED",
    locationName: receipt.location?.name ?? null,
    amount: gross,
    whd,
    whdPercentage: receipt.whdPercentage ?? 0,
    netAmount,
    totalPatientCount: 0,
    lineItems: [reversalLine],
    remarks: receipt.remarks ?? "",
    slipReference: receipt.slipReference ?? "",
    createdAt: receipt.createdAt,
    createdByName,
    createdById,
  };

  return { success: true, data };
}
