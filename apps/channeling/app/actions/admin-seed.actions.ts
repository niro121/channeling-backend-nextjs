"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { checkPermission } from "@/lib/server-permissions"
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

/** Runs receipt templates seed (removes all, then creates defaults). Requires Database Seeds view. */
export async function seedReceiptTemplatesAction(): Promise<SeedReceiptTemplatesActionResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false, message: "Not authenticated." }
  }
  const allowed = await checkPermission("database-seeds", "view")
  if (!allowed) {
    return { success: false, message: "You don't have permission to run database seeds." }
  }
  return runSeedReceiptTemplates()
}

/** Runs accounting accounts seed (removes all accounting data, then creates accounts + syncs sequences). Requires Database Seeds view. */
export async function seedAccountingAccountsAction(
  doctorCode?: string | null
): Promise<SeedAccountingAccountsActionResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false, message: "Not authenticated." }
  }
  const allowed = await checkPermission("database-seeds", "view")
  if (!allowed) {
    return { success: false, message: "You don't have permission to run database seeds." }
  }
  return runSeedAccountingAccounts(doctorCode?.trim() || null)
}

/** Erases all bookings, receipts, resets session appointment numbers and booking/receipt sequences. Requires Database Seeds view. */
export async function seedEraseBookingsReceiptsAction(): Promise<EraseBookingsReceiptsActionResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { success: false, message: "Not authenticated." }
  }
  const allowed = await checkPermission("database-seeds", "view")
  if (!allowed) {
    return { success: false, message: "You don't have permission to run database seeds." }
  }
  return runEraseBookingsReceipts()
}
