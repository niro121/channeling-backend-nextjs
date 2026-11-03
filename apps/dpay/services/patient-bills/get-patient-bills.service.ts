import prisma from '@/lib/prisma';
import type { GetPatientBillsParams, GetPatientBillsResult } from '@/types/patient-bill';
import { mapPatientBillRecord } from '@/lib/patient-bills/mappers';
import type { Prisma } from '@/lib/generated/prisma';

/** Asia/Colombo (UTC+05:30, no DST) — matches how date pickers store calendar days via toISOString(). */
const APP_TZ_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Parse YYYY-MM-DD as the start of that calendar day in Asia/Colombo (UTC Instant).
 * Example: 2026-07-15 → 2026-07-14T18:30:00.000Z
 */
function startOfAppDay(dateStr: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month - 1, day) - APP_TZ_OFFSET_MS);
}

function endOfAppDay(dateStr: string): Date | null {
  const start = startOfAppDay(dateStr);
  if (!start) return null;
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

function buildWhere(
  params: Pick<GetPatientBillsParams, 'keyword' | 'status' | 'dateFrom' | 'dateTo'>
): Prisma.PatientBillWhereInput {
  const where: Prisma.PatientBillWhereInput = {};
  const keyword = params.keyword?.trim();

  if (params.status) {
    where.status = params.status;
  }

  const admissionDateFilter: Prisma.DateTimeFilter = {};

  if (params.dateFrom) {
    const from = startOfAppDay(params.dateFrom);
    if (from) admissionDateFilter.gte = from;
  }

  if (params.dateTo) {
    const to = endOfAppDay(params.dateTo);
    if (to) admissionDateFilter.lte = to;
  }

  if (Object.keys(admissionDateFilter).length > 0) {
    where.admissionDate = admissionDateFilter;
  }

  if (keyword) {
    where.OR = [
      { customerName: { contains: keyword, mode: 'insensitive' } },
      { billNumber: { contains: keyword, mode: 'insensitive' } },
      { bxtNumber: { contains: keyword, mode: 'insensitive' } },
    ];
  }

  return where;
}

export async function getPatientBills(
  params: GetPatientBillsParams = {}
): Promise<GetPatientBillsResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;
  const where = buildWhere(params);

  const [records, totalRecords] = await Promise.all([
    prisma.patientBill.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        lineItems: {
          select: { doctorName: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
    prisma.patientBill.count({ where }),
  ]);

  return {
    data: records.map(mapPatientBillRecord),
    totalRecords,
  };
}
