import React, { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SearchInput } from "@/components/common/search"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { userGroupColumns } from "./columns"
import { bulkDeleteUserGroups, getAllUserGroups, getUserGroupsExport } from "@/app/actions/user-group.actions"
import Loading from "../loading"
import Link from "next/link"
import { checkRouteAccess, checkPermission } from "@/lib/server-permissions"
import { logActivityNonBlocking } from "@/lib/activity-log"
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
    // Check if user can view user groups
    const canView = await checkRouteAccess("/user-groups")
    if (!canView) {
        redirect("/unauthorized-access")
    }
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
        logActivityNonBlocking({
            userId: session.user.id,
            action: "user-groups.visited",
            entityType: "UserGroups",
            importance: "low",
        })
    }

    const resolvedSearchParams = await searchParams;

    const { data, totalRecords } = await getAllUserGroups({
        page: resolvedSearchParams?.page,
        limit: resolvedSearchParams?.limit,
        keyword: resolvedSearchParams?.keyword,
    })

    // Check if user can add user groups
    const canAdd = await checkPermission("users", "add")

    const handleExport = async () => {
        'use server';

        const userGroupListResponse = await getUserGroupsExport({
            keyword: resolvedSearchParams?.keyword
        });

        if (!userGroupListResponse.success || !userGroupListResponse.data?.length) {
            return {
                success: false,
                message: userGroupListResponse.success
                    ? 'No user groups found'
                    : userGroupListResponse.message
            };
        }

        const mappedUserGroups = userGroupListResponse.data.map((ug: any) => ({
            name: ug.name || '-',
            description: ug.description || '-'
        }));

        return {
            success: true,
            data: mappedUserGroups
        };
    };

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
                                    columns={['Group Name', 'Description']}
                                    keys={['name', 'description']}
                                    title="User Groups List"
                                    fileName="user-groups"
                                />
                            </div>
                        </div>
                    }
                    toolbarRight={
                        <div className="flex items-start gap-2 shrink-0">
                            <BulkDeleteButton />
                            {canAdd ? (
                                <Link href="/user-groups/add">
                                    <Button size="sm" className="gap-1.5 h-9 cursor-pointer">
                                        <Plus className="h-4 w-4" />
                                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                            Add New
                                        </span>
                                    </Button>
                                </Link>
                            ) : null}
                        </div>
                    }
                    hideAutoBulkDelete={true}
                />
            </Suspense>
        </div>
    )
}
