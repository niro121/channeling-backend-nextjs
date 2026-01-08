import React from 'react';
import DoctorForm from '../doctor-form';
import { getAllSpecialities } from '@/app/actions/speciality.actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function AddDoctorPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user

  const specialityRes = await getAllSpecialities({
    page: '0',
    limit: '1000',
    keyword: ''
  });

  const specialityOptions =
    specialityRes?.data?.map((s) => ({ id: s.id as string, name: s.name })) ??
    [];

  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-6">Add New Doctor</h1>
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
