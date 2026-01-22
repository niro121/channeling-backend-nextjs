import React from "react"
import PatientForm from "../../patient-form"
import { getAreasAction, getPatientByIdAction } from "@/app/actions/patient.actions"
import { notFound } from "next/navigation"

type PageProps = {
    params: Promise<{ id: string }>
}

export default async function Page({ params }: PageProps) {
    const { id } = await params
    const patientData = await getPatientByIdAction(id)
    const areas = await getAreasAction()

    if (patientData.isError || !patientData.data) {
        notFound()
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Edit Patient</h2>
            </div>
            <div className="h-full flex-1 flex-col space-y-8">
                <PatientForm patient={patientData.data} areas={areas.data || []} />
            </div>
        </div>
    )
}
