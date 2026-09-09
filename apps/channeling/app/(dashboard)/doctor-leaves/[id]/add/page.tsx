import React from 'react';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DoctorLeaveForm from '../../doctor-leave-form';
import { BackButton } from '@/components/common/back-button';
import { getDoctorById } from '@/app/actions/doctor.actions';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AddDoctorLeavePage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const { data, success } = await getDoctorById(id);

  if (!success || !data) {
    notFound();
  }

  const doctorName = data.name ?? '';

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Add New Doctor Leave — DR. {doctorName}
        </h2>
        <BackButton href="/doctor-leaves" />
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <DoctorLeaveForm
          doctorId={data.id}
          doctorName={doctorName}
          doctorLeave={null}
          isEditPage={false}
          user={{
            id: user?.id,
            name: user?.name ?? ''
          }}
        />
      </div>
    </div>
  );
}
