import prisma from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma';
import type {
  PatientDueReportParams,
  PatientDueReportResult,
  PatientDueReportRow,
} from '@/types/reports';

const DISPLAY_LIMIT = 10000;
const EXPORT_LIMIT = 10000;

/** Asia/Colombo (UTC+05:30) — matches patient bills list date filtering. */
const APP_TZ_OFFSET_MS = 5.5 * 60 * 60 * 1000;

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
  params: PatientDueReportParams
): Prisma.PatientBillWhereInput {
  const where: Prisma.PatientBillWhereInput = {
    outstandingAmount: { gt: 0 },
    status: { in: ['pending', 'partial'] },
  };
  const keyword = params.keyword?.trim();

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

const billSelect = {
  id: true,
  billNumber: true,
  bxtNumber: true,
  customerName: true,
  admissionDate: true,
  totalAmount: true,
  paidAmount: true,
  outstandingAmount: true,
  status: true,
} satisfies Prisma.PatientBillSelect;

type BillRecord = Prisma.PatientBillGetPayload<{ select: typeof billSelect }>;

function mapRow(record: BillRecord): PatientDueReportRow {
  return {
    id: record.id,
    billNumber: record.billNumber,
    bxtNumber: record.bxtNumber,
    patientName: record.customerName,
    admissionDate: record.admissionDate.toISOString(),
    totalAmount: record.totalAmount,
    paidAmount: record.paidAmount,
    dueAmount: record.outstandingAmount,
    status: record.status,
  };
}

export async function getPatientDueReport(
  params: PatientDueReportParams = {}
): Promise<PatientDueReportResult> {
  const where = buildWhere(params);

  const [records, totalRecords, aggregate] = await Promise.all([
    prisma.patientBill.findMany({
      where,
      orderBy: { admissionDate: 'desc' },
      take: DISPLAY_LIMIT + 1,
      select: billSelect,
    }),
    prisma.patientBill.count({ where }),
    prisma.patientBill.aggregate({
      where,
      _sum: { outstandingAmount: true },
    }),
  ]);

  const hasMore = records.length > DISPLAY_LIMIT;
  const sliced = hasMore ? records.slice(0, DISPLAY_LIMIT) : records;

  return {
    data: sliced.map(mapRow),
    totalRecords,
    totalDue: aggregate._sum.outstandingAmount ?? 0,
    hasMore: hasMore || totalRecords > DISPLAY_LIMIT,
  };
}

export async function getPatientDueReportExport(
  params: PatientDueReportParams = {}
): Promise<PatientDueReportRow[]> {
  const where = buildWhere(params);
  const records = await prisma.patientBill.findMany({
    where,
    orderBy: { admissionDate: 'desc' },
    take: EXPORT_LIMIT,
    select: billSelect,
  });
  return records.map(mapRow);
}
