"use server";

import prisma from "@/lib/prisma";
import { formatSlipDate } from "@/lib/slip-date";
import { formatDateSriLanka } from "@/lib/utils";
import { RECEIPT_METHOD } from "@/types/receipt";
import { resolveDoctorForReceiptId } from "@/services/doctor-payment/resolve-doctors-by-receipt-ids";

const SRI_LANKA_TZ = "Asia/Colombo";

export type DoctorPaymentLineItem = {
  date: string;
  session: string;
  noOfPatients: number;
  receiptNo: string;
  patientName: string;
  amountRs: number;
};

export type DoctorPaymentSessionLine = {
  receiptNo: string;
  patientName: string;
  amountRs: number;
};

export type DoctorPaymentSessionGroup = {
  dateLabel: string;
  sessionLabel: string;
  patientCount: number;
  lines: DoctorPaymentSessionLine[];
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
  sessionGroups: DoctorPaymentSessionGroup[];
  /** Staff who created the payment: name and staff code. */
  paidBy: string;
  /** When the doctor was paid. On a cancel slip this is the original payment time. */
  paidAt: Date;
  /** Set on the cancel slip only. */
  canceledBy: string;
  canceledAt: Date | null;
  /** True when this slip has already been printed. Preview only; printing increments the count. */
  isDuplicate: boolean;
  remarks: string;
  slipReference: string;
  /** YYYY-MM-DD when set */
  slipDate: string | null;
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
      session: { select: { id: true, date: true, startTime: true, endTime: true } },
      doctor: { select: { title: true, name: true } },
    },
    orderBy: [{ session: { date: "asc" } }, { session: { startTime: "asc" } }, { appointmentNo: "asc" }],
  });

  const firstBooking = bookings[0];
  const doctorFromBooking = firstBooking?.doctor
    ? [firstBooking.doctor.title, firstBooking.doctor.name].filter(Boolean).join(" ").trim() || "—"
    : null;
  const doctorFromReceipt = doctorFromBooking ? null : await resolveDoctorForReceiptId(receiptId);
  const doctorName = doctorFromBooking ?? doctorFromReceipt?.doctorName ?? "—";

  const lineItems: DoctorPaymentLineItem[] = [];
  const sessionGroups: DoctorPaymentSessionGroup[] = [];
  const groupIndex = new Map<string, DoctorPaymentSessionGroup>();
  let totalPatientCount = 0;
  for (const b of bookings) {
    const session = b.session;
    const sessionDate = session?.date instanceof Date ? session.date : new Date(session?.date ?? 0);
    const startTime = session?.startTime;
    const endTime = session?.endTime;
    const dateLabel = session?.date ? formatDateSriLanka(sessionDate) : "—";
    const sessionLabel =
      startTime != null && endTime != null
        ? `${formatClock(startTime)} - ${formatClock(endTime)}`
        : "—";
    const sessionStr =
      dateLabel !== "—" && sessionLabel !== "—" ? `${dateLabel} ${sessionLabel}` : "—";
    const professionalFee = b.professionalFee ?? 0;
    const discount = b.professionsalFeeDiscount ?? 0;
    const refunds = b.refundAmountProfessionalFee ?? 0;
    const amountRs = Math.max(0, professionalFee - discount - refunds);
    const patientName = [b.title, b.name].filter(Boolean).join(" ").trim() || "—";
    const receiptNo = b.bookingid_string ?? b.receiptNoString ?? "—";
    lineItems.push({
      date: dateLabel,
      session: sessionStr,
      noOfPatients: 1,
      receiptNo,
      patientName,
      amountRs,
    });
    const groupKey = session?.id ?? `${dateLabel}|${sessionLabel}`;
    let group = groupIndex.get(groupKey);
    if (!group) {
      group = { dateLabel, sessionLabel, patientCount: 0, lines: [] };
      groupIndex.set(groupKey, group);
      sessionGroups.push(group);
    }
    group.lines.push({ receiptNo, patientName, amountRs });
    group.patientCount += 1;
    totalPatientCount += 1;
  }

  // Group by session for display (optional: we're sending flat line items; template can show one row per booking)
  const gross = Math.abs(receipt.amount);
  const whd = receipt.whd ?? 0;
  const netAmount = Math.max(0, gross - whd);

  const creator = await loadCreator(receipt.createdBy);

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
    sessionGroups,
    paidBy: creator.paidBy,
    paidAt: receipt.createdAt,
    canceledBy: "",
    canceledAt: null,
    isDuplicate: Number(receipt.printCount ?? 0) >= 1,
    remarks: receipt.remarks ?? "",
    slipReference: receipt.slipReference ?? "",
    slipDate: formatSlipDate(receipt.slipDate) ?? null,
    createdAt: receipt.createdAt,
    createdByName: creator.createdByName,
    createdById: creator.createdById,
  };

  return { success: true, data };
}

