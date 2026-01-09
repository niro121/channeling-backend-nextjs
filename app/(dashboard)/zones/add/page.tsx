import React from "react"
import ZoneForm from "../zone-form"

const Page = () => {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Add New Zone</h1>
                <p className="text-muted-foreground">
                    Create a new zone by filling out the form below.
                </p>
            </div>
            <ZoneForm zone={null} />
        </div>
    )
}

export default Page
