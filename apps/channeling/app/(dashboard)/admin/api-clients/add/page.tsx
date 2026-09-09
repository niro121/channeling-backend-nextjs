import React from "react"
import ApiClientForm from "../api-client-form"
import { BackButton } from "@/components/common/back-button"

export default async function AddApiClientPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Add API Client</h2>
        <BackButton href="/admin/api-clients" />
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <ApiClientForm apiClient={null} />
      </div>
    </div>
  )
}
