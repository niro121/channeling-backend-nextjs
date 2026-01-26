import React, { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "@/components/icons"
import { SearchInput } from "@/components/common/search"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { userGroupColumns } from "./columns"
import { bulkDeleteUserGroups, getAllUserGroups } from "@/app/actions/user-group.actions"
import { fetchServerSession } from "@/lib/session"
import Loading from "../loading"
import Link from "next/link"
import { checkRouteAccess, checkPermission } from "@/lib/server-permissions"
import { redirect } from "next/navigation"

type SearchParams = {
    searchParams?: Promise<{
        page?: string;
        limit?: string;
        keyword?: string;
    }>
}

export default async function Page({ searchParams }: SearchParams) {
    // Check if user can view user groups
    const canView = await checkRouteAccess("/user-groups")
    if (!canView) {
        redirect("/unauthorized-access")
    }

    const resolvedSearchParams = await searchParams;
    const session = await fetchServerSession()

    const { data, totalRecords } = await getAllUserGroups({
        page: resolvedSearchParams?.page,
        limit: resolvedSearchParams?.limit,
        keyword: resolvedSearchParams?.keyword,
    })

    // Check if user can add user groups
    const canAdd = await checkPermission("users", "add")

    return (
        <>
            <div className="flex items-center ">
                <div className="ml-auto flex items-center gap-4">
                    <div className="lg:block hidden relative flex-1 md:grow-0">
                        <SearchInput
                            name="keyword"
                            placeholder={"Search by name, description"}
                            className={"rounded-lg bg-background pl-8 w-full sm:w-auto"}
                        />
                    </div>
                    {canAdd && (
                        <Link href="/user-groups/add">
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
                    )}
                </div>
            </div>
            <div className="lg:hidden mt-2 relative flex-1 md:grow-0">
                <SearchInput
                    name="keyword"
                    placeholder={"Search by name, description"}
                    className={"rounded-lg bg-background pl-8 w-full"}
                />
            </div>
            <div className="overflow-hidden">
                <Suspense fallback={<Loading />}>
                    <CustomDataTable
                        heading="User Groups"
                        subHeading="Manage your user groups here."
                        columns={userGroupColumns}
                        data={data}
                        rowCount={totalRecords}
                        deleteServerAction={bulkDeleteUserGroups}
                        page={resolvedSearchParams?.page}
                    />
                </Suspense>
            </div>
        </>
    )
}
