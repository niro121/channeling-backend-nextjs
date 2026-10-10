import prisma from "@/lib/prisma"

export type ValidateVoucherResult =
  | { valid: true }
  | { valid: false; message: string }

/**
 * Validates that a voucher code is valid for the given discount:
 * - Code exists and is published (status === 1)
 * - Belongs to the given discount
 * - Discount is a voucher scheme (isVoucher === 1)
 * Code is normalized to uppercase trim for lookup.
 */
export async function validateVoucherForDiscount(
  voucherCode: string,
  discountId: string
): Promise<ValidateVoucherResult> {
  const code = voucherCode.trim().toUpperCase()
  if (!code) {
    return { valid: false, message: "Voucher code is required." }
  }

  const voucher = await prisma.voucherCode.findUnique({
    where: { code },
    select: {
      id: true,
      status: true,
      discountId: true,
      limit: true,
      discount: {
        select: { isVoucher: true },
      },
    },
  })

  if (!voucher) {
    return { valid: false, message: "Invalid voucher code." }
  }
  if (voucher.status !== 1) {
    return { valid: false, message: "Voucher code is inactive or expired." }
  }
  if (voucher.discountId !== discountId) {
    return { valid: false, message: "Voucher code is not valid for this discount." }
  }
  if (voucher.discount?.isVoucher !== 1) {
    return { valid: false, message: "This discount is not a voucher scheme." }
  }

  return { valid: true }
}
