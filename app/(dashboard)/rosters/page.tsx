import React, { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "@/components/icons"
import { SearchInput } from "@/components/common/search"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { rosterColumns } from "./columns"
import { bulkDeleteRosters, getAllRosters } from "@/app/actions/roster.actions"
import Loading from "../loading"
import Link from "next/link"

type SearchParams = {
    searchParams?: Promise<{
        page?: string;
        limit?: string;
        keyword?: string;
    }>
}

export default async function Page({ searchParams }: SearchParams) {

    const resolvedSearchParams = await searchParams;

    const { data, totalRecords } = await getAllRosters({
        page: resolvedSearchParams?.page,
        limit: resolvedSearchParams?.limit,
        keyword: resolvedSearchParams?.keyword,
    })


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
                    <Link href="/rosters/add">
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
            <div className="lg:hidden mt-2 relative flex-1 md:grow-0">
                <SearchInput
                    name="keyword"
                    placeholder={"Search by name"}
                    className={"rounded-lg bg-background pl-8 w-full"}
                />
            </div>
            <div className="overflow-hidden">
                <Suspense fallback={<Loading />}>
                    <CustomDataTable
                        heading="Rosters"
                        subHeading="Manage your rosters here."
                        columns={rosterColumns}
                        data={data}
                        rowCount={totalRecords}
                        deleteServerAction={bulkDeleteRosters}
                        page={resolvedSearchParams?.page}
                    />
                </Suspense>
            </div>
        </>
    )
}
