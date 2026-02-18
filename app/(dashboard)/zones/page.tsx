import React, { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SearchInput } from "@/components/common/search"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { zoneColumns } from "./columns"
import { bulkDeleteZones, getAllZones, getZonesExport } from "@/app/actions/zone.actions"
import Loading from "../loading"
import Link from "next/link"
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"
import { ExportWrapper } from "../export-wrapper"
import { BulkDeleteButton } from "@/components/common/custom-data-table"

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

    const handleExport = async () => {
        'use server';

        const zoneListResponse = await getZonesExport({
            keyword: resolvedSearchParams?.keyword
        });

        if (!zoneListResponse.success || !zoneListResponse.data?.length) {
            return {
                success: false,
                message: zoneListResponse.success
                    ? 'No zones found'
                    : zoneListResponse.message
            };
        }

        const mappedZones = zoneListResponse.data.map((z: any) => ({
            name: z.name || '-',
            location: z.location?.name || '-',
            description: z.description || '-'
        }));

        return {
            success: true,
            data: mappedZones
        };
    };

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
                        <div className="flex flex-col gap-3 flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row gap-3 items-start">
                                <div className="relative w-full sm:max-w-sm">
                                    <SearchInput
                                        name="keyword"
                                        placeholder="Search by name, description"
                                        className="pl-8 w-full h-9"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center">
                                <ExportWrapper
                                    serverData={handleExport}
                                    columns={['Zone Name', 'Location', 'Description']}
                                    keys={['name', 'location', 'description']}
                                    title="Zones List"
                                    fileName="zones"
                                />
                            </div>
                        </div>
                    }
                    toolbarRight={
                        <div className="flex items-start gap-2 shrink-0">
                            <BulkDeleteButton />
                            <Link href="/zones/add">
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
