import prisma from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma';
import type {
  PatientExcessReportParams,
  PatientExcessReportResult,
  PatientExcessReportRow,
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
  params: PatientExcessReportParams
): Prisma.PatientBillWhereInput {
  const where: Prisma.PatientBillWhereInput = {
    status: { in: ['over_paid'] },
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
  status: true,
} satisfies Prisma.PatientBillSelect;

type BillRecord = Prisma.PatientBillGetPayload<{ select: typeof billSelect }>;

function mapRow(record: BillRecord): PatientExcessReportRow {
  return {
    id: record.id,
    billNumber: record.billNumber,
    bxtNumber: record.bxtNumber,
    patientName: record.customerName,
    admissionDate: record.admissionDate.toISOString(),
    totalAmount: record.totalAmount,
    paidAmount: record.paidAmount,
    excessAmount: Math.max(0, record.paidAmount - record.totalAmount),
    status: record.status,
  };
}

export async function getPatientExcessReport(
  params: PatientExcessReportParams = {}
): Promise<PatientExcessReportResult> {
  const where = buildWhere(params);

  const [records, totalRecords, sumRows] = await Promise.all([
    prisma.patientBill.findMany({
      where,
      orderBy: { admissionDate: 'desc' },
      take: DISPLAY_LIMIT + 1,
      select: billSelect,
    }),
    prisma.patientBill.count({ where }),
    prisma.patientBill.findMany({
      where,
      select: { paidAmount: true, totalAmount: true },
      take: EXPORT_LIMIT,
    }),
  ]);

  const hasMore = records.length > DISPLAY_LIMIT;
  const sliced = hasMore ? records.slice(0, DISPLAY_LIMIT) : records;
  const mapped = sliced.map(mapRow);
  const totalExcess = sumRows.reduce(
    (sum, row) => sum + Math.max(0, row.paidAmount - row.totalAmount),
    0
  );

  return {
    data: mapped,
    totalRecords,
    totalExcess,
    hasMore: hasMore || totalRecords > DISPLAY_LIMIT,
  };
}

export async function getPatientExcessReportExport(
  params: PatientExcessReportParams = {}
): Promise<PatientExcessReportRow[]> {
  const where = buildWhere(params);
  const records = await prisma.patientBill.findMany({
    where,
    orderBy: { admissionDate: 'desc' },
    take: EXPORT_LIMIT,
    select: billSelect,
  });
  return records.map(mapRow);
}
