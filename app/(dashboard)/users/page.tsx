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
import { redirect } from "next/navigation"

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

    const resolvedSearchParams = await searchParams;
    const session = await fetchServerSession()

    const { data, totalRecords } = await getAllUsers({
        page: resolvedSearchParams?.page,
        limit: resolvedSearchParams?.limit,
        keyword: resolvedSearchParams?.keyword,
        userType: session?.user?.userType?.toString()
    })

    const { data: userGroupOptions } = await getAllUserGroupsOptions()


    return (
        <>
            <div className="flex items-center ">
                <div className="ml-auto flex items-center gap-4">
                    <div className="lg:block hidden relative flex-1 md:grow-0">
                        <SearchInput
                            name="keyword"
                            placeholder={"Search by name, email"}
                            className={"rounded-lg bg-background pl-8 w-full sm:w-auto"}
                        />
                    </div>
                    <AddBtn
                        dialogTitle="New User"
                    >
                        <UserForm 
                            user={null} 
                            sessionUserType={session?.user?.userType}
                            userGroupOptions={userGroupOptions.map(ug => ({ id: ug.id, name: ug.name }))}
                        />
                    </AddBtn>
                </div>
            </div>
            <div className="lg:hidden mt-2 relative flex-1 md:grow-0">
                <SearchInput
                    name="keyword"
                    placeholder={"Search by name, email"}
                    className={"rounded-lg bg-background pl-8 w-full"}
                />
            </div>
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
                    />
                </Suspense>
            </div>
        </>
    )
}

