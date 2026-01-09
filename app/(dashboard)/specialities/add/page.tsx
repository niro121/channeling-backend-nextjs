import React from 'react';
import SpecialityForm from '../speciality-form';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function AddSpecialityPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-6">Add New Speciality</h1>
        <SpecialityForm
          speciality={null}
          isEditPage={false}
          user={{
            id: user?.id,
            name: user?.name || ''
          }}
        />
      </div>
    </div>
  );
}
