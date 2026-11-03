import React from "react"
import TagForm from "../tag-form"
import { BackButton } from '@/components/common/back-button';

export default async function AddTagPage() {
    return (
        <div className="container mx-auto py-6">
            <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Add New Tag</h1>
                    <BackButton href="/tags" />
                </div>
                <TagForm tag={null} isEditPage={false} />
            </div>
        </div>
    )
}
