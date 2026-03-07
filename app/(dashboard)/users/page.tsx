import React, { Suspense } from "react"
import { AddBtn } from "@/components/common/add-btn"
import { SearchInput } from "@/components/common/search"
import UserForm from "./user-form"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { userColumns } from "./columns"
import { bulkDeleteUsers, getAllUsers } from "@/app/actions/user.actions"
import { fetchServerSession } from "@/lib/session"
import Loading from "../loading"
import { getAllUserGroupsOptions } from "@/app/actions/user-group.actions"
import { checkRouteAccess } from "@/lib/server-permissions"
import { logActivity } from "@/lib/activity-log"
import { redirect } from "next/navigation"
import { UsersExport } from "./users-export"
import { BulkDeleteButton } from "@/components/common/custom-data-table"

type SearchParams = {
    searchParams?: Promise<{
        page?: string;
        limit?: string;
        keyword?: string;
    }>
}

export default async function Page({ searchParams }: SearchParams) {
    // Check if user can view users
    const canView = await checkRouteAccess("/users")
    if (!canView) {
        redirect("/unauthorized-access")
    }
    const session = await fetchServerSession()
    if (session?.user?.id) {
        await logActivity({
            userId: session.user.id,
            action: "users.visited",
            entityType: "Users",
            importance: "low",
        })
    }

    const resolvedSearchParams = await searchParams;

    const { data, totalRecords } = await getAllUsers({
        page: resolvedSearchParams?.page,
        limit: resolvedSearchParams?.limit,
        keyword: resolvedSearchParams?.keyword,
        userType: session?.user?.userType?.toString()
    })

    const { data: userGroupOptions } = await getAllUserGroupsOptions()

    return (
        <div className="overflow-hidden">
            <Suspense fallback={<Loading />}>
                <CustomDataTable
                    heading="Users"
                    subHeading="Manage your users here."
                    columns={userColumns}
                    data={data}
                    rowCount={totalRecords}
                    deleteServerAction={bulkDeleteUsers}
                    page={resolvedSearchParams?.page}
                    toolbarLeft={
                        <div className="flex flex-col gap-3 flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row gap-3 items-start">
                                <div className="relative w-full sm:max-w-sm">
                                    <SearchInput
                                        name="keyword"
                                        placeholder="Search by name, email"
                                        className="pl-8 w-full h-9"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center">
                                <UsersExport keyword={resolvedSearchParams?.keyword} />
                            </div>
                        </div>
                    }
                    toolbarRight={
                        <div className="flex items-start gap-2 shrink-0">
                            <BulkDeleteButton />
                            <AddBtn dialogTitle="New User">
                                <UserForm
                                    user={null}
                                    sessionUserType={session?.user?.userType}
                                    userGroupOptions={userGroupOptions.map((ug) => ({ id: ug.id, name: ug.name }))}
                                />
                            </AddBtn>
                        </div>
                    }
                    hideAutoBulkDelete={true}
                />
            </Suspense>
        </div>
    )
}

