import React from "react"
import ZoneForm from "../zone-form"
import { getAllLocations } from "@/app/actions/location.action"
import { BackButton } from '@/components/common/back-button';

const Page = async () => {
    const locationsResponse = await getAllLocations({
        page: "0",
        limit: "1000",
    })

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">Add New Zone</h1>
                    <p className="text-muted-foreground">
                        Create a new zone by filling out the form below.
                    </p>
                </div>
                <BackButton href="/zones" />
            </div>
            <ZoneForm zone={null} locations={locationsResponse.data || []} />
        </div>
    )
}

export default Page
