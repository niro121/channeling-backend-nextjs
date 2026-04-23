import React, { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { checkRouteAccess, checkPermission } from "@/lib/server-permissions"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { redirect } from "next/navigation"
import Loading from "../loading"
import { LedgerTableClient } from "./ledger-table-client"
import { getLedgerTransactions } from "@/app/actions/ledger/list-ledger-transactions.action"
import { getReferenceData } from "@/app/actions/reference/get-reference-data.action"
import { getBanksForChannelBooking } from "@/app/actions/channel-booking/get-banks.action"
import { getActiveBankAccountOptionsForLedger } from "@/app/actions/bank-account.actions"

type SearchParams = {
  searchParams?: Promise<{
    page?: string
    limit?: string
    keyword?: string
    branchId?: string
    agencyId?: string
    method?: string
  }>
}

export default async function LedgerPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess("/ledger")
  if (!canView) {
    redirect("/unauthorized-access")
  }

  const params = await searchParams

  const canAdd = await checkPermission("ledger", "add")
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
  if (userId) {
    logActivityNonBlocking({
      userId,
      action: "ledger.visited",
      entityType: "Ledger",
      importance: "low",
    })
  }

  const [listResult, refRes, banksRes, bankAccountsRes] = await Promise.all([
    getLedgerTransactions({
      page: params?.page,
      limit: params?.limit,
      keyword: params?.keyword ?? null,
      branchId: params?.branchId ?? null,
      agencyId: params?.agencyId ?? null,
      method: params?.method ?? null,
    }),
    getReferenceData({ locations: true, agencies: true }),
    getBanksForChannelBooking(),
    getActiveBankAccountOptionsForLedger(),
  ])

  const data = listResult.success ? listResult.data : []
  const totalRecords = listResult.success ? listResult.totalRecords : 0
  const locations = refRes.success && refRes.locations ? refRes.locations : []
  const agencies = refRes.success && refRes.agencies ? refRes.agencies : []
  const banks =
    banksRes.success && banksRes.data
      ? banksRes.data.map((b) => ({ id: b.id, name: b.name }))
      : []
  const bankAccounts = bankAccountsRes.success && bankAccountsRes.data ? bankAccountsRes.data : []

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <LedgerTableClient
          data={data}
          totalRecords={totalRecords}
          canAdd={canAdd}
          page={params?.page}
          limit={params?.limit}
          branchId={params?.branchId}
          agencyId={params?.agencyId}
          method={params?.method}
          locations={locations}
          agencies={agencies}
          banks={banks}
          bankAccounts={bankAccounts}
          userLocationId={userLocationId}
          userLocationName={userLocationName}
        />
      </Suspense>
    </div>
  )
}
