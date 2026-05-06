"use server";

import prisma from "@/lib/prisma";
import { SL_OFFSET } from "@/lib/utils";
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from "@/lib/report-limits";
import { Prisma } from "@prisma/client";
import { SmsReportQuery, SmsReportRow } from "@/types/reports/sms.report";

const MAX_RANGE_DAYS = getReportMaxRangeDays("sms_log", 31);
const MAX_RECORDS_SCAN = getReportMaxRecords("sms_log", 50000);

function parseFromDateTime(value: string): Date {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00${SL_OFFSET}`);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}(:\d{2})?/.test(trimmed)) {
    const base = trimmed.replace(/Z$/i, "").split(":").slice(0, 2).join(":");
    return new Date(`${base}:00${SL_OFFSET}`);
  }
  return new Date(trimmed);
}

function parseToDateTime(value: string): Date {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T23:59:59.999${SL_OFFSET}`);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}(:\d{2})?/.test(trimmed)) {
    const [datePart, timePart] = trimmed.split("T");
    const [hour = 23] = (timePart || "").split(":").map(Number);
    const base = `${datePart}T${hour.toString().padStart(2, "0")}:59:59.999`;
    return new Date(`${base}${SL_OFFSET}`);
  }
  return new Date(trimmed);
}

/**
 * SmsLog has no `locationId`. Branch filter uses substring matches on `template`
 * (e.g. booking messages that include "Branch: …" and "Name, City"). Generic SMS
 * (2FA, etc.) with no location text are excluded when a branch is selected.
 */
function buildLocationTemplateOrConditions(
  loc: { name: string; city: string; code: string }
): Prisma.SmsLogWhereInput[] {
  const or: Prisma.SmsLogWhereInput[] = [];
  const name = loc.name?.trim() ?? "";
  const city = loc.city?.trim() ?? "";
  if (name.length) {
    or.push({ template: { contains: `Branch: ${name}`, mode: "insensitive" } });
  }
  if (name.length && city.length) {
    or.push({ template: { contains: `${name}, ${city}`, mode: "insensitive" } });
  }
  const code = loc.code?.trim() ?? "";
  if (code.length >= 2) {
    or.push({ template: { contains: code, mode: "insensitive" } });
  }
  return or;
}

export const getSmsReportService = async ({
  fromDateTime,
  toDateTime,
  status = "all",
  phoneNo,
  locationId,
}: SmsReportQuery): Promise<{
  success: boolean;
  data?: SmsReportRow[];
  totalRecords?: number;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    const hasDateFilter = Boolean(fromDateTime?.trim()) && Boolean(toDateTime?.trim());
    if (!hasDateFilter) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: { message: "Date & time range is required" },
      };
    }

    const fromDate = parseFromDateTime(fromDateTime!);
    const toDate = parseToDateTime(toDateTime!);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: { message: "Invalid date format" },
      };
    }

    const daySpan = getInclusiveDaySpan(fromDate, toDate);
    if (daySpan > MAX_RANGE_DAYS) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: { message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.` },
      };
    }

    const and: Prisma.SmsLogWhereInput[] = [
      {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
    ];

    if (status === "sent") and.push({ status: 0 });
    if (status === "failed") and.push({ status: 1 });

    if (phoneNo && phoneNo.trim() !== "") {
      and.push({
        phone: {
          contains: phoneNo.trim(),
          mode: "insensitive",
        },
      });
    }

    const locId = locationId?.trim();
    if (locId && locId !== "__all__" && locId !== "all") {
      const loc = await prisma.location.findUnique({
        where: { id: locId },
        select: { name: true, city: true, code: true },
      });
      if (!loc) {
        return {
          success: false,
          data: [],
          totalRecords: 0,
          error: { message: "Selected branch was not found." },
        };
      }
      const branchOr = buildLocationTemplateOrConditions(loc);
      if (branchOr.length === 0) {
        return {
          success: false,
          data: [],
          totalRecords: 0,
          error: { message: "Branch has no name or code to match in SMS text." },
        };
      }
      and.push({ OR: branchOr });
    }

    const where: Prisma.SmsLogWhereInput =
      and.length === 1 ? and[0]! : { AND: and };

    const totalCount = await prisma.smsLog.count({ where });
    if (totalCount > MAX_RECORDS_SCAN) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: { message: `Too many records in selected range (${totalCount}). Please narrow filters/date range.` },
      };
    }

    const records = await prisma.smsLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        status: true,
        name: true,
        phone: true,
        template: true,
      },
    });

    const data: SmsReportRow[] = records.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      status: row.status,
      name: row.name,
      phone: row.phone,
      template: row.template,
      count: row.status === 0 ? 1 : 0,
    }));

    return {
      success: true,
      data,
      totalRecords: totalCount,
    };
  } catch (error: any) {
    console.error("getSmsReportService error:", error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: { message: error?.message ?? "Failed to fetch SMS report" },
    };
  }
};
