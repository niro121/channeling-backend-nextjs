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
 * Resolve doctor for doctor-payment receipts from linked bookings, falling back to journal lines
 * (needed when a payment was canceled and booking links were cleared).
 */
export async function resolveDoctorsByReceiptIds(
  receiptIds: string[]
): Promise<Map<string, ResolvedDoctor>> {
  const result = new Map<string, ResolvedDoctor>();
  if (receiptIds.length === 0) return result;

  const bookings = await prisma.booking.findMany({
    where: { doctorPaymentReceiptId: { in: receiptIds } },
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
