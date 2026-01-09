import React from "react"
import { fetchTagById } from "@/app/actions/tag.actions"
import TagForm from "../../tag-form"
import { notFound } from "next/navigation"

type PageProps = {
    params: Promise<{
        id: string
    }>
}

export default async function EditTagPage({ params }: PageProps) {
    const resolvedParams = await params
    const { id } = resolvedParams

    let tag
    try {
        tag = await fetchTagById(id)
    } catch (error: any) {
        notFound()
    }

    if (!tag) {
        notFound()
    }

    return (
        <div className="container mx-auto py-6">
            <div className="w-full">
                <h1 className="text-2xl font-bold mb-6">Edit Tag</h1>
                <TagForm tag={tag} isEditPage={true} />
            </div>
        </div>
    )
}
