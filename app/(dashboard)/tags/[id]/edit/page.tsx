import React from "react"
import { fetchTagById } from "@/app/actions/tag.actions"
import TagForm from "../../tag-form"
import { notFound } from "next/navigation"
import { BackButton } from '@/components/common/back-button';

type PageProps = {
    params: Promise<{
        id: string
    }>
}

export default async function EditTagPage({ params }: PageProps) {
    const resolvedParams = await params
    const { id } = resolvedParams

    const tagResult = await fetchTagById(id)

    if (!tagResult.success || !tagResult.data) {
        notFound()
    }

    return (
        <div className="container mx-auto py-6">
            <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Edit Tag</h1>
                    <BackButton href="/tags" />
                </div>
                <TagForm tag={tagResult.data} isEditPage={true} />
            </div>
        </div>
    )
}
