'use server';

import { requirePermission } from '@/lib/server-permissions';
import { getReceiptManagerDetail } from '@/services/receipt-manager/get-receipt-manager-detail.service';
import { getReceipts } from '@/services/receipts/get-receipts.service';
import type { GetReceiptsParams } from '@/types/receipt';

export async function getReceiptManagerListAction(params: GetReceiptsParams = {}) {
  await requirePermission('receipt-manager', 'view');
  return getReceipts(params);
}

export async function getReceiptManagerDetailAction(receiptId: string) {
  await requirePermission('receipt-manager', 'view');
  return getReceiptManagerDetail(receiptId);
}
