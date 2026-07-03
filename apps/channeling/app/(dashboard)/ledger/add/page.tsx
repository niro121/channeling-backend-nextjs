import React from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { checkRouteAccess, checkPermission } from "@/lib/server-permissions"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { getReferenceData } from "@/app/actions/reference/get-reference-data.action"
import { getBanksForChannelBooking } from "@/app/actions/channel-booking/get-banks.action"
import { getActiveBankAccountOptionsForLedger } from "@/app/actions/bank-account.actions"
import { LedgerTransactionForm } from "../ledger-transaction-form"
import { BackButton } from "@/components/common/back-button"

export default async function LedgerAddPage() {
  const canView = await checkRouteAccess("/ledger")
  if (!canView) {
    redirect("/unauthorized-access")
  }
  const canAdd = await checkPermission("ledger", "add")
  if (!canAdd) {
    redirect("/unauthorized-access")
  }

  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? null
  let userLocationId: string | null = null
  let userLocationName: string | null = null
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userLocationId: true, userLocation: { select: { name: true } } },
    })
    userLocationId = user?.userLocationId ?? null
    userLocationName = user?.userLocation?.name ?? null
  }

  const [refRes, banksRes, bankAccountsRes] = await Promise.all([
    getReferenceData({ locations: true, agencies: true }),
    getBanksForChannelBooking(),
    getActiveBankAccountOptionsForLedger(),
  ])

  const locations = refRes.success && refRes.locations ? refRes.locations : []
  const agencies = refRes.success && refRes.agencies ? refRes.agencies : []

  const banks =
    banksRes.success && banksRes.data
      ? banksRes.data.map((b) => ({ id: b.id, name: b.name }))
      : []
  const bankAccounts = bankAccountsRes.success && bankAccountsRes.data ? bankAccountsRes.data : []

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Add Ledger Transaction</h2>
        <BackButton href="/ledger" />
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <LedgerTransactionForm
          locations={locations}
          agencies={agencies}
          banks={banks}
          bankAccounts={bankAccounts}
          userLocationId={userLocationId}
          userLocationName={userLocationName}
        />
      </div>
    </div>
  )
}
