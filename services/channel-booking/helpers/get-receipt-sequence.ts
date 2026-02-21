import prisma from "@/lib/prisma"

/** Receipt method: 0 REFUND, 1 PAYMENT, 4 DOCTOR PAYMENTS, 5 DOCTOR CANCELS */
const PAYMENT_RECEIPTS = 1
const REFUND_RECEIPTS = 0
const DOCTOR_PAYMENT_RECEIPTS = 4
const DOCTOR_PAYMENT_CANCEL_RECEIPTS = 5

function pad(num: number, size: number): string {
  return String(num).padStart(size, "0")
}

/**
 * Location-based receipt sequence and string format (matches old system).
 * method 1 → paymentreceipts, shortcode + 'CHANN/' + pad(8)
 * method 0 → refundreceipts, shortcode + 'CHANN-REF/' + pad(8)
 * method 4 → doctorpaymentreceipts, shortcode + 'CHANN-DOC-PAY/' + pad(8)
 * method 5 → doctorpaymentcancelreceipts, shortcode + 'CHANN-DOC-REF/' + pad(8)
 * When locationId is null, uses receipt:global and REC- prefix for backward compat.
 */
export async function getReceiptSequenceInfo(
  locationId: string | null,
  method: number
): Promise<{ scopeKey: string; formatReceiptNoString: (num: number) => string }> {
  if (!locationId) {
    return {
      scopeKey: "receipt:global",
      formatReceiptNoString: (num) => `REC-${pad(num, 8)}`,
    }
  }

  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { code: true },
  })
  const shortcode = location?.code ?? "LOC"

  let scopeSuffix: string
  let prefix: string
  if (method === PAYMENT_RECEIPTS) {
    scopeSuffix = "paymentreceipts"
    prefix = `${shortcode}CHANN/`
  } else if (method === REFUND_RECEIPTS) {
    scopeSuffix = "refundreceipts"
    prefix = `${shortcode}CHANN-REF/`
  } else if (method === DOCTOR_PAYMENT_RECEIPTS) {
    scopeSuffix = "doctorpaymentreceipts"
    prefix = `${shortcode}CHANN-DOC-PAY/`
  } else if (method === DOCTOR_PAYMENT_CANCEL_RECEIPTS) {
    scopeSuffix = "doctorpaymentcancelreceipts"
    prefix = `${shortcode}CHANN-DOC-REF/`
  } else {
    scopeSuffix = "receipts"
    prefix = `${shortcode}CHANN/`
  }

  const scopeKey = `${locationId}-${scopeSuffix}`
  return {
    scopeKey,
    formatReceiptNoString: (num) => prefix + pad(num, 8),
  }
}
