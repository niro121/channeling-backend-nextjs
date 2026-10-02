"use server";

import prisma from "@/lib/prisma";
import { getReportMax } from "@/lib/report-limits";

export type ReceiptListItem = {
  id: string;
  receiptNo: number;
  receiptNoString: string;
  method: number;
  type: number;
  paymentMethod: number;
  amount: number;
  whd: number;
  remarks: string;
  locationId: string | null;
  locationName: string | null;
  createdAt: Date;
  createdBy: string | null;
  bookingId: string | null;
};

export type GetReceiptListParams = {
  page?: number;
  limit?: number;
  keyword?: string;
  method?: number | null;
  locationId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export type GetReceiptListResult = {
  data: ReceiptListItem[];
  totalRecords: number;
};

/**
 * List all receipts with server-side pagination and filters.
 */
export async function getReceiptListService(
  params: GetReceiptListParams
): Promise<GetReceiptListResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (params.method != null) {
    where.method = params.method;
  }
  if (params.locationId) {
    where.locationId = params.locationId;
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
  if (params.keyword?.trim()) {
    where.receiptNoString = { contains: params.keyword.trim(), mode: "insensitive" };
  }

  const [data, totalRecords] = await Promise.all([
    prisma.receipt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        receiptNo: true,
        receiptNoString: true,
        method: true,
        type: true,
        paymentMethod: true,
        amount: true,
        whd: true,
        remarks: true,
        locationId: true,
        createdAt: true,
        createdBy: true,
        bookingId: true,
        location: { select: { name: true } },
      },
    }),
    prisma.receipt.count({ where }),
  ]);

  const items: ReceiptListItem[] = data.map((r) => ({
    id: r.id,
    receiptNo: r.receiptNo,
    receiptNoString: r.receiptNoString,
    method: r.method,
    type: r.type,
    paymentMethod: r.paymentMethod,
    amount: r.amount,
    whd: r.whd,
    remarks: r.remarks,
    locationId: r.locationId,
    locationName: r.location?.name ?? null,
    createdAt: r.createdAt,
    createdBy: r.createdBy,
    bookingId: r.bookingId,
  }));

  return { data: items, totalRecords };
}

/**
 * Fetch receipts for export (same filters as the list, capped by REPORT_MAX).
 */
export async function getReceiptListExportService(
  params: Omit<GetReceiptListParams, "page" | "limit">
): Promise<{
  items: ReceiptListItem[];
  totalRecords: number;
  exportLimit: number;
  limited: boolean;
}> {
  const where: Record<string, unknown> = {};
  if (params.method != null) where.method = params.method;
  if (params.locationId) where.locationId = params.locationId;
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
  if (params.keyword?.trim()) {
    where.receiptNoString = { contains: params.keyword.trim(), mode: "insensitive" };
  }

  const exportLimit = getReportMax();
  const [data, totalRecords] = await Promise.all([
    prisma.receipt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: exportLimit,
      select: {
        id: true,
        receiptNo: true,
        receiptNoString: true,
        method: true,
        type: true,
        paymentMethod: true,
        amount: true,
        whd: true,
        remarks: true,
        locationId: true,
        createdAt: true,
        createdBy: true,
        bookingId: true,
        location: { select: { name: true } },
      },
    }),
    prisma.receipt.count({ where }),
  ]);

  return {
    totalRecords,
    exportLimit,
    limited: totalRecords > exportLimit,
    items: data.map((r) => ({
      id: r.id,
      receiptNo: r.receiptNo,
      receiptNoString: r.receiptNoString,
      method: r.method,
      type: r.type,
      paymentMethod: r.paymentMethod,
      amount: r.amount,
      whd: r.whd,
      remarks: r.remarks,
      locationId: r.locationId,
      locationName: r.location?.name ?? null,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
      bookingId: r.bookingId,
    })),
  };
}
