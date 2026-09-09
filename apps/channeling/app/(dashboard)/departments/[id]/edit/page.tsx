import React from "react"
import { fetchDepartmentById } from "@/app/actions/department.actions"
import DepartmentForm from "../../department-form"
import { notFound } from "next/navigation"
import { BackButton } from '@/components/common/back-button';

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
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Edit Department</h1>
                    <BackButton href="/departments" />
                </div>
                <DepartmentForm department={department} isEditPage={true} />
            </div>
        </div>
    )
}

