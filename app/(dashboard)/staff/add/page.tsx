import React from 'react'
import StaffForm from '../staff-form'
import { BackButton } from '@/components/common/back-button';

export default function AddStaffPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Add Staff</h2>
        <BackButton href="/staff" />
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <StaffForm isEditPage={false} />
      </div>
    </div>
  )
}
