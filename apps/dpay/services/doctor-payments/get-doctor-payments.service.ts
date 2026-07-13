import prisma from '@/lib/prisma';
import type {
  DoctorPaymentListItem,
  DoctorPaymentMethod,
  DoctorPaymentStatus,
  GetDoctorPaymentsParams,
  GetDoctorPaymentsResult,
} from '@/types/doctor-payment';
import type { Prisma } from '@/lib/generated/prisma';

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
  if (keyword) {
    where.OR = [
      { receiptNumber: { contains: keyword, mode: 'insensitive' } },
      { doctorName: { contains: keyword, mode: 'insensitive' } },
      { remarks: { contains: keyword, mode: 'insensitive' } },
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
    method: record.paymentMethod as DoctorPaymentMethod,
    total: record.totalAmount,
    wht: record.whtAmount,
    net: record.netAmount,
    remarks: record.remarks,
    cancelReason: record.cancelReason,
    createdBy: record.createdByName?.trim() || '—',
    createdAt: record.createdAt.toISOString(),
  }));

  return { data, totalRecords };
}
