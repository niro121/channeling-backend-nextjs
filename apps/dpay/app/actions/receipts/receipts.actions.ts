'use server';

import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/server-permissions';
import { fetchServerSession } from '@/lib/session';
import { getReceipts, getReceiptsExport } from '@/services/receipts/get-receipts.service';
import { cancelPatientBillReceipt } from '@/services/receipts/cancel-patient-bill-receipt.service';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { paymentMethodLabel, paymentReferenceDisplay } from '@/lib/receipts/helpers';
import type { GetReceiptsParams, ReceiptExportRow } from '@/types/receipt';
import type { PatientBillPaymentMethod } from '@/types/patient-bill';
import { format } from 'date-fns';

export async function getReceiptsAction(params: GetReceiptsParams = {}) {
  await requirePermission('receipts', 'view');
  return getReceipts(params);
}

export async function getReceiptsExportAction(
  params: Omit<GetReceiptsParams, 'page' | 'limit'>
): Promise<{ success: boolean; data?: ReceiptExportRow[]; message?: string }> {
  await requirePermission('receipts', 'view');

  try {
    const items = await getReceiptsExport(params);
    const data: ReceiptExportRow[] = items.map((item) => ({
      receiptNumber: item.receiptNumber,
      billNumber: item.billNumber,
      doctorName: item.doctorName,
      paymentDate: format(new Date(item.paymentDate), 'yyyy-MM-dd HH:mm:ss'),
      paymentMethod: paymentMethodLabel(item.paymentMethod),
      referenceNumber: paymentReferenceDisplay(item),
      amountPaid: formatLkr(item.amountPaid),
      createdBy: item.createdByName?.trim() || '—',
      status: item.status === 'cancelled' ? 'Cancelled' : 'Active',
      cancelReason: item.cancelReason?.trim() || '—',
      canceledAt: item.canceledAt
        ? format(new Date(item.canceledAt), 'yyyy-MM-dd HH:mm:ss')
        : '—',
      canceledBy: item.canceledByName?.trim() || '—',
    }));

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to export receipts',
    };
  }
}

export async function cancelPatientBillReceiptAction(
  receiptId: string,
  cancelReason: string,
  refund: {
    refundPaymentMethod: PatientBillPaymentMethod;
    bank?: string;
    bankId?: string;
    cardReference?: string;
    slipReference?: string;
    slipDate?: string;
  }
) {
  // Same permission as recording payments — receipt cancel recalculates the bill.
  await requirePermission('patient-bills', 'edit');
  const session = await fetchServerSession();
  if (!session?.user?.id) {
    return { success: false as const, message: 'You must be logged in to cancel a receipt.' };
  }

  const result = await cancelPatientBillReceipt({
    receiptId,
    cancelReason,
    refundPaymentMethod: refund.refundPaymentMethod,
    bank: refund.bank,
    bankId: refund.bankId,
    cardReference: refund.cardReference,
    slipReference: refund.slipReference,
    slipDate: refund.slipDate,
    canceledBy: session.user.id,
    canceledByName: session.user.name ?? null,
  });

  if (result.success) {
    revalidatePath('/receipts');
    revalidatePath('/patient-bills');
    revalidatePath(`/patient-bills/${result.billId}`);
  }

  return result;
}
