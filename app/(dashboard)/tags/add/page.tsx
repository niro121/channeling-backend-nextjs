import React from "react"
import TagForm from "../tag-form"

export default async function AddTagPage() {
    return (
        <div className="container mx-auto py-6">
            <div className="w-full">
                <h1 className="text-2xl font-bold mb-6">Add New Tag</h1>
                <TagForm tag={null} isEditPage={false} />
            </div>
        </div>
    )
}
