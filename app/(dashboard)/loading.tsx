import { LoadingSpinner } from "@/components/icons"
import React from "react"

export default function Loading() {
    return (
        <div className="flex justify-center mb-32">
            <div className="text-center text-primary-forground text-3xl">
                <LoadingSpinner />
            </div>
        </div>
    )
}
