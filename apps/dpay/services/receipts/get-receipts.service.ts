import prisma from '@/lib/prisma';
import type { GetReceiptsParams, GetReceiptsResult, ReceiptListItem } from '@/types/receipt';
import type {
  PatientBillPaymentMethod,
  PatientBillReceiptStatus,
} from '@/types/patient-bill';
import { formatDoctorNames } from '@/lib/receipts/helpers';
import type { Prisma } from '@/lib/generated/prisma';

const EXPORT_LIMIT = 10000;

function buildWhere(
  params: Pick<GetReceiptsParams, 'keyword' | 'method' | 'status' | 'dateFrom' | 'dateTo'>
) {
  const where: Prisma.PatientBillReceiptWhereInput = {};
  const keyword = params.keyword?.trim();

  if (params.method && params.method !== '__all__') {
    where.paymentMethod = params.method;
  }

  if (params.status && params.status !== '__all__') {
    where.status = params.status;
  }

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
      { referenceNumber: { contains: keyword, mode: 'insensitive' } },
      { bill: { billNumber: { contains: keyword, mode: 'insensitive' } } },
      { bill: { bxtNumber: { contains: keyword, mode: 'insensitive' } } },
      { bill: { lineItems: { some: { doctorName: { contains: keyword, mode: 'insensitive' } } } } },
    ];
  }

  return where;
}

const receiptSelect = {
  id: true,
  receiptNumber: true,
  amountPaid: true,
  paymentMethod: true,
  referenceNumber: true,
  remarks: true,
  outstandingAfter: true,
  paymentDate: true,
  status: true,
  cancelReason: true,
  canceledAt: true,
  canceledByName: true,
  createdByName: true,
  bill: {
    select: {
      id: true,
      billNumber: true,
      bxtNumber: true,
      lineItems: {
        select: { doctorName: true, sortOrder: true },
        orderBy: { sortOrder: 'asc' as const },
      },
    },
  },
} satisfies Prisma.PatientBillReceiptSelect;

type ReceiptRecord = Prisma.PatientBillReceiptGetPayload<{ select: typeof receiptSelect }>;

function mapReceiptRecord(record: ReceiptRecord): ReceiptListItem {
  return {
    id: record.id,
    receiptNumber: record.receiptNumber,
    billId: record.bill.id,
    billNumber: record.bill.billNumber,
    bxtNumber: record.bill.bxtNumber,
    doctorName: formatDoctorNames(record.bill.lineItems),
    paymentDate: record.paymentDate.toISOString(),
    paymentMethod: record.paymentMethod as PatientBillPaymentMethod,
    referenceNumber: record.referenceNumber,
    remarks: record.remarks,
    amountPaid: record.amountPaid,
    outstandingAfter: record.outstandingAfter,
    status: (record.status as PatientBillReceiptStatus) || 'active',
    cancelReason: record.cancelReason,
    canceledAt: record.canceledAt?.toISOString() ?? null,
    canceledByName: record.canceledByName,
    createdByName: record.createdByName,
  };
}

export async function getReceipts(params: GetReceiptsParams = {}): Promise<GetReceiptsResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;
  const where = buildWhere(params);

  const [records, totalRecords] = await Promise.all([
    prisma.patientBillReceipt.findMany({
      where,
      skip,
      take: limit,
      orderBy: { paymentDate: 'desc' },
      select: receiptSelect,
    }),
    prisma.patientBillReceipt.count({ where }),
  ]);

  return {
    data: records.map(mapReceiptRecord),
    totalRecords,
  };
}

export async function getReceiptsExport(
  params: Omit<GetReceiptsParams, 'page' | 'limit'>
): Promise<ReceiptListItem[]> {
  const where = buildWhere(params);

  const records = await prisma.patientBillReceipt.findMany({
    where,
    orderBy: { paymentDate: 'desc' },
    take: EXPORT_LIMIT,
    select: receiptSelect,
  });

  return records.map(mapReceiptRecord);
}
