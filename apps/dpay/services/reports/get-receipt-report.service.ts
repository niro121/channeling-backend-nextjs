import prisma from '@/lib/prisma';
import type { Prisma } from '@/lib/generated/prisma';
import type { PatientBillPaymentMethod, PatientBillReceiptStatus } from '@/types/patient-bill';
import { parseReportDateTimeSl } from '@/lib/parse-report-datetime';
import type {
  ReceiptReportParams,
  ReceiptReportResult,
  ReceiptReportRow,
} from '@/types/reports';

const EXPORT_LIMIT = 10000;

function normalizeReceiptStatus(status?: string | null): PatientBillReceiptStatus {
  if (status === 'cancelled' || status === 'refund') return status;
  return 'active';
}

function buildWhere(
  params: Pick<ReceiptReportParams, 'keyword' | 'dateFrom' | 'dateTo'>
): Prisma.PatientBillReceiptWhereInput {
  const where: Prisma.PatientBillReceiptWhereInput = {};
  const keyword = params.keyword?.trim();

  if (params.dateFrom) {
    const from = parseReportDateTimeSl(params.dateFrom, false);
    if (from) {
      where.paymentDate = { ...(where.paymentDate as Prisma.DateTimeFilter), gte: from };
    }
  }

  if (params.dateTo) {
    const to = parseReportDateTimeSl(params.dateTo, true);
    if (to) {
      where.paymentDate = { ...(where.paymentDate as Prisma.DateTimeFilter), lte: to };
    }
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
  status: true,
  cancelReceiptNumber: true,
  refundOfReceiptId: true,
  bill: {
    select: {
      id: true,
      billNumber: true,
      customerName: true,
    },
  },
} satisfies Prisma.PatientBillReceiptSelect;

type ReceiptRecord = Prisma.PatientBillReceiptGetPayload<{ select: typeof receiptSelect }>;

function receiptReference(
  record: ReceiptRecord,
  originalReceiptNoById: Map<string, string>
): string {
  const status = normalizeReceiptStatus(record.status);
  if (status === 'cancelled') {
    return record.cancelReceiptNumber?.trim() || '';
  }
  if (status === 'refund' && record.refundOfReceiptId) {
    return originalReceiptNoById.get(record.refundOfReceiptId) || '';
  }
  return '';
}

function mapRow(
  record: ReceiptRecord,
  originalReceiptNoById: Map<string, string>
): ReceiptReportRow {
  return {
    id: record.id,
    receiptNumber: record.receiptNumber,
    reference: receiptReference(record, originalReceiptNoById),
    patientName: record.bill.customerName,
    billId: record.bill.id,
    billNumber: record.bill.billNumber,
    paymentDate: record.paymentDate.toISOString(),
    paymentMethod: record.paymentMethod as PatientBillPaymentMethod | string,
    amountPaid: record.amountPaid,
    status: normalizeReceiptStatus(record.status),
  };
}

async function originalReceiptNumbersById(
  records: ReceiptRecord[]
): Promise<Map<string, string>> {
  const originalIds = [
    ...new Set(
      records
        .map((record) => record.refundOfReceiptId)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  if (originalIds.length === 0) return new Map();

  const originals = await prisma.patientBillReceipt.findMany({
    where: { id: { in: originalIds } },
    select: { id: true, receiptNumber: true },
  });
  return new Map(originals.map((row) => [row.id, row.receiptNumber]));
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

  const originalReceiptNoById = await originalReceiptNumbersById(records);

  return {
    data: records.map((record) => mapRow(record, originalReceiptNoById)),
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

  const originalReceiptNoById = await originalReceiptNumbersById(records);
  return records.map((record) => mapRow(record, originalReceiptNoById));
}
