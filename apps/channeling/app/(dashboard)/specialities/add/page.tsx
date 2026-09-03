import React from 'react';
import SpecialityForm from '../speciality-form';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BackButton } from '@/components/common/back-button';

export default async function AddSpecialityPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Add New Speciality</h1>
          <BackButton href="/specialities" />
        </div>
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
