import React, { Suspense } from 'react';
import Loading from '../loading';
import DoctorSessionsContent from './doctor-sessions-content';
import {
  getAllDoctorSessions,
  getDoctorOptions,
  bulkDeleteDoctorSessions
} from '@/app/actions/doctor.sessions.action';
import { INSTITUTION_OPTIONS } from '@/types/doctor.session';

type SearchParams = {
  searchParams?: Promise<{
    institutionId?: string;
    doctorId?: string;
  }>;
};

const institutionOptions = INSTITUTION_OPTIONS;

export default async function Page({ searchParams }: SearchParams) {
  const params = await searchParams;
  const institutionId = params?.institutionId ?? '0';
  const doctorId = params?.doctorId;

  const doctorOptionsRes = await getDoctorOptions();
  const doctorOptionsList = doctorOptionsRes.data || [];
  const doctorOptions = [
    { id: '__all__', name: 'Select Doctor' },
    ...doctorOptionsList
  ].map((o) => ({ id: o.id, name: o.name }));

  const { data: sessions } =
    doctorId && doctorId !== '__all__'
      ? await getAllDoctorSessions({ institutionId, doctorId })
      : { data: [] };

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <DoctorSessionsContent
          sessions={sessions ?? []}
          doctorId={doctorId}
          institutionId={institutionId}
          doctorOptions={doctorOptions}
          institutionOptions={institutionOptions}
          bulkDeleteAction={bulkDeleteDoctorSessions}
        />
      </Suspense>
    </div>
  );
}
