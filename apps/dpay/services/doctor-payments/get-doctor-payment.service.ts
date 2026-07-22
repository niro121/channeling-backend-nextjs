import prisma from '@/lib/prisma';
import type {
  DoctorPaymentDetail,
  DoctorPaymentMethod,
  DoctorPaymentStatus,
} from '@/types/doctor-payment';

export async function getDoctorPaymentById(
  id: string
): Promise<DoctorPaymentDetail | null> {
  if (!id?.trim()) return null;

  const record = await prisma.doctorPayment.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { billNumber: 'asc' },
      },
    },
  });

  if (!record) return null;

  return {
    id: record.id,
    receiptNumber: record.receiptNumber,
    status: record.status as DoctorPaymentStatus,
    doctorName: record.doctorName,
    paymentMethod: record.paymentMethod as DoctorPaymentMethod,
    referenceNumber: record.referenceNumber,
    remarks: record.remarks,
    cancelReason: record.cancelReason,
    cancelReceiptNumber: record.cancelReceiptNumber,
    canceledAt: record.canceledAt?.toISOString() ?? null,
    totalAmount: record.totalAmount,
    whtAmount: record.whtAmount,
    whtPercentage: record.whtPercentage,
    netAmount: record.netAmount,
    applyWht: record.applyWht,
    createdBy: record.createdByName?.trim() || '—',
    createdAt: record.createdAt.toISOString(),
    bills: record.items.map((item) => ({
      billId: item.patientBillId,
      billNumber: item.billNumber,
      patientName: item.patientName,
      admissionDate: item.admissionDate.toISOString(),
      doctorFee: item.doctorFee,
      discount: item.discount,
      refund: item.refund,
      payableAmount: item.payableAmount,
    })),
  };
}
