import React from "react"
import DepartmentForm from "../department-form"
import { BackButton } from '@/components/common/back-button';

export default async function AddDepartmentPage() {
    return (
        <div className="container mx-auto py-6">
            <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Add New Department</h1>
                    <BackButton href="/departments" />
                </div>
                <DepartmentForm department={null} isEditPage={false} />
            </div>
        </div>
    )
}

