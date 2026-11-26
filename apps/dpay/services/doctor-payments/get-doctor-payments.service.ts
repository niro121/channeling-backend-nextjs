import prisma from '@/lib/prisma';
import type {
  DoctorPaymentExportRow,
  DoctorPaymentListItem,
  DoctorPaymentStatus,
  GetDoctorPaymentsParams,
  GetDoctorPaymentsResult,
} from '@/types/doctor-payment';
import { DOCTOR_PAYMENT_STATUSES } from '@/types/doctor-payment';
import type { Prisma } from '@/lib/generated/prisma';
import { getReportMax } from '@/lib/report-limits';
import { paymentMethodLabel } from '@/lib/receipts/helpers';
import { format } from 'date-fns';
import { parseReportDateTimeSl } from '@/lib/parse-report-datetime';

/** Created-date range (Sri Lanka day boundaries, inclusive). No-op when neither date is set. */
function applyCreatedAtRange(
  where: Prisma.DoctorPaymentWhereInput,
  params: Pick<GetDoctorPaymentsParams, 'dateFrom' | 'dateTo'>
) {
  const from = params.dateFrom ? parseReportDateTimeSl(params.dateFrom, false) : null;
  const to = params.dateTo ? parseReportDateTimeSl(params.dateTo, true) : null;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }
}

export async function getDoctorPayments(
  params: GetDoctorPaymentsParams = {}
): Promise<GetDoctorPaymentsResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const skip = (page - 1) * limit;
  const keyword = params.keyword?.trim();

  const where: Prisma.DoctorPaymentWhereInput = {};

  if (params.method && params.method !== '__all__') {
    where.paymentMethod = params.method;
  }
  if (params.status && params.status !== '__all__') {
    where.status = params.status;
  }
  if (params.doctorName && params.doctorName !== '__all__') {
    where.doctorName = params.doctorName;
  }
  applyCreatedAtRange(where, params);
  if (keyword) {
    where.OR = [
      { receiptNumber: { contains: keyword, mode: 'insensitive' } },
      { doctorName: { contains: keyword, mode: 'insensitive' } },
      { remarks: { contains: keyword, mode: 'insensitive' } },
      { handedToStaff: { contains: keyword, mode: 'insensitive' } },
      { cancelReason: { contains: keyword, mode: 'insensitive' } },
      { createdByName: { contains: keyword, mode: 'insensitive' } },
    ];
  }

  const [records, totalRecords] = await Promise.all([
    prisma.doctorPayment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.doctorPayment.count({ where }),
  ]);

  const data: DoctorPaymentListItem[] = records.map((record) => ({
    id: record.id,
    receiptNo: record.receiptNumber,
    status: record.status as DoctorPaymentStatus,
    doctorName: record.doctorName,
    doctorSpecialty: '',
    doctorId: record.doctorName,
    method: record.paymentMethod,
    total: record.totalAmount,
    net: record.netAmount,
    remarks: record.remarks,
    handedToStaff: record.handedToStaff,
    cancelReason: record.cancelReason,
    createdBy: record.createdByName?.trim() || '—',
    createdAt: record.createdAt.toISOString(),
  }));

  return { data, totalRecords };
}

/** Same filters as the list, not paged. Used by the Excel export. */
export async function getDoctorPaymentsExport(
  params: Omit<GetDoctorPaymentsParams, 'page' | 'limit'> = {}
): Promise<DoctorPaymentExportRow[]> {
  const keyword = params.keyword?.trim();

  const where: Prisma.DoctorPaymentWhereInput = {};

  if (params.method && params.method !== '__all__') {
    where.paymentMethod = params.method;
  }
  if (params.status && params.status !== '__all__') {
    where.status = params.status;
  }
  if (params.doctorName && params.doctorName !== '__all__') {
    where.doctorName = params.doctorName;
  }
  applyCreatedAtRange(where, params);
  if (keyword) {
    where.OR = [
      { receiptNumber: { contains: keyword, mode: 'insensitive' } },
      { doctorName: { contains: keyword, mode: 'insensitive' } },
      { remarks: { contains: keyword, mode: 'insensitive' } },
      { handedToStaff: { contains: keyword, mode: 'insensitive' } },
      { cancelReason: { contains: keyword, mode: 'insensitive' } },
      { createdByName: { contains: keyword, mode: 'insensitive' } },
    ];
  }

  const records = await prisma.doctorPayment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: getReportMax(),
  });

  return records.map((record) => ({
    receiptNumber: record.receiptNumber,
    status:
      DOCTOR_PAYMENT_STATUSES.find((s) => s.value === record.status)?.label ?? record.status,
    doctorName: record.doctorName,
    paymentMethod: paymentMethodLabel(record.paymentMethod),
    total: record.totalAmount,
    net: record.netAmount,
    createdBy: record.createdByName?.trim() || '—',
    createdAt: format(record.createdAt, 'yyyy-MM-dd'),
    handedToStaff: record.handedToStaff?.trim() || '',
  }));
}
