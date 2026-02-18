import React, { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SearchInput } from "@/components/common/search"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { patientColumns } from "./columns"
import { getPatientsAction, bulkDeletePatientsAction, getPatientsExport } from "@/app/actions/patient.actions"
import Loading from "../loading"
import Link from "next/link"
import { checkRouteAccess } from "@/lib/server-permissions"
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

    const handleExport = async () => {
        'use server';

        const patientListResponse = await getPatientsExport({
            keyword: resolvedSearchParams?.keyword
        });

        if (!patientListResponse.success || !patientListResponse.data?.length) {
            return {
                success: false,
                message: patientListResponse.success
                    ? 'No patients found'
                    : patientListResponse.message
            };
        }

        const mappedPatients = patientListResponse.data.map((p: any) => ({
            code: p.code || '-',
            name: `${p.title || ''} ${p.name || ''}`.trim() || '-',
            phone: p.phone || '-',
            email: p.email || '-',
            age: p.age || '-',
            sex: p.sex || '-',
            area: p.area?.name || '-'
        }));

        return {
            success: true,
            data: mappedPatients
        };
    };

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
                        <div className="flex flex-col gap-3 flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row gap-3 items-start">
                                <div className="relative w-full sm:max-w-sm">
                                    <SearchInput
                                        name="keyword"
                                        placeholder="Search by name, phone, code"
                                        className="pl-8 w-full h-9"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center">
                                <ExportWrapper
                                    serverData={handleExport}
                                    columns={['Code', 'Name', 'Phone', 'Email', 'Age', 'Sex', 'Area']}
                                    keys={['code', 'name', 'phone', 'email', 'age', 'sex', 'area']}
                                    title="Patients List"
                                    fileName="patients"
                                />
                            </div>
                        </div>
                    }
                    toolbarRight={
                        <div className="flex items-start gap-2 shrink-0">
                            <BulkDeleteButton />
                            <Link href="/patients/add">
                                <Button size="sm" className="gap-1.5 h-9 cursor-pointer">
                                    <Plus className="h-4 w-4" />
                                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                                        Add New
                                    </span>
                                </Button>
                            </Link>
                        </div>
                    }
                    hideAutoBulkDelete={true}
                />
            </Suspense>
        </div>
    )
}
