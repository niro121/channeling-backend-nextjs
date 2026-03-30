"use server";

import prisma from "@/lib/prisma";
import {
  ChannelBookingsReportQuery,
  ChannelBookingsReportRow,
} from "@/types/reports/channel-bookings";
import { Prisma } from "@prisma/client";
import { SL_OFFSET } from "@/lib/utils";
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';

const MAX_RANGE_DAYS = getReportMaxRangeDays('channel_bookings', 62);
const MAX_RECORDS_SCAN = getReportMaxRecords('channel_bookings', 30000);

/** Parse date range: supports YYYY-MM-DD or YYYY-MM-DDTHH:mm */
function parseDateRange(from?: string, to?: string): {
  from: Date;
  to: Date;
} | null {
  if (!from?.trim() || !to?.trim()) return null;

  const parseFrom = (val: string): Date => {
    const t = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t))
      return new Date(`${t}T00:00:00${SL_OFFSET}`);
    if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}/.test(t)) return new Date(t);
    return new Date(t);
  };
  const parseTo = (val: string): Date => {
    const t = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t))
      return new Date(`${t}T23:59:59.999${SL_OFFSET}`);
    if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}/.test(t)) {
      const [dp, tp] = t.split("T");
      const [h = 23, min = 59] = (tp || "").split(":").map(Number);
      return new Date(`${dp}T${h}:${min}:59.999${SL_OFFSET}`);
    }
    return new Date(t);
  };

  const fromDate = parseFrom(from);
  const toDate = parseTo(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return null;
  return { from: fromDate, to: toDate };
}

