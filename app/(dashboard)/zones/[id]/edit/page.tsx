import React from "react"
import ZoneForm from "../../zone-form"
import { fetchZoneById } from "@/app/actions/zone.actions"

type EditPageProps = {
    params: Promise<{ id: string }>
}

const Page = async ({ params }: EditPageProps) => {
    const { id } = await params
    const zone = await fetchZoneById(id)

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Edit Zone</h1>
                <p className="text-muted-foreground">
                    Update the zone details below.
                </p>
            </div>
            <ZoneForm zone={zone} isEditPage={true} />
        </div>
    )
}

export default Page
