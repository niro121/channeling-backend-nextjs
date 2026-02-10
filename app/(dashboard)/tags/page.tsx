import React, { Suspense } from "react"
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
import { redirect } from "next/navigation"

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

    const resolvedSearchParams = await searchParams;

    const { data, totalRecords } = await getAllTags({
        page: resolvedSearchParams?.page,
        limit: resolvedSearchParams?.limit,
        keyword: resolvedSearchParams?.keyword,
        type: resolvedSearchParams?.type,
    })

    const tagTypeOptions = [
        { id: "1", name: "Area" },
        { id: "2", name: "Bank" },
        { id: "3", name: "Staff Category" },
        { id: "4", name: "Staff Designation" },
        { id: "5", name: "Staff Grade" },
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

        const TAG_TYPES: Record<number, string> = {
            1: 'Area',
            2: 'Bank',
            3: 'Staff Category',
            4: 'Staff Designation',
            5: 'Staff Grade'
        };

        const mappedTags = tagListResponse.data.map((t) => ({
            name: t.name || '-',
            type: t.type ? TAG_TYPES[t.type] || 'Unknown' : '-',
            status: t.status === 1 ? 'Active' : 'Inactive'
        }));

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
                        <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
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
                    }
                    toolbarRight={
                        <div className="flex items-center gap-2 shrink-0">
                            <ExportWrapper
                                serverData={handleExport}
                                columns={['Name', 'Type', 'Status']}
                                keys={['name', 'type', 'status']}
                                title="Tags List"
                                fileName="tags"
                            />
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