function formatClock(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SRI_LANKA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(value);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const period = (parts.find((part) => part.type === "dayPeriod")?.value ?? "AM").toUpperCase();
  return `${hour}:${minute} ${period}`;
}

async function loadCreator(userId: string | null): Promise<{
  createdByName: string | null;
  createdById: string | null;
  paidBy: string;
}> {
  if (!userId) return { createdByName: null, createdById: null, paidBy: "" };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true, id: true },
  });
  if (!user) return { createdByName: null, createdById: null, paidBy: "" };
  const username = user.username?.trim() || user.name?.trim() || "";
  return {
    createdByName: username || null,
    createdById: user.id ?? null,
    paidBy: username,
  };
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

  const original = receipt.reversedReceiptId
    ? await prisma.receipt.findUnique({
        where: { id: receipt.reversedReceiptId },
        select: { id: true, createdAt: true, createdBy: true, canceledBy: true, canceledAt: true },
      })
    : null;

  const originalDetail = original
    ? await getDoctorPaymentReceiptDetail(original.id)
    : { success: false as const, message: "" };

  const paidByUser = await loadCreator(original?.createdBy ?? null);
  const canceledByUser = await loadCreator(original?.canceledBy ?? receipt.createdBy);
  const consultantName =
    (originalDetail.success ? originalDetail.data.consultantName : "") ||
    options.doctorName?.trim() ||
    "—";
  const gross = originalDetail.success
    ? originalDetail.data.amount
    : Math.abs(receipt.amount);
  const whd = originalDetail.success ? originalDetail.data.whd : receipt.whd ?? 0;
  const netAmount = -Math.max(0, gross - whd);

  const data: DoctorPaymentReceiptDetail = {
    id: receipt.id,
    receiptNoString: receipt.receiptNoString,
    consultantName,
    documentStatus: "CANCELED",
    locationName: receipt.location?.name ?? (originalDetail.success ? originalDetail.data.locationName : null),
    amount: gross,
    whd,
    whdPercentage: originalDetail.success
      ? originalDetail.data.whdPercentage
      : receipt.whdPercentage ?? 0,
    netAmount,
    totalPatientCount: originalDetail.success ? originalDetail.data.totalPatientCount : 0,
    lineItems: originalDetail.success ? originalDetail.data.lineItems : [],
    sessionGroups: originalDetail.success ? originalDetail.data.sessionGroups : [],
    paidBy: paidByUser.paidBy,
    paidAt: original?.createdAt ?? receipt.createdAt,
    canceledBy: canceledByUser.paidBy,
    canceledAt: original?.canceledAt ?? receipt.createdAt,
    isDuplicate: Number(receipt.printCount ?? 0) >= 1,
    remarks: receipt.remarks ?? "",
    slipReference: receipt.slipReference ?? "",
    slipDate: formatSlipDate(receipt.slipDate) ?? null,
    createdAt: receipt.createdAt,
    createdByName: canceledByUser.createdByName,
    createdById: canceledByUser.createdById,
  };

  return { success: true, data };
}
