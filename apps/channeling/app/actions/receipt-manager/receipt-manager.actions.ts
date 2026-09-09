"use server";

import { requirePermission } from "@/lib/server-permissions";
import {
  getReceiptListService,
  getReceiptListExportService,
  type GetReceiptListParams,
} from "@/services/receipt-manager/get-receipt-list.service";
import { getReceiptDetailService } from "@/services/receipt-manager/get-receipt-detail.service";
import { getReceiptMethodLabel } from "@/services/receipt-manager/receipt-method-labels";
import { PAYMENT_METHOD_NAMES } from "@/types/receipt";

export async function getReceiptListAction(params: GetReceiptListParams) {
  await requirePermission("receipt-manager", "view");
  return getReceiptListService(params);
}

export async function getReceiptDetailAction(receiptId: string) {
  await requirePermission("receipt-manager", "view");
  return getReceiptDetailService(receiptId);
}

export type ReceiptExportRow = {
  receiptNoString: string;
  method: string;
  type: string;
  paymentMethod: string;
  amount: string;
  wht: string;
  locationName: string;
  createdAt: string;
  remarks: string;
};

export async function getReceiptListExportAction(
  params: Omit<GetReceiptListParams, "page" | "limit">
): Promise<{ success: boolean; data?: ReceiptExportRow[]; message?: string }> {
  await requirePermission("receipt-manager", "view");
  try {
    const items = await getReceiptListExportService(params);
    const data: ReceiptExportRow[] = items.map((r) => ({
      receiptNoString: r.receiptNoString ?? "",
      method: getReceiptMethodLabel(r.method),
      type: r.type === 1 ? "Debit" : "Credit",
      paymentMethod: PAYMENT_METHOD_NAMES[r.paymentMethod] ?? String(r.paymentMethod),
      amount: String(r.amount),
      wht: String(r.whd),
      locationName: r.locationName ?? "",
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : "",
      remarks: r.remarks ?? "",
    }));
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to export receipts",
    };
  }
}
