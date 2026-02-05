import React, { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SearchInput } from "@/components/common/search"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { userGroupColumns } from "./columns"
import { bulkDeleteUserGroups, getAllUserGroups } from "@/app/actions/user-group.actions"
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

    const { data, totalRecords } = await getAllUserGroups({
        page: resolvedSearchParams?.page,
        limit: resolvedSearchParams?.limit,
        keyword: resolvedSearchParams?.keyword,
    })

    // Check if user can add user groups
    const canAdd = await checkPermission("users", "add")

    return (
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
                        canAdd ? (
                            <Link href="/user-groups/add">
                                <Button size="sm" className="gap-1.5 h-9">
                                    <Plus className="h-4 w-4" />
                                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                        Add New
                                    </span>
                                </Button>
                            </Link>
                        ) : null
                    }
                />
            </Suspense>
        </div>
    )
}
