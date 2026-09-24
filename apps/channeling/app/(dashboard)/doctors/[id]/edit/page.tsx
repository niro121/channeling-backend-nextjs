import React from 'react';
import { notFound } from 'next/navigation';
import DoctorForm from '../../doctor-form';
import { getDoctorById } from '@/app/actions/doctor.actions';
import { getAllSpecialityOptions } from '@/app/actions/doctor.actions';
import { getLocationOptions } from '@/app/actions/doctor.sessions.action';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BackButton } from '@/components/common/back-button';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditDoctorPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const { data, success } = await getDoctorById(id);

  if (!success || !data) {
    notFound();
  }

  const [specialityRes, locationRes] = await Promise.all([
    getAllSpecialityOptions(),
    getLocationOptions(),
  ]);

  const specialityOptions =
    specialityRes?.data
      ?.map((s) => ({ id: s.id as string, name: s.name }))
      .sort((a, b) => a.name.localeCompare(b.name)) ?? [];

  const locationOptions =
    locationRes?.data
      ?.map((l) => ({ id: l.id as string, name: l.name }))
      .sort((a, b) => a.name.localeCompare(b.name)) ?? [];

  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Edit Doctor</h1>
          <BackButton href="/doctors" />
        </div>
        <DoctorForm
          doctor={data}
          specialities={specialityOptions}
          locations={locationOptions}
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
