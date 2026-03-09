import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getDoctorOptions } from '@/app/actions/sessions.action';
import DoctorLeavesList from './doctor-leaves-list';
import Loading from '../loading';

type SearchParams = {
  searchParams?: Promise<{
    doctorId?: string;
    fromDate?: string;
    toDate?: string;
    page?: string;
    limit?: string;
  }>;
};

export default async function DoctorLeavesPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/doctor-leaves');
  if (!canView) redirect('/unauthorized-access');
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: 'doctor-leaves.visited',
      entityType: 'DoctorLeaves',
      importance: 'low',
    });
  }

  const params = await searchParams;
  const doctorOptions = await getDoctorOptions();

  const doctor =
    (doctorOptions &&
      doctorOptions.data &&
      doctorOptions.data.find((doctor) =>
        doctor.id === params?.doctorId ? doctor.name : undefined
      )) ||
    undefined;

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <DoctorLeavesList
          doctorId={params?.doctorId}
          doctorName={doctor?.name}
          fromDate={params?.fromDate}
          toDate={params?.toDate}
          page={params?.page}
          limit={params?.limit}
          doctorOptions={doctorOptions.data}
        />
      </Suspense>
    </div>
  );
}
