import React from "react"
import PatientForm from "../patient-form"
import { getAreasAction } from "@/app/actions/patient.actions"
import { BackButton } from '@/components/common/back-button';

export default async function Page() {
    const areas = await getAreasAction()

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Add Patient</h2>
                <BackButton href="/patients" />
            </div>
            <div className="h-full flex-1 flex-col space-y-8">
                <PatientForm areas={areas.data || []} isEditPage={false} />
            </div>
        </div>
    )
}
