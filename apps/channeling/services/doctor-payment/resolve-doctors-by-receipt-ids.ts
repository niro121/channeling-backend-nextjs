import prisma from "@/lib/prisma";
import { REFERENCE_TYPES } from "@/types/accounting";

export type ResolvedDoctor = {
  doctorId: string;
  doctorName: string;
};

function formatDoctorName(d: { title?: string | null; name?: string | null }): string {
  return [d.title, d.name].filter(Boolean).join(" ").trim() || "—";
}

/**
 * Resolve doctor for doctor-payment receipts from Receipt.doctorId, then linked bookings,
 * then journal lines (needed when a payment was canceled and booking links were cleared).
 */
export async function resolveDoctorsByReceiptIds(
  receiptIds: string[]
): Promise<Map<string, ResolvedDoctor>> {
  const result = new Map<string, ResolvedDoctor>();
  if (receiptIds.length === 0) return result;

  const receipts = await prisma.receipt.findMany({
    where: { id: { in: receiptIds }, doctorId: { not: null } },
    select: {
      id: true,
      doctorId: true,
      doctor: { select: { id: true, title: true, name: true } },
    },
  });
  for (const r of receipts) {
    if (!r.doctorId) continue;
    result.set(r.id, {
      doctorId: r.doctorId,
      doctorName: r.doctor ? formatDoctorName(r.doctor) : "—",
    });
  }

  const missingAfterReceipt = receiptIds.filter((id) => !result.has(id));
  if (missingAfterReceipt.length === 0) return result;

  const bookings = await prisma.booking.findMany({
    where: { doctorPaymentReceiptId: { in: missingAfterReceipt } },
    select: {
      doctorPaymentReceiptId: true,
      doctorId: true,
      doctor: { select: { id: true, title: true, name: true } },
    },
  });
  for (const b of bookings) {
    if (!b.doctorPaymentReceiptId || result.has(b.doctorPaymentReceiptId)) continue;
    result.set(b.doctorPaymentReceiptId, {
      doctorId: b.doctorId,
      doctorName: b.doctor ? formatDoctorName(b.doctor) : "—",
    });
  }

  const missingIds = receiptIds.filter((id) => !result.has(id));
  if (missingIds.length === 0) return result;

  const journals = await prisma.journal.findMany({
    where: {
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: { in: missingIds },
    },
    select: {
      referenceId: true,
      journalLines: {
        select: {
          account: {
            select: {
              doctor: { select: { id: true, title: true, name: true } },
            },
          },
        },
      },
    },
  });

  for (const journal of journals) {
    if (!journal.referenceId || result.has(journal.referenceId)) continue;
    for (const line of journal.journalLines) {
      const doctor = line.account?.doctor;
      if (!doctor) continue;
      result.set(journal.referenceId, {
        doctorId: doctor.id,
        doctorName: formatDoctorName(doctor),
      });
      break;
    }
  }

  return result;
}

export async function resolveDoctorForReceiptId(
  receiptId: string
): Promise<ResolvedDoctor | null> {
  const map = await resolveDoctorsByReceiptIds([receiptId]);
  return map.get(receiptId) ?? null;
}
