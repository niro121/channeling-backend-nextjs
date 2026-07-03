import React from "react"
import ApiClientForm from "../../api-client-form"
import { getApiClientById } from "@/app/actions/api-client.actions"
import { notFound } from "next/navigation"
import { BackButton } from "@/components/common/back-button"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditApiClientPage({ params }: PageProps) {
  const { id } = await params
  const result = await getApiClientById(id)

  if (!result.success || !result.data) {
    notFound()
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Edit API Client</h2>
        <BackButton href="/admin/api-clients" />
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <ApiClientForm apiClient={result.data} isEditPage />
      </div>
    </div>
  )
}
