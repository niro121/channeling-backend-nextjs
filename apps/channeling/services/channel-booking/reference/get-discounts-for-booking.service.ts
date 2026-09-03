import prisma from "@/lib/prisma"

export type DiscountForBookingOption = {
  id: string
  name: string
  /** Prisma enum values (e.g. "POS", "ON_CALL") for client-side filtering by booking type */
  discountMethod: string[]
  paymentType: string[]
  /** 0 = percentage, 1 = fixed */
  discountType: number
  /** 0 = hospital fee, 1 = professional fee */
  applyTo: number
  discountValue: number
  discountValueForeign: number
  /** 0 = no, 1 = yes — when true, UI must collect and validate voucher code */
  isVoucher: number
}

export type GetDiscountsForBookingPayload = {
  manual: DiscountForBookingOption[]
  auto: DiscountForBookingOption[]
}

const mapRecord = (r: {
  id: string
  name: string
  discountMethod: unknown[]
  paymentType: unknown[]
  discountType: number
  applyTo: number
  discountValue: number
  discountValueForeign: number
  isVoucher: number
}): DiscountForBookingOption => ({
  id: r.id,
  name: r.name,
  discountMethod: r.discountMethod as string[],
  paymentType: r.paymentType as string[],
  discountType: r.discountType,
  applyTo: r.applyTo,
  discountValue: r.discountValue,
  discountValueForeign: r.discountValueForeign,
  isVoucher: r.isVoucher,
})

/**
 * List all manual and auto-apply discounts that are active and within date range.
 * Client filters both by current payment_method + payment_type (booking type).
 * Manual = dropdown; auto = first applicable one is sent as auto_discount_type.
 */
export async function getDiscountsForBookingService(): Promise<GetDiscountsForBookingPayload> {
  const now = new Date()

  const records = await prisma.discount.findMany({
    where: {
      status: 1,
      fromDate: { lte: now },
      toDate: { gte: now },
    },
    select: {
      id: true,
      name: true,
      discountMethod: true,
      paymentType: true,
      autoApply: true,
      discountType: true,
      applyTo: true,
      discountValue: true,
      discountValueForeign: true,
      isVoucher: true,
    },
    orderBy: { name: "asc" },
  })

  const manual: DiscountForBookingOption[] = []
  const auto: DiscountForBookingOption[] = []
  for (const r of records) {
    const item = mapRecord(r)
    if (r.autoApply) {
      auto.push(item)
    } else {
      manual.push(item)
    }
  }
  return { manual, auto }
}
