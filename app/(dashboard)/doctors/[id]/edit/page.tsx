import React from 'react';
import { notFound } from 'next/navigation';
import DoctorForm from '../../doctor-form';
import { getDoctorById } from '@/app/actions/doctor.actions';
import { getAllSpecialities } from '@/app/actions/speciality.actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditDoctorPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.name || session?.user?.id;

  const { data, success } = await getDoctorById(id);

  if (!success || !data) {
    notFound();
  }

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
        <h1 className="text-2xl font-bold mb-6">Edit Doctor</h1>
        <DoctorForm
          doctor={data}
          specialities={specialityOptions}
          isEditPage={true}
          userId={userId}
        />
      </div>
    </div>
  );
}
