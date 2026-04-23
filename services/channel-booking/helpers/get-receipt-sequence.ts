import { RECEIPT_METHOD } from "@/types/receipt"
import prisma from "@/lib/prisma"

/** Receipt method: 0 REFUND, 1 PAYMENT, 4 DOCTOR PAYMENTS, 5 DOCTOR CANCELS, 2,3,6,7 agency/branch ledger */
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
 * method 2 → legerdebits (agency debit note), shortcode + 'CHANN-AGN-DN/' + pad(5)
 * method 3 → legercredits (agency credit note), shortcode + 'CHANN-AGN-CN/' + pad(5)
 * method 6 → legerdeposit (agency deposit), shortcode + 'CHANN-AGN-DP/' + pad(5)
 * method 7 → legerwithdraw (agency withdraw), shortcode + 'CHANN-AGN-WD/' + pad(5)
 * method 8 → branchincome, shortcode + 'CHANN-INC/' + pad(5)
 * method 9 → branchexpense, shortcode + 'CHANN-EXP/' + pad(5)
 * method 10 → bankdeposit, shortcode + 'CHANN-BNK-DP/' + pad(5)
 * method 11 → bankwithdraw, shortcode + 'CHANN-BNK-WD/' + pad(5)
 * When locationId is null (and no userLocationId for ledger), uses receipt:global and REC- prefix for backward compat.
 */
export async function getReceiptSequenceInfo(
  locationId: string | null,
  method: number,
  userLocationId?: string | null
): Promise<{ scopeKey: string; formatReceiptNoString: (num: number) => string }> {
  // Ledger methods (2,3,6,7): use userLocationId for scope and shortcode (same as old user_location)
  const ledgerAgencyMethodSet = new Set<number>([
    RECEIPT_METHOD.DEBIT_NOTE,
    RECEIPT_METHOD.CREDIT_NOTE,
    RECEIPT_METHOD.AGENCY_DEPOSIT,
    RECEIPT_METHOD.AGENCY_WITHDRAW,
  ])
  const sequenceLocationId = ledgerAgencyMethodSet.has(method) ? userLocationId ?? locationId : locationId

  if (!sequenceLocationId) {
    return {
      scopeKey: "receipt:global",
      formatReceiptNoString: (num) => `REC-${pad(num, 8)}`,
    }
  }

  const location = await prisma.location.findUnique({
    where: { id: sequenceLocationId },
    select: { code: true },
  })
  const shortcode = location?.code ?? "LOC"

  let scopeSuffix: string
  let prefix: string
  let padSize = 8

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
  } else if (method === RECEIPT_METHOD.DEBIT_NOTE) {
    scopeSuffix = "legerdebits"
    prefix = `${shortcode}CHANN-AGN-DN/`
    padSize = 5
  } else if (method === RECEIPT_METHOD.CREDIT_NOTE) {
    scopeSuffix = "legercredits"
    prefix = `${shortcode}CHANN-AGN-CN/`
    padSize = 5
  } else if (method === RECEIPT_METHOD.AGENCY_DEPOSIT) {
    scopeSuffix = "legerdeposit"
    prefix = `${shortcode}CHANN-AGN-DP/`
    padSize = 5
  } else if (method === RECEIPT_METHOD.AGENCY_WITHDRAW) {
    scopeSuffix = "legerwithdraw"
    prefix = `${shortcode}CHANN-AGN-WD/`
    padSize = 5
  } else if (method === RECEIPT_METHOD.BRANCH_INCOME) {
    scopeSuffix = "branchincome"
    prefix = `${shortcode}CHANN-INC/`
    padSize = 5
  } else if (method === RECEIPT_METHOD.BRANCH_EXPENSE) {
    scopeSuffix = "branchexpense"
    prefix = `${shortcode}CHANN-EXP/`
    padSize = 5
  } else if (method === RECEIPT_METHOD.BANK_DEPOSIT) {
    scopeSuffix = "bankdeposit"
    prefix = `${shortcode}CHANN-BNK-DP/`
    padSize = 5
  } else if (method === RECEIPT_METHOD.BANK_WITHDRAW) {
    scopeSuffix = "bankwithdraw"
    prefix = `${shortcode}CHANN-BNK-WD/`
    padSize = 5
  } else {
    scopeSuffix = "receipts"
    prefix = `${shortcode}CHANN/`
  }

  const scopeKey = `${sequenceLocationId}-${scopeSuffix}`
  const finalPadSize = padSize
  return {
    scopeKey,
    formatReceiptNoString: (num) => prefix + pad(num, finalPadSize),
  }
}
