"use server";

import prisma from "@/lib/prisma";
import { RECEIPT_METHOD } from "@/types/receipt";

export type DoctorPaymentListItem = {
  id: string;
  receiptNoString: string;
  amount: number;
  whd: number;
  whdPercentage: number;
  netAmount: number;
  paymentMethod: number;
  remarks: string;
  slipReference: string;
  locationId: string | null;
  locationName: string | null;
  doctorId: string;
  doctorName: string;
  createdAt: Date;
  createdBy: string | null;
  createdByName: string | null;
  /** For cancel flow: if canceled, cancel receipt id/string and reason; else null */
  cancelReceiptId: string | null;
  cancelReceiptNoString: string | null;
  cancelReason: string | null;
  canceledAt: Date | null;
};

export type GetDoctorPaymentListParams = {
  page?: number;
  limit?: number;
  keyword?: string; // patient name or bill no
  doctorPaymentNo?: string; // receipt number filter
  cancelInvoiceNo?: string;
  locationId?: string | null;
  paymentMethod?: number | null;
  doctorId?: string | null;
  dateFrom?: string | null; // YYYY-MM-DD
  dateTo?: string | null;
};

export type GetDoctorPaymentListResult = {
  data: DoctorPaymentListItem[];
  totalRecords: number;
};

/**
 * List doctor payments (Receipt method 4). Doctor name comes from first linked booking.
 * Status "Paid" vs "Canceled" can be derived from cancelReceiptId (non-null = canceled) when cancel flow is implemented.
 */
