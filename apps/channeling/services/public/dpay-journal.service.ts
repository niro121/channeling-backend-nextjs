import prisma from "@/lib/prisma"
import { SHIFT_STATUS } from "@/types/shift"
import { createJournalEntry } from "@/services/accounting/journal.service"
import { resolveTillForUserAndLocation } from "@/services/accounting/till.service"
import { getOrCreateWhtPayableAccount } from "@/services/accounting/account/wht-payable-account.service"

export const DPAY_DOCTOR_PAYABLE_CODE_PREFIX = "DPAY-DOC-"

export type DpayJournalShare = {
  doctorId: string
  doctorCode: string
  doctorName: string
  amount: number
}

export type DpayJournalKind =
  | "patient_payment"
  | "patient_refund"
  | "doctor_payment"
  | "doctor_payment_cancel"

export type PostDpayJournalInput = {
  userId: string
  shiftId: string
  kind: DpayJournalKind
  referenceId?: string | null
  description: string
  paymentMethod: number
  shares: DpayJournalShare[]
  whtAmount?: number
}

function toCents(amount: number): number {
  return Math.round(Math.abs(Number(amount)) * 100)
}

function objectIdOrNull(value: string | null | undefined): string | null {
  const id = value?.trim() ?? ""
  return /^[a-f0-9]{24}$/i.test(id) ? id : null
}

async function getOrCreateDpayDoctorPayable(share: DpayJournalShare) {
  const code = `${DPAY_DOCTOR_PAYABLE_CODE_PREFIX}${share.doctorCode.trim()}`
  const existing = await prisma.account.findUnique({ where: { code } })
  if (existing) {
    if (!existing.isActive) {
      return prisma.account.update({
        where: { id: existing.id },
        data: { isActive: true, doctorId: share.doctorId },
      })
    }
    if (existing.doctorId !== share.doctorId) {
      return prisma.account.update({
        where: { id: existing.id },
        data: { doctorId: share.doctorId },
      })
    }
    return existing
  }

  const doctor = await prisma.doctor.findUnique({
    where: { id: share.doctorId },
    select: { id: true, name: true },
  })
  if (!doctor) {
    throw new Error(`Doctor ${share.doctorCode} was not found in Channeling.`)
  }

  return prisma.account.create({
    data: {
      code,
      name: `DPAY Doctor Payable - ${share.doctorName.trim() || doctor.name}`,
      type: "PAYABLE",
      doctorId: doctor.id,
      isActive: true,
    },
  })
}

export async function postDpayJournal(input: PostDpayJournalInput): Promise<
  { success: true; journalId: string } | { success: false; message: string }
> {
  const userId = input.userId.trim()
  const shiftId = input.shiftId.trim()
  if (!userId || !shiftId) return { success: false, message: "Shift and user are required." }
  if (!input.shares.length) return { success: false, message: "Doctor shares are required." }

  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, userId, status: SHIFT_STATUS.ACTIVE },
    select: { id: true, locationId: true, endsAt: true },
  })
  if (!shift?.locationId) {
    return { success: false, message: "An active shift is required to post this amount." }
  }
  if (new Date(shift.endsAt).getTime() <= Date.now()) {
    return { success: false, message: "Shift expired. Complete handover in Channeling." }
  }

  const till = await resolveTillForUserAndLocation(userId, shift.locationId)
  const accounts: Array<{ share: DpayJournalShare; account: { id: string } }> = []
  for (const share of input.shares) {
    if (!share.doctorId?.trim() || !share.doctorCode?.trim()) {
      return { success: false, message: "Each doctor share needs a Channeling doctor id and code." }
    }
    if (toCents(share.amount) <= 0) continue
    accounts.push({ share, account: await getOrCreateDpayDoctorPayable(share) })
  }
  if (!accounts.length) return { success: false, message: "Amount must be greater than zero." }

  const tillCents = accounts.reduce((sum, row) => sum + toCents(row.share.amount), 0)
  const whtCents =
    input.kind === "doctor_payment" || input.kind === "doctor_payment_cancel" ? toCents(input.whtAmount ?? 0) : 0
  const netCents = Math.max(0, tillCents - whtCents)
  const paymentMethod = Number(input.paymentMethod)
  const referenceId = objectIdOrNull(input.referenceId)
  const description = input.description.trim() || "DPAY"

  const tillLine = (debit: number, credit: number) => ({
    accountId: till.accountId,
    debitAmount: debit,
    creditAmount: credit,
    paymentMethod,
  })
  const payableLines = (debit: boolean) =>
    accounts.map((row) => ({
      accountId: row.account.id,
      debitAmount: debit ? toCents(row.share.amount) : 0,
      creditAmount: debit ? 0 : toCents(row.share.amount),
      memo: row.share.doctorName,
    }))

  let lines
  if (input.kind === "patient_payment") {
    lines = [tillLine(tillCents, 0), ...payableLines(false)]
  } else if (input.kind === "patient_refund") {
    lines = [...payableLines(true), tillLine(0, tillCents)]
  } else if (input.kind === "doctor_payment" || input.kind === "doctor_payment_cancel") {
    const whtAccount = whtCents > 0 ? await getOrCreateWhtPayableAccount() : null
    if (whtAccount && !whtAccount.success) {
      return { success: false, message: whtAccount.error }
    }
    const payingDoctor = input.kind === "doctor_payment"
    const whtLine =
      whtAccount && whtAccount.success
        ? [
            {
              accountId: whtAccount.account.id,
              debitAmount: payingDoctor ? 0 : whtCents,
              creditAmount: payingDoctor ? whtCents : 0,
              memo: "WHT",
            },
          ]
        : []
    lines = payingDoctor
      ? [...payableLines(true), tillLine(0, netCents), ...whtLine]
      : [tillLine(netCents, 0), ...whtLine, ...payableLines(false)]
  } else {
    return { success: false, message: "Unknown DPAY journal kind." }
  }

  const referenceType = input.kind.startsWith("doctor_") ? "DpayDoctorPayment" : "DpayReceipt"
  if (referenceId) {
    const existing = await prisma.journal.findFirst({
      where: {
        referenceType,
        referenceId,
        description,
        createdAt: { gte: new Date(Date.now() - 45_000) },
      },
      select: { id: true },
    })
    if (existing) return { success: true, journalId: existing.id }
  }

  const posted = await createJournalEntry({
    date: new Date(),
    description,
    referenceType,
    referenceId,
    locationId: shift.locationId,
    createdBy: userId,
    lines,
  })
  if (!posted.success) return { success: false, message: posted.error }
  return { success: true, journalId: posted.journalId }
}
