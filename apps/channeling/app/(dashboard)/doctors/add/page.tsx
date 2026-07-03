import React from 'react';
import DoctorForm from '../doctor-form';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllSpecialityOptions } from '@/app/actions/doctor.actions';
import { BackButton } from '@/components/common/back-button';

export default async function AddDoctorPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user

  const specialityRes = await getAllSpecialityOptions()

  const specialityOptions =
    specialityRes?.data
      ?.map((s) => ({ id: s.id as string, name: s.name }))
      .sort((a, b) => a.name.localeCompare(b.name)) ?? [];

  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Add New Doctor</h1>
          <BackButton href="/doctors" />
        </div>
        <DoctorForm
          doctor={null}
          specialities={specialityOptions}
          isEditPage={false}
          user={{
            id: user?.id,
            name: user?.name || ""
          }}
        />
      </div>
    </div>
  );
}
