"use server";

import prisma from "@/lib/prisma";

export type DoctorPaymentBookingRow = {
  id: string;
  billId: string | null;
  appNo: number;
  patient: string;
  appointmentDate: string;
  professionalFee: number;
  discount: number;
  refunds: number;
  paymentRs: number;
};

export type GetDoctorPaymentBookingDetailsResult =
  | { success: true; rows: DoctorPaymentBookingRow[]; totalDue: number }
  | { success: false; errorCode: string; message: string };

function formatAppointmentDate(d: Date): string {
  const x = d instanceof Date ? d : new Date(d);
  return x.toISOString().slice(0, 10);
}

/**
 * Get table rows for selected booking IDs: Bill Id, App No., Patient, Appointment Date, Professional Fee, Discount, Refunds, Payment (Rs.).
 */
export async function getDoctorPaymentBookingDetailsService(bookingIds: string[]): Promise<GetDoctorPaymentBookingDetailsResult> {
  if (!bookingIds.length) {
    return { success: true, rows: [], totalDue: 0 };
  }

  const bookings = await prisma.booking.findMany({
    where: { id: { in: bookingIds } },
    include: {
      session: { select: { date: true } },
    },
  });

  const rows: DoctorPaymentBookingRow[] = [];
  let totalDue = 0;
  for (const b of bookings) {
    const sessionDate = b.session?.date
      ? (b.session.date instanceof Date ? b.session.date : new Date(b.session.date))
      : new Date();
    const professionalFee = b.professionalFee ?? 0;
    const discount = b.professionsalFeeDiscount ?? 0;
    const refunds = b.refundAmount ?? 0;
    const paymentRs = Math.max(0, professionalFee - discount + refunds);
    totalDue += paymentRs;
    const patient = [b.title, b.name].filter(Boolean).join(" ").trim() || "—";
    rows.push({
      id: b.id,
      billId: b.receiptNoString ?? b.bookingid_string ?? null,
      appNo: b.appointmentNo,
      patient,
      appointmentDate: formatAppointmentDate(sessionDate),
      professionalFee,
      discount,
      refunds: b.refundAmount ?? 0,
      paymentRs,
    });
  }

  return { success: true, rows, totalDue };
}
