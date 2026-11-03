import React from 'react';
import { notFound } from 'next/navigation';
import SpecialityForm from '../../speciality-form';
import { getSpecialityById } from '@/app/actions/speciality.actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BackButton } from '@/components/common/back-button';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSpecialityPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const { data, success } = await getSpecialityById(id);

  if (!success || !data) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Edit Speciality</h1>
          <BackButton href="/specialities" />
        </div>
        <SpecialityForm
          speciality={data}
          isEditPage={true}
          user={{
            id: user?.id,
            name: user?.name || ''
          }}
        />
      </div>
    </div>
  );
}
