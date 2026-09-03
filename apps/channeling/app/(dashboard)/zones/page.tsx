import React, { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SearchInput } from "@/components/common/search"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { zoneColumns } from "./columns"
import { bulkDeleteZones, getAllZones, getZonesExport, checkZonesHaveLinkedRecords } from "@/app/actions/zone.actions"
import Loading from "../loading"
import Link from "next/link"
import { checkRouteAccess } from "@/lib/server-permissions"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { redirect } from "next/navigation"
import { ExportWrapper } from "../export-wrapper"
import { BulkDeleteButton } from "@/components/common/custom-data-table"
import ZoneFilterSection from "./filter-section"
import { getAllLocations } from "@/app/actions/location.action"

type SearchParams = {
    searchParams?: Promise<{
        page?: string;
        limit?: string;
        keyword?: string;
        locationId?: string;
    }>
}

export default async function Page({ searchParams }: SearchParams) {
    // Check if user can view zones
    const canView = await checkRouteAccess("/zones")
    if (!canView) {
        redirect("/unauthorized-access")
    }
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
        logActivityNonBlocking({
            userId: session.user.id,
            action: "zones.visited",
            entityType: "Zones",
            importance: "low",
        })
    }

    const resolvedSearchParams = await searchParams;

    const [zonesResponse, locationsResponse] = await Promise.all([
        getAllZones({
            page: resolvedSearchParams?.page,
            limit: resolvedSearchParams?.limit,
            keyword: resolvedSearchParams?.keyword,
            locationId: resolvedSearchParams?.locationId,
        }),
        getAllLocations({ page: "0", limit: "1000", publishedOnly: true }),
    ]);

    const { data, totalRecords } = zonesResponse;
    const locationOptions = (locationsResponse.data ?? []).map((loc) => ({
        id: loc.id ?? "",
        name: loc.name ?? "",
    })).filter((loc) => loc.id);

    const handleExport = async () => {
        'use server';

        const zoneListResponse = await getZonesExport({
            keyword: resolvedSearchParams?.keyword,
            locationId: resolvedSearchParams?.locationId,
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

    const getBulkDeleteDescription = async (ids: string[]): Promise<string> => {
        'use server';
        
        try {
            const result = await checkZonesHaveLinkedRecords(ids);
            
            if (result.success && result.data) {
                const { hasLinkedRecords } = result.data;
                
                if (hasLinkedRecords) {
                    return "One or more selected zones are currently linked to other system records. Deleting them may affect related data and existing associations.\n\nAre you sure you want to continue?";
                }
            }
            
            // Default message if no linked records
            return "This action cannot be undone. This will permanently delete these records and remove the data from our servers.";
        } catch (error: any) {
            console.error('Error getting bulk delete description:', error);
            return "This action cannot be undone. This will permanently delete these records and remove the data from our servers.";
        }
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
                    getBulkDeleteDescription={getBulkDeleteDescription}
                    page={resolvedSearchParams?.page}
                    toolbarLeft={
                        <div className="flex flex-col gap-3 flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row gap-3 items-start">
                                <div className="relative w-full sm:max-w-sm">
                                    <SearchInput
                                        name="keyword"
                                        placeholder="Search by name"
                                        className="pl-8 w-full h-9"
                                    />
                                </div>
                                <ZoneFilterSection
                                    locationOptions={locationOptions}
                                    locationId={resolvedSearchParams?.locationId}
                                />
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
