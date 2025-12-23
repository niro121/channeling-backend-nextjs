import React from "react"
import { fetchDepartmentById } from "@/app/actions/department.actions"
import DepartmentForm from "../../department-form"
import { notFound } from "next/navigation"

type PageProps = {
    params: Promise<{
        id: string
    }>
}

export default async function EditDepartmentPage({ params }: PageProps) {
    const resolvedParams = await params
    const { id } = resolvedParams

    let department
    try {
        department = await fetchDepartmentById(id)
    } catch (error: any) {
        notFound()
    }

    if (!department) {
        notFound()
    }

    return (
        <div className="container mx-auto py-6">
            <div className="w-full">
                <h1 className="text-2xl font-bold mb-6">Edit Department</h1>
                <DepartmentForm department={department} isEditPage={true} />
            </div>
        </div>
    )
}

