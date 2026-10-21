import prisma from '@/lib/prisma';
import type {
  DoctorPaymentDetail,
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
    paymentMethod: record.paymentMethod,
    referenceNumber: record.referenceNumber,
    bank: record.bank,
    bankId: record.bankId,
    cardReference: record.cardReference,
    slipReference: record.slipReference,
    slipDate: record.slipDate?.toISOString() ?? null,
    remarks: record.remarks,
    cancelReason: record.cancelReason,
    cancelReceiptNumber: record.cancelReceiptNumber,
    refundOfPaymentId: record.refundOfPaymentId,
    canceledAt: record.canceledAt?.toISOString() ?? null,
    locationId: record.locationId,
    locationCode: record.locationCode,
    locationName: record.locationName,
    totalAmount: record.totalAmount,
    netAmount: record.netAmount,
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
