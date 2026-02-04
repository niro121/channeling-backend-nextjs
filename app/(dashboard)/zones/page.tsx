import React, { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SearchInput } from "@/components/common/search"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { zoneColumns } from "./columns"
import { bulkDeleteZones, getAllZones } from "@/app/actions/zone.actions"
import Loading from "../loading"
import Link from "next/link"
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"

type SearchParams = {
    searchParams?: Promise<{
        page?: string;
        limit?: string;
        keyword?: string;
    }>
}

export default async function Page({ searchParams }: SearchParams) {
    // Check if user can view zones
    const canView = await checkRouteAccess("/zones")
    if (!canView) {
        redirect("/unauthorized-access")
    }

    const resolvedSearchParams = await searchParams;

    const { data, totalRecords } = await getAllZones({
        page: resolvedSearchParams?.page,
        limit: resolvedSearchParams?.limit,
        keyword: resolvedSearchParams?.keyword,
    })

    return (
        <div className="overflow-hidden">
            <Suspense fallback={<Loading />}>
                <CustomDataTable
                    heading="Zones"
                    subHeading="Manage your zones here."
                    columns={zoneColumns}
                    data={data}
                    rowCount={totalRecords}
                    deleteServerAction={bulkDeleteZones}
                    page={resolvedSearchParams?.page}
                    toolbarLeft={
                        <div className="relative w-full sm:max-w-sm">
                            <SearchInput
                                name="keyword"
                                placeholder="Search by name, description"
                                className="pl-8 w-full h-9"
                            />
                        </div>
                    }
                    toolbarRight={
                        <Link href="/zones/add">
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
