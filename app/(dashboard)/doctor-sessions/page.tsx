import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import Loading from '../loading';
import DoctorSessionsContent from './doctor-sessions-content';
import {
  getAllDoctorSessions,
  getDoctorOptions,
  getDepartmentOptions,
  getLocationOptions,
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
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    await logActivity({
      userId: session.user.id,
      action: 'doctor-sessions.visited',
      entityType: 'DoctorSessions',
      importance: 'low',
    });
  }
  const institutionId = params?.institutionId ?? '0';
  const doctorId = params?.doctorId;

  const [doctorOptionsRes, departmentOptionsRes, locationOptionsRes, sessionsRes] =
    await Promise.all([
      getDoctorOptions(),
      getDepartmentOptions(),
      getLocationOptions(),
      doctorId && doctorId !== '__all__'
        ? getAllDoctorSessions({ institutionId, doctorId })
        : Promise.resolve({ data: [], totalRecords: 0 })
    ]);

  const doctorOptionsList = doctorOptionsRes.data || [];
  const doctorOptions = [
    { id: '__all__', name: 'Select Doctor' },
    ...doctorOptionsList
  ].map((o) => ({ id: o.id, name: o.name }));

  const departmentOptions = departmentOptionsRes.data ?? [];
  const locationOptions = locationOptionsRes.data ?? [];
  const sessions = sessionsRes.data ?? [];

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <DoctorSessionsContent
          sessions={sessions ?? []}
          doctorId={doctorId}
          institutionId={institutionId}
          doctorOptions={doctorOptions}
          institutionOptions={institutionOptions}
          departmentOptions={departmentOptions}
          locationOptions={locationOptions}
          bulkDeleteAction={bulkDeleteDoctorSessions}
        />
      </Suspense>
    </div>
  );
}
