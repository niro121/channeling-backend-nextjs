"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { userTypes } from "@/lib/roles"
import { runSeedReceiptTemplates } from "@/services/seed/seed-receipt-templates.service"
import { runSeedAccountingAccounts } from "@/services/seed/seed-accounting-accounts.service"
import { runEraseBookingsReceipts } from "@/services/seed/erase-bookings-receipts.service"

export type SeedReceiptTemplatesActionResult =
  | { success: true; message: string; details: string }
  | { success: false; message: string }

export type SeedAccountingAccountsActionResult =
  | { success: true; message: string; details: string }
  | { success: false; message: string }

export type EraseBookingsReceiptsActionResult =
  | { success: true; message: string; details: string }
  | { success: false; message: string }

/** Admin only. Runs receipt templates seed (removes all, then creates defaults). */
export async function seedReceiptTemplatesAction(): Promise<SeedReceiptTemplatesActionResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false, message: "Not authenticated." }
  }
  const userType = (session.user as { userType?: number }).userType
  if (userType !== userTypes.admin) {
    return { success: false, message: "Admin access required." }
  }
  return runSeedReceiptTemplates()
}

/** Admin only. Runs accounting accounts seed (removes all accounting data, then creates accounts + syncs sequences). */
export async function seedAccountingAccountsAction(
  doctorCode?: string | null
): Promise<SeedAccountingAccountsActionResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false, message: "Not authenticated." }
  }
  const userType = (session.user as { userType?: number }).userType
  if (userType !== userTypes.admin) {
    return { success: false, message: "Admin access required." }
  }
  return runSeedAccountingAccounts(doctorCode?.trim() || null)
}

/** Admin only. Erases all bookings, receipts, resets session appointment numbers and booking/receipt sequences. */
export async function seedEraseBookingsReceiptsAction(): Promise<EraseBookingsReceiptsActionResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false, message: "Not authenticated." }
  }
  const userType = (session.user as { userType?: number }).userType
  if (userType !== userTypes.admin) {
    return { success: false, message: "Admin access required." }
  }
  return runEraseBookingsReceipts()
}
