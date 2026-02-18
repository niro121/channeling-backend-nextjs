import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import DoctorSessionForm from '../../doctor-session-form';
import {
  getDepartmentOptions,
  getAllDoctorSessions,
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
  const doctorId = (data.doctorId ?? data.doctor?.id) ?? '';
  const { data: doctorSessionsList } = await getAllDoctorSessions({
    doctorId,
    page: '0',
    limit: '1000'
  });
  const doctorSessionsForPreviousDropdown = (doctorSessionsList ?? []).map(
    (s: { id: string; name: string }) => ({ id: s.id, name: s.name })
  );

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/doctor-sessions" aria-label="Back to Doctor Sessions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">
            Edit Session — {data.name} (DR. {data.doctor?.name ?? '—'})
          </h2>
        </div>
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <DoctorSessionForm
          doctorId={doctorId}
          doctorSession={data}
          doctorSessionsForPreviousDropdown={doctorSessionsForPreviousDropdown}
          institutionOptions={INSTITUTION_OPTIONS}
          departmentOptions={departmentOptions.data}
          locationOptions={locationOptions.data}
          dayTypeOptions={DAY_TYPES}
          refundableOptions={REFUNDABLE_OPTIONS}
          feeTypeOptions={FEE_TYPES}
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
