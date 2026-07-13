'use server';

import { requirePermission } from '@/lib/server-permissions';
import { getReceipts, getReceiptsExport } from '@/services/receipts/get-receipts.service';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { paymentMethodLabel } from '@/lib/receipts/helpers';
import type { GetReceiptsParams, ReceiptExportRow } from '@/types/receipt';
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
      paymentDate: format(new Date(item.paymentDate), 'yyyy-MM-dd'),
      paymentMethod: paymentMethodLabel(item.paymentMethod),
      referenceNumber: item.referenceNumber?.trim() || '—',
      amountPaid: formatLkr(item.amountPaid),
    }));

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Failed to export receipts',
    };
  }
}
