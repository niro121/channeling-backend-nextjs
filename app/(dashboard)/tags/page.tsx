import React, { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SearchInput } from "@/components/common/search"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { tagColumns } from "./columns"
import { bulkDeleteTags, getAllTags, getTagsExport } from "@/app/actions/tag.actions"
import Loading from "../loading"
import Link from "next/link"
import FilterSection from "./filter-section"
import { ExportWrapper } from "../export-wrapper"
import { checkRouteAccess } from "@/lib/server-permissions"
import { logActivity } from "@/lib/activity-log"
import { redirect } from "next/navigation"
import { TAG_TYPES } from "@/types/tag"

type SearchParams = {
    searchParams?: Promise<{
        page?: string;
        limit?: string;
        keyword?: string;
        type?: string;
    }>
}

export default async function Page({ searchParams }: SearchParams) {
    const canView = await checkRouteAccess("/tags")
    if (!canView) {
        redirect("/unauthorized-access")
    }
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
        await logActivity({
            userId: session.user.id,
            action: "tags.visited",
            entityType: "Tags",
            importance: "low",
        })
    }

    const resolvedSearchParams = await searchParams;

    const { data, totalRecords } = await getAllTags({
        page: resolvedSearchParams?.page,
        limit: resolvedSearchParams?.limit,
        keyword: resolvedSearchParams?.keyword,
        type: resolvedSearchParams?.type,
    })

    // Align with old system / migrate: 0=City, 1=Staff Category, 2=Staff Designation, 3=Staff Grade, 4=Bank
    const tagTypeOptions = [
        { id: "0", name: "City" },
        { id: "1", name: "Staff Category" },
        { id: "2", name: "Staff Designation" },
        { id: "3", name: "Staff Grade" },
        { id: "4", name: "Bank" },
    ];

    const handleExport = async () => {
        'use server';

        const tagListResponse = await getTagsExport({
            keyword: resolvedSearchParams?.keyword,
            type: resolvedSearchParams?.type
        });

        if (!tagListResponse.success || !tagListResponse.data?.length) {
            return {
                success: false,
                message: tagListResponse.success
                    ? 'No tags found'
                    : tagListResponse.message
            };
        }

        // Use same TAG_TYPES as list view; coerce type to number for lookup (handles serialized string)
        const mappedTags = tagListResponse.data.map((t) => {
            const typeNum = t.type != null ? Number(t.type) : NaN;
            const typeLabel = !Number.isNaN(typeNum) && typeNum >= 0 && typeNum <= 4 ? TAG_TYPES[typeNum] ?? 'Unknown' : '-';
            return {
                name: t.name || '-',
                type: typeLabel,
                status: t.status === 1 ? 'Published' : 'Unpublished'
            };
        });

        return {
            success: true,
            data: mappedTags
        };
    };

    return (
        <div className="overflow-hidden">
            <Suspense fallback={<Loading />}>
                <CustomDataTable
                    heading="Tags"
                    subHeading="Manage your tags here."
                    columns={tagColumns}
                    data={data}
                    rowCount={totalRecords}
                    deleteServerAction={bulkDeleteTags}
                    page={resolvedSearchParams?.page}
                    limit={resolvedSearchParams?.limit}
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
                                <FilterSection
                                    tagTypeOptions={tagTypeOptions}
                                    typeId={resolvedSearchParams?.type}
                                />
                            </div>
                            <div className="flex items-center">
                                <ExportWrapper
                                    serverData={handleExport}
                                    columns={['Name', 'Type']}
                                    keys={['name', 'type',]}
                                    title="Tags List"
                                    fileName="tags"
                                />
                            </div>
                        </div>
                    }
                    toolbarRight={
                        <div className="flex items-center gap-2 shrink-0">
                            <Link href="/tags/add">
                                <Button size="sm" className="gap-1.5 h-9">
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