export async function getChannelBookingsReportService(
  query: ChannelBookingsReportQuery
): Promise<{
  success: boolean;
  data?: ChannelBookingsReportRow[];
  totalRecords?: number;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const {
      fromDateTime,
      toDateTime,
      dateType,
      institutionId,
      locationId,
      departmentId,
      branchTypeId,
      specialityId,
      doctorId,
      status,
      refundStatus,
      areaId,
      agencyId,
      patientPhone,
      gender,
      paymentTypeId,
      methodId,
    } = query;

    const hasDateFilter = Boolean(fromDateTime?.trim() && toDateTime?.trim());
    const dateRange = hasDateFilter ? parseDateRange(fromDateTime!, toDateTime!) : null;
    const hasAnyFilter =
      hasDateFilter ||
      (institutionId && institutionId !== "__all__") ||
      (locationId && locationId !== "__all__") ||
      (departmentId && departmentId !== "__all__") ||
      (branchTypeId && branchTypeId !== "__all__") ||
      (specialityId && specialityId !== "__all__") ||
      (doctorId && doctorId !== "__all__") ||
      (status && status !== "__all__") ||
      (refundStatus && refundStatus !== "__all__") ||
      (areaId && areaId !== "__all__") ||
      (agencyId && agencyId !== "__all__") ||
      (patientPhone && patientPhone.trim().length > 0) ||
      (gender && gender !== "__all__") ||
      (paymentTypeId && paymentTypeId !== "__all__") ||
      (methodId && methodId !== "__all__");

    if (!hasAnyFilter) {
      return { success: true, data: [], totalRecords: 0 };
    }

    if (hasDateFilter && !dateRange) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: { message: "Invalid date format" },
      };
    }
    if (dateRange) {
      const daySpan = getInclusiveDaySpan(dateRange.from, dateRange.to);
      if (daySpan > MAX_RANGE_DAYS) {
        return {
          success: false,
          data: [],
          totalRecords: 0,
          error: { message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.` },
        };
      }
    }

    const bookingWhere: Prisma.BookingWhereInput = {};

    // Date filter: Session Date vs Transaction Date
    if (dateRange) {
      if (dateType === "transaction_date") {
        bookingWhere.OR = [
          {
            status: 0,
            createdAt: { gte: dateRange.from, lte: dateRange.to },
          },
          {
            status: { in: [1, 2, 3] },
            receiptNoCreatedAt: { gte: dateRange.from, lte: dateRange.to },
          },
        ];
      } else {
        // session_date (default): filter by session date + institution
        const sessionWhere: Prisma.SessionWhereInput = {
          date: { gte: dateRange.from, lte: dateRange.to },
        };
        if (institutionId && institutionId !== "__all__") {
          const instNum = parseInt(institutionId, 10);
          if (!isNaN(instNum)) sessionWhere.institution = instNum;
        }
        if (departmentId && departmentId !== "__all__") {
          sessionWhere.departmentId = departmentId;
        }
        const sessions = await prisma.session.findMany({
          where: sessionWhere,
          select: { id: true },
        });
        const ids = sessions.map((s) => s.id);
        if (ids.length === 0) {
          return { success: true, data: [], totalRecords: 0 };
        }
        bookingWhere.sessionId = { in: ids };
      }
    }

    // Institution (when transaction_date - session filter via session relation)
    if (
      dateType === "transaction_date" &&
      institutionId &&
      institutionId !== "__all__"
    ) {
      const instNum = parseInt(institutionId, 10);
      if (!isNaN(instNum)) {
        bookingWhere.session = { is: { institution: instNum } };
      }
    }

    if (departmentId && departmentId !== "__all__") {
      const appliedViaSessionDateList =
        Boolean(dateRange) && dateType !== "transaction_date";
      if (!appliedViaSessionDateList) {
        const existing = bookingWhere.session;
        const prevInner: Prisma.SessionWhereInput =
          existing &&
          typeof existing === "object" &&
          !Array.isArray(existing) &&
          "is" in existing &&
          existing.is &&
          typeof existing.is === "object" &&
          !Array.isArray(existing.is)
            ? { ...(existing.is as Prisma.SessionWhereInput) }
            : {};
        bookingWhere.session = {
          is: { ...prevInner, departmentId },
        };
      }
    }

    // Location (branch)
    if (locationId && locationId !== "__all__") {
      bookingWhere.locationId = locationId;
    }

    // Branch type (Location.branchType): filter locations by branchType
    if (branchTypeId && branchTypeId !== "__all__") {
      const btNum = parseInt(branchTypeId, 10);
      if (!isNaN(btNum)) {
        const locs = await prisma.location.findMany({
          where: { branchType: btNum },
          select: { id: true },
        });
        const branchTypeLocIds = locs.map((l) => l.id);
        if (branchTypeLocIds.length === 0) {
          return { success: true, data: [], totalRecords: 0 };
        }
        if (locationId && locationId !== "__all__") {
          if (!branchTypeLocIds.includes(locationId)) {
            return { success: true, data: [], totalRecords: 0 };
          }
          // locationId already set; it's in the branchType set
        } else {
          bookingWhere.locationId = { in: branchTypeLocIds };
        }
      }
    }

    // Speciality & Doctor
    if (specialityId && specialityId !== "__all__") {
      const doctorIds = await prisma.doctor.findMany({
        where: { specialityId },
        select: { id: true },
      });
      const ids = doctorIds.map((d) => d.id);
      if (ids.length === 0)
        return { success: true, data: [], totalRecords: 0 };
      bookingWhere.doctorId = { in: ids };
    }
    if (doctorId && doctorId !== "__all__") {
      if (
        bookingWhere.doctorId &&
        typeof bookingWhere.doctorId === "object" &&
        "in" in bookingWhere.doctorId
      ) {
        const existingIds = (bookingWhere.doctorId as { in: string[] }).in;
        bookingWhere.doctorId = {
          in: existingIds.filter((id) => id === doctorId),
        };
      } else {
        bookingWhere.doctorId = { equals: doctorId };
      }
    }

    // Status: 0=Pending, 1=Paid, 2=Cancel, 3=Refund
    if (status && status !== "__all__") {
      const s = parseInt(status, 10);
      if (!isNaN(s)) bookingWhere.status = s;
    }

    // Refund status
    if (refundStatus && refundStatus !== "__all__") {
      if (refundStatus === "no_refund") bookingWhere.refund = 0;
      else if (refundStatus === "any_refund")
        bookingWhere.refund = { not: 0 };
      else if (refundStatus === "professional_only") bookingWhere.refund = 1;
      else if (refundStatus === "hospital_only") bookingWhere.refund = 2;
      else if (refundStatus === "full_only") bookingWhere.refund = 3;
    }

    // Area (Booking.area is string - tag name; areaId is Tag id)
    if (areaId && areaId !== "__all__") {
      const tag = await prisma.tag.findUnique({
        where: { id: areaId },
        select: { name: true },
      });
      if (tag?.name) bookingWhere.area = tag.name;
    }

    // Agency
    if (agencyId && agencyId !== "__all__") {
      bookingWhere.agencyId = agencyId;
    }

    // Patient phone
    if (patientPhone?.trim()) {
      bookingWhere.phone = { contains: patientPhone.trim(), mode: "insensitive" };
    }

    // Gender
    if (gender && gender !== "__all__") {
      bookingWhere.sex = gender;
    }

    // Payment type (receiptPaymentMethod / PAYMENT_METHODS id)
    if (paymentTypeId && paymentTypeId !== "__all__") {
      const pt = parseInt(paymentTypeId, 10);
      if (!isNaN(pt)) bookingWhere.receiptPaymentMethod = pt;
    }

    // Method (Booking.method: 0=POS, 1=OnCall, 2=Agent, 3=Staff, 4=API)
    if (methodId && methodId !== "__all__") {
      const m = parseInt(methodId, 10);
      if (!isNaN(m)) bookingWhere.method = m;
    }

    const matchedBookingCount = await prisma.booking.count({ where: bookingWhere });
    if (matchedBookingCount > MAX_RECORDS_SCAN) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: { message: `Too many records in selected range (${matchedBookingCount}). Please narrow filters/date range.` },
      };
    }

    const bookings = await prisma.booking.findMany({
      where: bookingWhere,
      include: {
        doctor: { select: { id: true, name: true, code: true, specialityId: true, speciality: { select: { name: true } } } },
        session: { select: { id: true, date: true, startTime: true, endTime: true } },
        location: { select: { id: true, name: true, branchType: true } },
        agency: { select: { id: true, name: true } },
        createdUser: {
          select: {
            id: true,
            name: true,
            staff: { select: { code: true } },
          },
        },
        updatedUser: {
          select: {
            id: true,
            name: true,
            staff: { select: { code: true } },
          },
        },
        receipts: {
          where: { method: 0 },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, createdAt: true, createdBy: true },
        },
      },
      orderBy: [{ doctor: { code: "asc" } }, { session: { date: "asc" } }, { appointmentNo: "asc" }],
    });

    const refundCreatorIds = [
      ...new Set(
        bookings.flatMap((b) => {
          if ((b.refund ?? 0) === 0) return [];
          const recs = b.receipts ?? [];
          const rec =
            (b.refundReceiptId
              ? recs.find((r) => r.id === b.refundReceiptId)
              : undefined) ?? recs[0];
          return rec?.createdBy ? [rec.createdBy] : [];
        })
      ),
    ];
    const refundUsers =
      refundCreatorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: refundCreatorIds } },
            select: {
              id: true,
              name: true,
              staff: { select: { code: true } },
            },
          })
        : [];
    const refundUserById = new Map(refundUsers.map((u) => [u.id, u]));

    const rows: ChannelBookingsReportRow[] = bookings.map((b) => {
      const refundRecs = b.receipts ?? [];
      const { receipts: _r, ...rest } = b;
      const hasRefund = (rest.refund ?? 0) !== 0;
      const refundRec = hasRefund
        ? (rest.refundReceiptId
            ? refundRecs.find((r) => r.id === rest.refundReceiptId)
            : undefined) ?? refundRecs[0]
        : undefined;
      const resolvedRefundedAt = hasRefund
        ? rest.refundReceiptCreatedAt ?? refundRec?.createdAt ?? null
        : rest.refundReceiptCreatedAt;
      const refundCreatedUser =
        hasRefund && refundRec?.createdBy
          ? refundUserById.get(refundRec.createdBy) ?? null
          : null;
      return {
        ...rest,
        refundReceiptCreatedAt: resolvedRefundedAt,
        refundCreatedUser,
      } as ChannelBookingsReportRow;
    });

    return {
      success: true,
      data: rows,
      totalRecords: rows.length,
    };
  } catch (error: unknown) {
    console.error("getChannelBookingsReportService error:", error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: {
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch channel bookings report",
      },
    };
  }
}
