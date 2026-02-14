import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import DoctorLeaveForm from '../../doctor-leave-form';
import { getOneLeaveByID } from '@/app/actions/doctor.leave.action';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditDoctorLeavePage({ params }: PageProps) {
  const resolvedParams = await params;
  const { id } = resolvedParams;
  const session = await getServerSession(authOptions);
  const user = session?.user;

  const { data, success } = await getOneLeaveByID(id);
  const doctorId = data.doctorId ?? data.doctor?.id ?? '';
  const doctorName = data.doctor?.name ?? '';

  if (!success || !data) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/doctor-leaves" aria-label="Back to Doctor Leaves">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">
            Edit Leave — DR. {doctorName || '—'}
          </h2>
        </div>
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <DoctorLeaveForm
          doctorId={doctorId}
          doctorName={doctorName || ''}
          doctorLeave={data}
          isEditPage={true}
          user={{
            id: user?.id,
            name: user?.name ?? ''
          }}
        />
      </div>
    </div>
  );
}
