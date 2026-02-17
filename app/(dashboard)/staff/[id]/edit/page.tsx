import React from "react"
import StaffForm from "../../staff-form"
import { getStaffByIdAction } from "@/app/actions/staff.actions"
import { notFound } from "next/navigation"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditStaffPage({ params }: PageProps) {
  const { id } = await params
  const result = await getStaffByIdAction(id)

  if (result.isError || !result.data) {
    notFound()
  }

  const staff = result.data as any
  const formStaff = {
    id: staff.id,
    code: staff.code ?? "",
    title: staff.title ?? "",
    name: staff.name ?? "",
    nic: staff.nic ?? "",
    dateOfBirth: staff.dateOfBirth ? new Date(staff.dateOfBirth) : undefined,
    gender: staff.gender ?? "",
    contactMobile: staff.contactMobile ?? "",
    address: staff.address ?? "",
    dateJoined: staff.dateJoined ? new Date(staff.dateJoined) : undefined,
    status: staff.status !== undefined ? staff.status : 1,
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Edit Staff</h2>
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <StaffForm staff={formStaff} isEditPage={true} />
      </div>
    </div>
  )
}
