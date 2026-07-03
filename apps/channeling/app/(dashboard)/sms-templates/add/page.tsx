import React from "react"
import SmsTemplateForm from "../sms-template-form"
import { BackButton } from "@/components/common/back-button"

export default function AddSmsTemplatePage() {
  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Add SMS Template</h1>
          <BackButton href="/sms-templates" />
        </div>
        <SmsTemplateForm template={null} isEditPage={false} />
      </div>
    </div>
  )
}
