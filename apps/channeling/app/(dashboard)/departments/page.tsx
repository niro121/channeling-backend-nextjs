import React, { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { SearchInput } from "@/components/common/search"
import { CustomDataTable } from "@/components/common/custom-data-table"
import { departmentColumns } from "./columns"
import { bulkDeleteDepartments, getAllDepartments, getDepartmentsExport, checkDepartmentsHaveLinkedRecords } from "@/app/actions/department.actions"
import Loading from "../loading"
import Link from "next/link"
import { checkRouteAccess } from "@/lib/server-permissions"
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
    // Check if user can view departments
    const canView = await checkRouteAccess("/departments")
    if (!canView) {
        redirect("/unauthorized-access")
    }
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
        logActivityNonBlocking({
            userId: session.user.id,
            action: "departments.visited",
            entityType: "Departments",
            importance: "low",
        })
    }

    const resolvedSearchParams = await searchParams;

    const { data, totalRecords } = await getAllDepartments({
        page: resolvedSearchParams?.page,
        limit: resolvedSearchParams?.limit,
        keyword: resolvedSearchParams?.keyword,
    })

    const handleExport = async () => {
        'use server';

        const departmentListResponse = await getDepartmentsExport({
            keyword: resolvedSearchParams?.keyword
        });

        if (!departmentListResponse.success || !departmentListResponse.data?.length) {
            return {
                success: false,
                message: departmentListResponse.success
                    ? 'No departments found'
                    : departmentListResponse.message
            };
        }

        const mappedDepartments = departmentListResponse.data.map((d: any) => ({
            name: d.name || '-',
            description: d.description || '-'
        }));

    return {
      success: true,
      data: mappedDepartments
    };
  };

  const getBulkDeleteDescription = async (ids: string[]): Promise<string> => {
    'use server';
    
    try {
      const result = await checkDepartmentsHaveLinkedRecords(ids);
      
      if (result.success && result.data) {
        const { hasLinkedRecords } = result.data;
        
        if (hasLinkedRecords) {
          return "One or more selected departments are currently linked to other system records. Deleting them may affect related data and existing associations.\n\nAre you sure you want to continue?";
        }
      }
      
      // Default message if no linked records
      return "This action cannot be undone. This will permanently delete these records and remove the data from our servers.";
    } catch (error: any) {
      console.error('Error getting bulk delete description:', error);
      return "This action cannot be undone. This will permanently delete these records and remove the data from our servers.";
    }
  };

  return (
        <div className="overflow-hidden">
            <Suspense fallback={<Loading />}>
                <CustomDataTable
                    heading="Departments"
                    subHeading="Manage your departments here."
                    columns={departmentColumns}
                    data={data}
                    rowCount={totalRecords}
                    deleteServerAction={bulkDeleteDepartments}
                    getBulkDeleteDescription={getBulkDeleteDescription}
                    page={resolvedSearchParams?.page}
                    toolbarLeft={
                        <div className="flex flex-col gap-3 flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row gap-3 items-start">
                                <div className="relative w-full sm:max-w-sm">
                                    <SearchInput
                                        name="keyword"
                                        placeholder="Search by name"
                                        className="pl-8 w-full h-9"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center">
                                <ExportWrapper
                                    serverData={handleExport}
                                    columns={['Department Name', 'Description']}
                                    keys={['name', 'description']}
                                    title="Departments List"
                                    fileName="departments"
                                />
                            </div>
                        </div>
                    }
                    toolbarRight={
                        <div className="flex items-start gap-2 shrink-0">
                            <BulkDeleteButton />
                            <Link href="/departments/add">
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
