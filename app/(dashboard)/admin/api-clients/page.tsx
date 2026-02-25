import React, { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, Play } from "lucide-react"
import { SearchInput } from "@/components/common/search"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { ApiClientColumns } from "./columns"
import { getApiClients } from "@/app/actions/api-client.actions"
import Loading from "../../loading"
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"

type SearchParams = {
  searchParams?: Promise<{ page?: string; limit?: string; keyword?: string }>
}

export default async function AdminApiClientsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess("/admin/api-clients")
  if (!canView) {
    redirect("/unauthorized-access")
  }

  const params = await searchParams
  const { data, totalRecords } = await getApiClients({
    page: params?.page,
    limit: params?.limit,
    keyword: params?.keyword,
  })

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <CustomDataTable
          heading="API Clients"
          subHeading="Register and manage applications that use the public API. Create a client to get client_id and client_secret (shown once)."
          columns={ApiClientColumns}
          data={data}
          rowCount={totalRecords}
          haveBulkDelete={false}
          page={params?.page}
          toolbarLeft={
            <div className="relative w-full sm:max-w-sm">
              <SearchInput
                name="keyword"
                placeholder="Search by name"
                className="pl-8 w-full h-9"
              />
            </div>
          }
          toolbarRight={
            <div className="flex items-center gap-2">
              <Link href="/admin/api-clients/playground">
                <Button size="sm" variant="outline" className="gap-1.5 h-9">
                  <Play className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Test API</span>
                </Button>
              </Link>
              <Link href="/admin/api-clients/add">
                <Button size="sm" className="gap-1.5 h-9">
                  <Plus className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add New</span>
                </Button>
              </Link>
            </div>
          }
        />
      </Suspense>
    </div>
  )
}
