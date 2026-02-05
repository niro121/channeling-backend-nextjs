import React, { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
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
                    toolbarLeft={
                        <div className="relative w-full sm:max-w-sm">
                            <SearchInput
                                name="keyword"
                                placeholder="Search by name, phone, code"
                                className="pl-8 w-full h-9"
                            />
                        </div>
                    }
                    toolbarRight={
                        <Link href="/patients/add">
                            <Button size="sm" className="gap-1.5 h-9">
                                <Plus className="h-4 w-4" />
                                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                    Add New
                                </span>
                            </Button>
                        </Link>
                    }
                />
            </Suspense>
        </div>
    )
}
