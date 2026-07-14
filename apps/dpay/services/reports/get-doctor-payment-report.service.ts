import prisma from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma';
import type { DoctorPaymentMethod, DoctorPaymentStatus } from '@/types/doctor-payment';
import type {
  DoctorPaymentReportParams,
  DoctorPaymentReportResult,
  DoctorPaymentReportRow,
} from '@/types/reports';

const EXPORT_LIMIT = 10000;

function buildWhere(
  params: Pick<DoctorPaymentReportParams, 'keyword' | 'dateFrom' | 'dateTo'>
): Prisma.DoctorPaymentWhereInput {
  const where: Prisma.DoctorPaymentWhereInput = {};
  const keyword = params.keyword?.trim();

  if (params.dateFrom) {
    const from = new Date(params.dateFrom);
    from.setUTCHours(0, 0, 0, 0);
    where.createdAt = { ...(where.createdAt as Prisma.DateTimeFilter), gte: from };
  }

  if (params.dateTo) {
    const to = new Date(params.dateTo);
    to.setUTCHours(23, 59, 59, 999);
    where.createdAt = { ...(where.createdAt as Prisma.DateTimeFilter), lte: to };
  }

  if (keyword) {
    where.OR = [
      { receiptNumber: { contains: keyword, mode: 'insensitive' } },
      { doctorName: { contains: keyword, mode: 'insensitive' } },
      { cancelReceiptNumber: { contains: keyword, mode: 'insensitive' } },
    ];
  }

  return where;
}

function mapRow(record: {
  id: string;
  receiptNumber: string;
  doctorName: string;
  totalAmount: number;
  netAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: Date;
}): DoctorPaymentReportRow {
  const status = record.status as DoctorPaymentStatus;
  const isPaid = status === 'paid';

  return {
    id: record.id,
    doctorName: record.doctorName,
    doctorSpecialty: '',
    receiptNumber: record.receiptNumber,
    totalAmount: record.totalAmount,
    paidAmount: isPaid ? record.netAmount : 0,
    dueAmount: 0,
    status,
    paymentMethod: record.paymentMethod as DoctorPaymentMethod,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function getDoctorPaymentReport(
  params: DoctorPaymentReportParams = {}
): Promise<DoctorPaymentReportResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;
  const where = buildWhere(params);

  const [records, totalRecords, aggregate] = await Promise.all([
    prisma.doctorPayment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.doctorPayment.count({ where }),
    prisma.doctorPayment.aggregate({
      where: { ...where, status: 'paid' },
      _sum: { netAmount: true },
    }),
  ]);

  return {
    data: records.map(mapRow),
    totalRecords,
    totalPaid: aggregate._sum.netAmount ?? 0,
  };
}

export async function getDoctorPaymentReportExport(
  params: Omit<DoctorPaymentReportParams, 'page' | 'limit'>
): Promise<DoctorPaymentReportRow[]> {
  const where = buildWhere(params);

  const records = await prisma.doctorPayment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: EXPORT_LIMIT,
  });

  return records.map(mapRow);
}
