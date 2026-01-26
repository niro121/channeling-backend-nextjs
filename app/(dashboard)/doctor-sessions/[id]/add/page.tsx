import React from 'react';
import DoctorForm from '../doctor-';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllSpecialityOptions } from '@/app/actions/doctor.actions';

export default async function AddDoctorSessionPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user

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
