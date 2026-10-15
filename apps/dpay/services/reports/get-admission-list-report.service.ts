import prisma from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma';
import { parseReportDateTimeSl } from '@/lib/parse-report-datetime';
import type {
  AdmissionListReportParams,
  AdmissionListReportResult,
  AdmissionListReportRow,
} from '@/types/reports';

const DISPLAY_LIMIT = 10000;
const EXPORT_LIMIT = 10000;

function buildWhere(
  params: AdmissionListReportParams
): Prisma.PatientBillWhereInput {
  const where: Prisma.PatientBillWhereInput = {};
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
  customerNicPhone: true,
  customerAddress: true,
  admissionDate: true,
  dischargeDate: true,
  status: true,
} satisfies Prisma.PatientBillSelect;

type BillRecord = Prisma.PatientBillGetPayload<{ select: typeof billSelect }>;

function mapRow(record: BillRecord): AdmissionListReportRow {
  return {
    id: record.id,
    billNumber: record.billNumber,
    bxtNumber: record.bxtNumber,
    patientName: record.customerName,
    patientNicPhone: record.customerNicPhone?.trim() || '',
    patientAddress: record.customerAddress?.trim() || '',
    admissionDate: record.admissionDate.toISOString(),
    dischargeDate: record.dischargeDate?.toISOString() ?? null,
    status: record.status,
  };
}

export async function getAdmissionListReport(
  params: AdmissionListReportParams = {}
): Promise<AdmissionListReportResult> {
  const where = buildWhere(params);

  const [records, totalRecords] = await Promise.all([
    prisma.patientBill.findMany({
      where,
      orderBy: { admissionDate: 'desc' },
      take: DISPLAY_LIMIT + 1,
      select: billSelect,
    }),
    prisma.patientBill.count({ where }),
  ]);

  const hasMore = records.length > DISPLAY_LIMIT;
  const sliced = hasMore ? records.slice(0, DISPLAY_LIMIT) : records;

  return {
    data: sliced.map(mapRow),
    totalRecords,
    hasMore: hasMore || totalRecords > DISPLAY_LIMIT,
  };
}

export async function getAdmissionListReportExport(
  params: AdmissionListReportParams = {}
): Promise<AdmissionListReportRow[]> {
  const where = buildWhere(params);
  const records = await prisma.patientBill.findMany({
    where,
    orderBy: { admissionDate: 'desc' },
    take: EXPORT_LIMIT,
    select: billSelect,
  });
  return records.map(mapRow);
}
