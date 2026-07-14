import prisma from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma';
import type { PatientBillPaymentMethod } from '@/types/patient-bill';
import type {
  ReceiptReportParams,
  ReceiptReportResult,
  ReceiptReportRow,
} from '@/types/reports';

const EXPORT_LIMIT = 10000;

function buildWhere(
  params: Pick<ReceiptReportParams, 'keyword' | 'dateFrom' | 'dateTo'>
): Prisma.PatientBillReceiptWhereInput {
  const where: Prisma.PatientBillReceiptWhereInput = {};
  const keyword = params.keyword?.trim();

  if (params.dateFrom) {
    const from = new Date(params.dateFrom);
    from.setUTCHours(0, 0, 0, 0);
    where.paymentDate = { ...(where.paymentDate as Prisma.DateTimeFilter), gte: from };
  }

  if (params.dateTo) {
    const to = new Date(params.dateTo);
    to.setUTCHours(23, 59, 59, 999);
    where.paymentDate = { ...(where.paymentDate as Prisma.DateTimeFilter), lte: to };
  }

  if (keyword) {
    where.OR = [
      { receiptNumber: { contains: keyword, mode: 'insensitive' } },
      { bill: { billNumber: { contains: keyword, mode: 'insensitive' } } },
      { bill: { bxtNumber: { contains: keyword, mode: 'insensitive' } } },
      { bill: { customerName: { contains: keyword, mode: 'insensitive' } } },
    ];
  }

  return where;
}

const receiptSelect = {
  id: true,
  receiptNumber: true,
  amountPaid: true,
  paymentMethod: true,
  paymentDate: true,
  bill: {
    select: {
      id: true,
      billNumber: true,
      customerName: true,
    },
  },
} satisfies Prisma.PatientBillReceiptSelect;

type ReceiptRecord = Prisma.PatientBillReceiptGetPayload<{ select: typeof receiptSelect }>;

function mapRow(record: ReceiptRecord): ReceiptReportRow {
  return {
    id: record.id,
    receiptNumber: record.receiptNumber,
    patientName: record.bill.customerName,
    billId: record.bill.id,
    billNumber: record.bill.billNumber,
    paymentDate: record.paymentDate.toISOString(),
    paymentMethod: record.paymentMethod as PatientBillPaymentMethod,
    amountPaid: record.amountPaid,
  };
}

export async function getReceiptReport(
  params: ReceiptReportParams = {}
): Promise<ReceiptReportResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;
  const where = buildWhere(params);

  const [records, totalRecords, aggregate] = await Promise.all([
    prisma.patientBillReceipt.findMany({
      where,
      skip,
      take: limit,
      orderBy: { paymentDate: 'desc' },
      select: receiptSelect,
    }),
    prisma.patientBillReceipt.count({ where }),
    prisma.patientBillReceipt.aggregate({
      where,
      _sum: { amountPaid: true },
    }),
  ]);

  return {
    data: records.map(mapRow),
    totalRecords,
    totalReceived: aggregate._sum.amountPaid ?? 0,
  };
}

export async function getReceiptReportExport(
  params: Omit<ReceiptReportParams, 'page' | 'limit'>
): Promise<ReceiptReportRow[]> {
  const where = buildWhere(params);

  const records = await prisma.patientBillReceipt.findMany({
    where,
    orderBy: { paymentDate: 'desc' },
    take: EXPORT_LIMIT,
    select: receiptSelect,
  });

  return records.map(mapRow);
}
