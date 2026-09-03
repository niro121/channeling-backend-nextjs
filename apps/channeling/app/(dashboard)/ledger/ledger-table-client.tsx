"use client"

import React from "react"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { SearchInput } from "@/components/common/search"
import { getLedgerColumns } from "./columns"
import LedgerFilterSection from "./filter-section"
import { LedgerToolbarWithAddDialog } from "./ledger-toolbar-with-add-dialog"
import type { LedgerReceiptListItem } from "@/services/ledger/list-ledger-receipts.service"
import type { ReferenceSelectOption } from "@/types/reference"

type LedgerTableClientProps = {
  data: LedgerReceiptListItem[]
  totalRecords: number
  canAdd: boolean
  canCancel: boolean
  page?: string
  limit?: string
  branchId?: string
  agencyId?: string
  method?: string
  locations: ReferenceSelectOption[]
  agencies: ReferenceSelectOption[]
  banks: Array<{ id: string; name: string }>
  bankAccounts: Array<{
    id: string
    name: string
    accountNumber: string
    locationId: string
    locationName: string
    locationCode: string
    glAccountId: string | null
    glAccountName: string | null
    glAccountCode: string | null
  }>
  userLocationId: string | null
  userLocationName: string | null
}

export function LedgerTableClient({
  data,
  totalRecords,
  canAdd,
  canCancel,
  page,
  limit,
  branchId,
  agencyId,
  method,
  locations,
  agencies,
  banks,
  bankAccounts,
  userLocationId,
  userLocationName,
}: LedgerTableClientProps) {
  return (
    <CustomDataTable
      heading="Ledger"
      subHeading="Branch income/expense and agency debit note, credit note, deposit, withdraw."
      columns={getLedgerColumns(canCancel)}
      data={data}
      rowCount={totalRecords}
      haveBulkDelete={false}
      page={page}
      limit={limit}
      toolbarLeft={
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:max-w-sm">
            <SearchInput
              name="keyword"
              placeholder="Search by receipt no or remarks"
              className="pl-8 w-full h-9"
            />
          </div>
          <LedgerFilterSection
            branchId={branchId}
            agencyId={agencyId}
            method={method}
            locations={locations}
            agencies={agencies}
          />
        </div>
      }
      toolbarRight={
        <LedgerToolbarWithAddDialog
          canAdd={canAdd}
          locations={locations}
          agencies={agencies}
          banks={banks}
          bankAccounts={bankAccounts}
          userLocationId={userLocationId}
          userLocationName={userLocationName}
        />
      }
    />
  )
}
