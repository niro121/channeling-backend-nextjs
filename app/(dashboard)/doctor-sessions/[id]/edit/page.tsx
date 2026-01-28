import React from 'react';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DoctorSessionForm from '../../doctor-session-form';
import {
  getDepartmentOptions,
  getDoctorById,
  getDoctorSessionById,
  getLocationOptions
} from '@/app/actions/doctor.sessions.action';
import {
  DAY_TYPES,
  FEE_TYPES,
  INSTITUTION_OPTIONS,
  REFUNDABLE_OPTIONS
} from '@/types/doctor.session';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditDoctorSessionPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const { data, success } = await getDoctorSessionById(id);

  if (!success || !data) {
    notFound();
  }

  const departmentOptions = await getDepartmentOptions();
  const locationOptions = await getLocationOptions();

  return (
    <div className="container mx-auto py-6">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-6">
          Edit {`Session - ${data.name}`} of {`DR.${data.doctor.name}`}
        </h1>
        <DoctorSessionForm
          doctorId={data.id}
          doctorSession={data}
          institutionOptions={INSTITUTION_OPTIONS}
          departmentOptions={departmentOptions.data}
          locationOptions={locationOptions.data}
          dayTypeOptions={DAY_TYPES}
          refundableOptions={REFUNDABLE_OPTIONS}
          feeTypeOptions={FEE_TYPES}
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
