import React from "react"
import DepartmentForm from "../department-form"

export default async function AddDepartmentPage() {
    return (
        <div className="container mx-auto py-6">
            <div className="w-full">
                <h1 className="text-2xl font-bold mb-6">Add New Department</h1>
                <DepartmentForm department={null} isEditPage={false} />
            </div>
        </div>
    )
}

