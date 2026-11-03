"use server"

import { validateVoucherForDiscount } from "@/services/channel-booking/helpers"

export type ValidateVoucherActionResult =
  | { success: true; valid: true }
  | { success: true; valid: false; message: string }
  | { success: false; message: string }

/**
 * Validates a voucher code for a discount. Used by channel-booking UI to show immediate feedback.
 */
export async function validateVoucherAction(
  discountId: string,
  voucherCode: string
): Promise<ValidateVoucherActionResult> {
  if (!discountId?.trim() || !voucherCode?.trim()) {
    return { success: true, valid: false, message: "Voucher code is required." }
  }
  try {
    const result = await validateVoucherForDiscount(voucherCode.trim(), discountId.trim())
    if (result.valid) {
      return { success: true, valid: true }
    }
    return { success: true, valid: false, message: result.message }
  } catch (e) {
    console.error("validateVoucherAction error", e)
    return {
      success: false,
      message: e instanceof Error ? e.message : "Validation failed.",
    }
  }
}
