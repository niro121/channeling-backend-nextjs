import React from 'react';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DoctorSessionForm from '../../doctor-session-form';
import { BackButton } from '@/components/common/back-button';
import {
  getDepartmentOptions,
  getAllDoctorSessions,
  getDoctorById,
  getLastDoctorSessionFees,
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

export default async function AddDoctorSessionPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const { data, success } = await getDoctorById(id);

  if (!success || !data) {
    notFound();
  }

  const [departmentOptions, locationOptions, sessionsRes, lastFeesRes] =
    await Promise.all([
      getDepartmentOptions(),
      getLocationOptions(),
      getAllDoctorSessions({
        doctorId: data.id,
        page: '0',
        limit: '1000'
      }),
      getLastDoctorSessionFees(data.id)
    ]);
  const doctorSessionsForPreviousDropdown = (sessionsRes.data ?? []).map(
    (s: { id: string; name: string }) => ({ id: s.id, name: s.name })
  );

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Add New Doctor Session — DR. {data.name}
        </h2>
        <BackButton href="/doctor-sessions" />
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <DoctorSessionForm
          doctorId={data.id}
          doctorSession={null}
          doctorSessionsForPreviousDropdown={doctorSessionsForPreviousDropdown}
          lastSessionFees={lastFeesRes.success ? lastFeesRes.data : null}
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
