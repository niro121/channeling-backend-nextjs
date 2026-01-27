import React, { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "@/components/icons"
import { SearchInput } from "@/components/common/search"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { patientColumns } from "./columns"
import { getPatientsAction, bulkDeletePatientsAction } from "@/app/actions/patient.actions"
import Loading from "../loading"
import Link from "next/link"
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
    // Check if user can view patients
    const canView = await checkRouteAccess("/patients")
    if (!canView) {
        redirect("/unauthorized-access")
    }

    const resolvedSearchParams = await searchParams;

    const response = await getPatientsAction({
        page: resolvedSearchParams?.page,
        limit: resolvedSearchParams?.limit,
        keyword: resolvedSearchParams?.keyword,
    })

    const data = response.data?.data || []
    const totalRecords = response.data?.totalRecords || 0

    return (
        <>
            <div className="flex items-center ">
                <div className="ml-auto flex items-center gap-4">
                    <div className="lg:block hidden relative flex-1 md:grow-0">
                        <SearchInput
                            name="keyword"
                            placeholder={"Search by name, phone, code"}
                            className={"rounded-lg bg-background pl-8 w-full sm:w-auto"}
                        />
                    </div>
                    <Link href="/patients/add">
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
                    placeholder={"Search by name, phone, code"}
                    className={"rounded-lg bg-background pl-8 w-full"}
                />
            </div>
            <div className="overflow-hidden">
                <Suspense fallback={<Loading />}>
                    <CustomDataTable
                        heading="Patients"
                        subHeading="Manage your patients here."
                        columns={patientColumns}
                        data={data}
                        rowCount={totalRecords}
                        deleteServerAction={bulkDeletePatientsAction}
                        page={resolvedSearchParams?.page}
                    />
                </Suspense>
            </div>
        </>
    )
}
