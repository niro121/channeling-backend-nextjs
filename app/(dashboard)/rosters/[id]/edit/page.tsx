import React from "react"
import { fetchRosterById } from "@/app/actions/roster.actions"
import RosterForm from "../../roster-form"
import { notFound } from "next/navigation"

type PageProps = {
    params: Promise<{
        id: string
    }>
}

export default async function EditRosterPage({ params }: PageProps) {
    const resolvedParams = await params
    const { id } = resolvedParams

    let roster
    try {
        roster = await fetchRosterById(id)
    } catch (error: any) {
        notFound()
    }

    if (!roster) {
        notFound()
    }

    return (
        <div className="container mx-auto py-6">
            <div className="w-full">
                <h1 className="text-2xl font-bold mb-6">Edit Roster</h1>
                <RosterForm roster={roster} isEditPage={true} />
            </div>
        </div>
    )
}
