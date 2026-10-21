import React from "react"
import { notFound } from "next/navigation"
import SmsTemplateForm from "../../sms-template-form"
import { getSmsTemplateById } from "@/app/actions/sms-template.actions"
import { BackButton } from "@/components/common/back-button"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditSmsTemplatePage({ params }: PageProps) {
  const { id } = await params
  const { success, data } = await getSmsTemplateById(id)
  if (!success || !data) {
    notFound()
  }
  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Edit SMS Template</h1>
          <BackButton href="/sms-templates" />
        </div>
        <SmsTemplateForm template={data} isEditPage />
      </div>
    </div>
  )
}
