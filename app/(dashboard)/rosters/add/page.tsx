import React from "react"
import RosterForm from "../roster-form"

export default async function AddRosterPage() {
    return (
        <div className="container mx-auto py-6">
            <div className="w-full">
                <h1 className="text-2xl font-bold mb-6">Add New Roster</h1>
                <RosterForm roster={null} isEditPage={false} />
            </div>
        </div>
    )
}
