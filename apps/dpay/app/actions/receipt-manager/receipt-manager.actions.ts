'use server';

import { getReceiptManagerDetail } from '@/services/receipt-manager/get-receipt-manager-detail.service';
import { getReceipts } from '@/services/receipts/get-receipts.service';
import type { GetReceiptsParams } from '@/types/receipt';

export async function getReceiptManagerListAction(params: GetReceiptsParams = {}) {
  return getReceipts(params);
}

export async function getReceiptManagerDetailAction(receiptId: string) {
  return getReceiptManagerDetail(receiptId);
}
