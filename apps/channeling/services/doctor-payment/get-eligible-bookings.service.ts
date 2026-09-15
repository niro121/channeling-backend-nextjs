"use server";

import prisma from "@/lib/prisma";

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

function normalizeLocationId(locationId?: string | null): string | undefined {
  const id = locationId?.trim();
  if (!id || id === "__all__") return undefined;
  return OBJECT_ID_RE.test(id) ? id : undefined;
}

export type EligibleSessionGroup = {
  sessionId: string;
  sessionDate: Date;
  sessionStartTime: number;
  sessionEndTime: number;
  locationId: string | null;
  locationName: string | null;
  bookingIds: string[];
  bookingCount: number;
  totalAmount: number;
};

export type GetEligibleBookingsResult =
  | { success: true; sessions: EligibleSessionGroup[] }
  | { success: false; errorCode: string; message: string };

/**
 * Get sessions with pending doctor payment for a doctor in a date range.
 * Optional locationId limits results to that session branch; omit for all branches.
 * Lightweight: only selects id and fee fields, returns session summaries with booking IDs (no full booking details).
 */
export async function getEligibleBookingsService(params: {
  doctorId: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
  /** Session branch. Omit / null / `__all__` = all branches. */
  locationId?: string | null;
}): Promise<GetEligibleBookingsResult> {
  const { doctorId, dateFrom, dateTo } = params;
  if (!doctorId?.trim()) {
    return { success: false, errorCode: "VALIDATION", message: "Doctor is required." };
  }
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { success: false, errorCode: "VALIDATION", message: "Invalid date range." };
  }
  const startOfFrom = new Date(from);
  startOfFrom.setUTCHours(0, 0, 0, 0);
  const endOfTo = new Date(to);
  endOfTo.setUTCHours(23, 59, 59, 999);
  const sessionLocationId = normalizeLocationId(params.locationId);

  const bookings = await prisma.booking.findMany({
    where: {
      doctorId,
      status: 1,
      doctorPayment: false,
      sessionId: { not: null },
      session: {
        date: { gte: startOfFrom, lte: endOfTo },
        ...(sessionLocationId ? { locationId: sessionLocationId } : {}),
      },
    },
    select: {
      id: true,
      sessionId: true,
      professionalFee: true,
      professionsalFeeDiscount: true,
      refundAmountProfessionalFee: true,
      session: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          locationId: true,
          location: { select: { name: true } },
        },
      },
    },
    orderBy: [{ session: { date: "asc" } }, { session: { startTime: "asc" } }],
  });

  const bySession = new Map<string, {
    ids: string[];
    total: number;
    session: {
      date: Date;
      startTime: number;
      endTime: number;
      locationId: string | null;
      locationName: string | null;
    };
  }>();
  for (const b of bookings) {
    if (!b.session) continue;
    const session = b.session;
    const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);
    const startTime = typeof session.startTime === "number"
      ? session.startTime
      : (session.startTime instanceof Date ? Math.floor(session.startTime.getTime() / 1000) : 0);
    const endTime = typeof session.endTime === "number"
      ? session.endTime
      : (session.endTime instanceof Date ? Math.floor(session.endTime.getTime() / 1000) : 0);
    const refunds = b.refundAmountProfessionalFee ?? 0;
    const paymentRs = Math.max(0, (b.professionalFee ?? 0) - (b.professionsalFeeDiscount ?? 0) - refunds);
    const existing = bySession.get(session.id);
    if (existing) {
      existing.ids.push(b.id);
      existing.total += paymentRs;
    } else {
      bySession.set(session.id, {
        ids: [b.id],
        total: paymentRs,
        session: {
          date: sessionDate,
          startTime,
          endTime,
          locationId: session.locationId ?? null,
          locationName: session.location?.name ?? null,
        },
      });
    }
  }

  const sessions: EligibleSessionGroup[] = Array.from(bySession.entries()).map(([sessionId, data]) => ({
    sessionId,
    sessionDate: data.session.date,
    sessionStartTime: data.session.startTime,
    sessionEndTime: data.session.endTime,
    locationId: data.session.locationId,
    locationName: data.session.locationName,
    bookingIds: data.ids,
    bookingCount: data.ids.length,
    totalAmount: data.total,
  }));

  return { success: true, sessions };
}
