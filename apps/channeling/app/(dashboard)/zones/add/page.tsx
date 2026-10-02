import React from "react"
import ZoneForm from "../zone-form"
import { getAllLocations } from "@/app/actions/location.action"
import { BackButton } from '@/components/common/back-button';

const Page = async () => {
    const locationsResponse = await getAllLocations({
        page: "0",
        limit: "1000",
        publishedOnly: true,
    })

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Add New Zone</h1>
                <BackButton href="/zones" />
            </div>
            <ZoneForm zone={null} locations={locationsResponse.data || []} />
        </div>
    )
}

export default Page