export async function getDoctorPaymentListService(
  params: GetDoctorPaymentListParams
): Promise<GetDoctorPaymentListResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { method: RECEIPT_METHOD.DOCTOR_PAYMENT };

  if (params.locationId) {
    where.locationId = params.locationId;
  }
  if (params.paymentMethod != null) {
    where.paymentMethod = params.paymentMethod;
  }
  if (params.doctorPaymentNo?.trim()) {
    where.receiptNoString = { contains: params.doctorPaymentNo.trim(), mode: "insensitive" };
  }
  if (params.dateFrom) {
    const from = new Date(params.dateFrom);
    from.setUTCHours(0, 0, 0, 0);
    where.createdAt = where.createdAt ?? {};
    (where.createdAt as Record<string, Date>).gte = from;
  }
  if (params.dateTo) {
    const to = new Date(params.dateTo);
    to.setUTCHours(23, 59, 59, 999);
    where.createdAt = where.createdAt ?? {};
    (where.createdAt as Record<string, Date>).lte = to;
  }

  let receiptIdsFilter: string[] | null = null;

  if (params.keyword?.trim()) {
    const kw = params.keyword.trim();
    const matchingBookings = await prisma.booking.findMany({
      where: {
        doctorPaymentReceiptId: { not: null },
        OR: [
          { name: { contains: kw, mode: "insensitive" } },
          { title: { contains: kw, mode: "insensitive" } },
          { bookingid_string: { contains: kw, mode: "insensitive" } },
          { receiptNoString: { contains: kw, mode: "insensitive" } },
        ],
      },
      select: { doctorPaymentReceiptId: true },
    });
    const ids = [...new Set(matchingBookings.map((b) => b.doctorPaymentReceiptId).filter(Boolean))] as string[];
    if (ids.length === 0) {
      return { data: [], totalRecords: 0 };
    }
    receiptIdsFilter = ids;
    where.id = { in: ids };
  }

  if (params.doctorId) {
    const bookingReceiptIds = await prisma.booking.findMany({
      where: { doctorId: params.doctorId, doctorPaymentReceiptId: { not: null } },
      select: { doctorPaymentReceiptId: true },
    });
    const ids = [...new Set(bookingReceiptIds.map((b) => b.doctorPaymentReceiptId).filter(Boolean))] as string[];
    if (ids.length === 0) {
      return { data: [], totalRecords: 0 };
    }
    const doctorReceiptIds = ids;
    if (receiptIdsFilter) {
      const intersection = doctorReceiptIds.filter((id) => receiptIdsFilter!.includes(id));
      if (intersection.length === 0) return { data: [], totalRecords: 0 };
      where.id = { in: intersection };
    } else {
      where.id = { in: doctorReceiptIds };
    }
  }

  const [totalRecords, receipts] = await Promise.all([
    prisma.receipt.count({ where }),
    prisma.receipt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        receiptNoString: true,
        amount: true,
        whd: true,
        whdPercentage: true,
        paymentMethod: true,
        remarks: true,
        slipReference: true,
        locationId: true,
        createdAt: true,
        createdBy: true,
        location: { select: { name: true } },
        canceledAt: true,
        cancelReason: true,
        reverseReceiptId: true,
      },
    }),
  ]);

  const receiptIds = receipts.map((r) => r.id);
  const bookingsWithDoctor = await prisma.booking.findMany({
    where: { doctorPaymentReceiptId: { in: receiptIds } },
    select: {
      doctorPaymentReceiptId: true,
      doctorId: true,
      doctor: { select: { id: true, title: true, name: true } },
    },
  });
  const doctorByReceiptId = new Map<string, { doctorId: string; doctorName: string }>();
  for (const b of bookingsWithDoctor) {
    if (!b.doctorPaymentReceiptId) continue;
    if (doctorByReceiptId.has(b.doctorPaymentReceiptId)) continue;
    const doctorName = b.doctor
      ? [b.doctor.title, b.doctor.name].filter(Boolean).join(" ").trim() || "—"
      : "—";
    doctorByReceiptId.set(b.doctorPaymentReceiptId, { doctorId: b.doctorId, doctorName });
  }

  const createdByIds = [...new Set(receipts.map((r) => r.createdBy).filter(Boolean))] as string[];
  let createdByNames: Map<string, string> = new Map();
  if (createdByIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: createdByIds } },
      select: { id: true, name: true },
    });
    createdByNames = new Map(users.map((u) => [u.id, u.name ?? ""]));
  }

  const reverseReceiptIds = [...new Set(receipts.map((r) => r.reverseReceiptId).filter(Boolean))] as string[];
  let reverseReceiptNoById: Map<string, string> = new Map();
  if (reverseReceiptIds.length > 0) {
    const reverseReceipts = await prisma.receipt.findMany({
      where: { id: { in: reverseReceiptIds } },
      select: { id: true, receiptNoString: true },
    });
    reverseReceiptNoById = new Map(reverseReceipts.map((r) => [r.id, r.receiptNoString]));
  }

  const data: DoctorPaymentListItem[] = receipts.map((r) => {
    const gross = Math.abs(r.amount);
    const whd = r.whd ?? 0;
    const netAmount = Math.max(0, gross - whd);
    const doc = doctorByReceiptId.get(r.id) ?? { doctorId: "", doctorName: "—" };
    return {
      id: r.id,
      receiptNoString: r.receiptNoString,
      amount: gross,
      whd,
      whdPercentage: r.whdPercentage ?? 0,
      netAmount,
      paymentMethod: r.paymentMethod,
      remarks: r.remarks ?? "",
      slipReference: r.slipReference ?? "",
      locationId: r.locationId,
      locationName: r.location?.name ?? null,
      doctorId: doc.doctorId,
      doctorName: doc.doctorName,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
      createdByName: r.createdBy ? createdByNames.get(r.createdBy) ?? null : null,
      cancelReceiptId: r.reverseReceiptId ?? null,
      cancelReceiptNoString: r.reverseReceiptId ? (reverseReceiptNoById.get(r.reverseReceiptId) ?? null) : null,
      cancelReason: r.cancelReason ?? null,
      canceledAt: r.canceledAt ?? null,
    };
  });

  return { data, totalRecords };
}
