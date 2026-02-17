import React, { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SearchInput } from "@/components/common/search"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { staffColumns } from "./columns"
import { getStaffAction, bulkDeleteStaffAction } from "@/app/actions/staff.actions"
import Loading from "../loading"
import Link from "next/link"
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"

type SearchParams = {
  searchParams?: Promise<{
    page?: string
    limit?: string
    keyword?: string
  }>
}

export default async function StaffPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess("/staff")
  if (!canView) {
    redirect("/unauthorized-access")
  }

  const resolvedSearchParams = await searchParams
  const response = await getStaffAction({
    page: resolvedSearchParams?.page,
    limit: resolvedSearchParams?.limit,
    keyword: resolvedSearchParams?.keyword,
  })

  const data = response.data?.data ?? []
  const totalRecords = response.data?.totalRecords ?? 0

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="Staff"
          subHeading="Manage your staff here."
          columns={staffColumns}
          data={data}
          rowCount={totalRecords}
          deleteServerAction={bulkDeleteStaffAction}
          page={resolvedSearchParams?.page}
          toolbarLeft={
            <div className="relative w-full sm:max-w-sm">
              <SearchInput
                name="keyword"
                placeholder="Search by name, code, NIC, contact"
                className="pl-8 w-full h-9"
              />
            </div>
          }
          toolbarRight={
            <Link href="/staff/add">
              <Button size="sm" className="gap-1.5 h-9">
                <Plus className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add New
                </span>
              </Button>
            </Link>
          }
        />
      </Suspense>
    </div>
  )
}
