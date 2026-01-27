import React, { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "@/components/icons"
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
    // Check if user can view tags
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

    // ==== TAG TYPE OPTIONS ==== //
    const tagTypeOptions = [
        { id: "1", name: "Area" },
        { id: "2", name: "Bank" },
        { id: "3", name: "Staff Category" },
        { id: "4", name: "Staff Designation" },
        { id: "5", name: "Staff Grade" },
    ];

    // ==== EXPORT: GET TAG LIST ==== //
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
        <>
            <div className="flex items-center ">
                <div className="ml-auto flex items-center gap-4">
                    <div className="lg:block hidden relative flex-1 md:grow-0">
                        <SearchInput
                            name="keyword"
                            placeholder={"Search by name"}
                            className={"rounded-lg bg-background pl-8 w-full sm:w-auto"}
                        />
                    </div>
                    <Link href="/tags/add">
                        <Button
                            size="sm"
                            className="gap-1 px-8 text-white transition-colors ease-in-out duration-100 hover:text-black"
                        >
                            <PlusCircle />
                            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                Add New
                            </span>
                        </Button>
                    </Link>
                </div>
            </div>
            <div className="mt-2 flex flex-col lg:flex-row gap-3 items-start">
                <div className="lg:hidden relative flex-1 md:grow-0">
                    <SearchInput
                        name="keyword"
                        placeholder={"Search by name"}
                        className={"rounded-lg bg-background pl-8 w-full"}
                    />
                </div>
                <FilterSection
                    tagTypeOptions={tagTypeOptions}
                    typeId={resolvedSearchParams?.type}
                />
                <div className="flex items-center gap-2 ml-auto">
                    <ExportWrapper
                        serverData={handleExport}
                        columns={['Name', 'Type', 'Status']}
                        keys={['name', 'type', 'status']}
                        title="Tags List"
                        fileName="tags"
                    />
                </div>
            </div>
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
                    />
                </Suspense>
            </div>
        </>
    )
}
