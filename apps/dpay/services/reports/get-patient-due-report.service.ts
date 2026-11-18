import prisma from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma';
import { parseReportDateTimeSl } from '@/lib/parse-report-datetime';
import { getReportMax } from '@/lib/report-limits';
import type {
  PatientDueReportParams,
  PatientDueReportResult,
  PatientDueReportRow,
} from '@/types/reports';


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
    const from = parseReportDateTimeSl(params.dateFrom, false);
    if (from) admissionDateFilter.gte = from;
  }
  if (params.dateTo) {
    const to = parseReportDateTimeSl(params.dateTo, true);
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
  dischargeDate: true,
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
    dischargeDate: record.dischargeDate?.toISOString() ?? null,
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
  const cap = getReportMax();

  const [records, totalRecords, aggregate] = await Promise.all([
    prisma.patientBill.findMany({
      where,
      orderBy: { admissionDate: 'desc' },
      take: cap + 1,
      select: billSelect,
    }),
    prisma.patientBill.count({ where }),
    prisma.patientBill.aggregate({
      where,
      _sum: { outstandingAmount: true },
    }),
  ]);

  const hasMore = records.length > cap;
  const sliced = hasMore ? records.slice(0, cap) : records;

  return {
    data: sliced.map(mapRow),
    totalRecords,
    totalDue: aggregate._sum.outstandingAmount ?? 0,
    hasMore: hasMore || totalRecords > cap,
  };
}

export async function getPatientDueReportExport(
  params: PatientDueReportParams = {}
): Promise<PatientDueReportRow[]> {
  const where = buildWhere(params);
  const records = await prisma.patientBill.findMany({
    where,
    orderBy: { admissionDate: 'desc' },
    take: getReportMax(),
    select: billSelect,
  });
  return records.map(mapRow);
}
