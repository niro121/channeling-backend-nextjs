import React from 'react';
import { notFound } from 'next/navigation';
import SpecialityForm from '../../speciality-form';
import { getSpecialityById } from '@/app/actions/speciality.actions';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditSpecialityPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const { data, success } = await getSpecialityById(id);

  if (!success || !data) {
    notFound();
  }

  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-6">Edit Speciality</h1>
        <SpecialityForm speciality={data} isEditPage={true} />
      </div>
    </div>
  );
}
