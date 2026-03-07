import React, { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SearchInput } from "@/components/common/search"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { staffColumns } from "./columns"
import { getStaffAction, bulkDeleteStaffAction, getStaffExport } from "@/app/actions/staff.actions"
import Loading from "../loading"
import Link from "next/link"
import { checkRouteAccess } from "@/lib/server-permissions"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { redirect } from "next/navigation"
import { ExportWrapper } from "../export-wrapper"
import { BulkDeleteButton } from "@/components/common/custom-data-table"

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
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: "staff.visited",
      entityType: "Staff",
      importance: "low",
    })
  }

  const resolvedSearchParams = await searchParams
  const response = await getStaffAction({
    page: resolvedSearchParams?.page,
    limit: resolvedSearchParams?.limit,
    keyword: resolvedSearchParams?.keyword,
  })

  const data = response.data?.data ?? []
  const totalRecords = response.data?.totalRecords ?? 0

  const handleExport = async () => {
    'use server';

    const staffListResponse = await getStaffExport({
      keyword: resolvedSearchParams?.keyword
    });

    if (!staffListResponse.success || !staffListResponse.data?.length) {
      return {
        success: false,
        message: staffListResponse.success
          ? 'No staff found'
          : staffListResponse.message
      };
    }

    const mappedStaff = staffListResponse.data.map((s: any) => ({
      code: s.code || '-',
      name: `${s.title || ''} ${s.name || ''}`.trim() || '-',
      nic: s.nic || '-',
      contactMobile: s.contactMobile || '-'
    }));

    return {
      success: true,
      data: mappedStaff
    };
  };

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
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="relative w-full sm:max-w-sm">
                  <SearchInput
                    name="keyword"
                    placeholder="Search by name, code, NIC, contact"
                    className="pl-8 w-full h-9"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <ExportWrapper
                  serverData={handleExport}
                  columns={['Code', 'Name', 'NIC', 'Contact']}
                  keys={['code', 'name', 'nic', 'contactMobile']}
                  title="Staff List"
                  fileName="staff"
                />
              </div>
            </div>
          }
          toolbarRight={
            <div className="flex items-start gap-2 shrink-0">
              <BulkDeleteButton />
              <Link href="/staff/add">
                <Button size="sm" className="gap-1.5 h-9 cursor-pointer">
                  <Plus className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Add New
                  </span>
                </Button>
              </Link>
            </div>
          }
          hideAutoBulkDelete={true}
        />
      </Suspense>
    </div>
  )
}
