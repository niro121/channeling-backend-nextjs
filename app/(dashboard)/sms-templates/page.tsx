import React, { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SearchInput } from "@/components/common/search"
import { CustomDataTable } from "@/components/common/custom-data-table"
import Loading from "../loading"
import Link from "next/link"
import {
  getAllSmsTemplates,
  bulkDeleteSmsTemplates,
} from "@/app/actions/sms-template.actions"
import { SmsTemplateColumns } from "./columns"
import FilterSection from "./filter-section"
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"
import { BulkDeleteButton } from "@/components/common/custom-data-table"

type SearchParams = {
  searchParams?: Promise<{
    page?: string
    limit?: string
    keyword?: string
    type?: string
    status?: string
  }>
}

export default async function Page({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess("/sms-templates")
  if (!canView) {
    redirect("/unauthorized-access")
  }

  const params = await searchParams

  const { data, totalRecords } = await getAllSmsTemplates({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
    type: params?.type,
    status: params?.status,
  })

  async function bulkDeleteAction(ids: string[]) {
    "use server"
    const result = await bulkDeleteSmsTemplates(ids)
    return result.success
  }

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="SMS Templates"
          subHeading="Manage SMS message templates for channel booking and notifications."
          columns={SmsTemplateColumns}
          data={data}
          rowCount={totalRecords}
          deleteServerAction={bulkDeleteAction}
          page={params?.page}
          toolbarLeft={
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div className="relative w-full sm:max-w-sm">
                  <SearchInput
                    name="keyword"
                    placeholder="Search by name or message"
                    className="pl-8 w-full h-9"
                  />
                </div>
                <FilterSection
                  typeId={params?.type}
                  statusFilter={params?.status}
                />
              </div>
            </div>
          }
          toolbarRight={
            <div className="flex items-start gap-2 shrink-0">
              <BulkDeleteButton />
              <Link href="/sms-templates/add">
                <Button size="sm" className="gap-1.5 h-9 cursor-pointer">
                  <Plus className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Add New
                  </span>
                </Button>
              </Link>
            </div>
          }
        />
      </Suspense>
    </div>
  )
}
