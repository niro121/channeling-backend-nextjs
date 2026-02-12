import React, { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Loading from '../loading';
import FilterSection from './filter-section';
import {
  getAllDoctorSessions,
  getDoctorOptions,
  bulkDeleteDoctorSessions
} from '@/app/actions/doctor.sessions.action';
import AddBtnSection from './add-btn-section';
import DoctorSessionsGroupedList from './doctor-sessions-grouped-list';
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
    { id: '__all__', name: 'Select doctor' },
    ...doctorOptionsList
  ];

  const { data: sessions } =
    doctorId && doctorId !== '__all__'
      ? await getAllDoctorSessions({ institutionId, doctorId })
      : { data: [] };

  return (
    <div className="overflow-hidden">
      <Suspense fallback={<Loading />}>
        <Card className="rounded-lg border border-border shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Doctor Sessions</CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage your doctor sessions here. Select institution and doctor to view sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <FilterSection
                institutionId={institutionId}
                institutionOptions={institutionOptions}
                doctorId={doctorId}
                doctorOptions={doctorOptions}
              />
              <AddBtnSection />
            </div>

            {doctorId && doctorId !== '__all__' ? (
              <DoctorSessionsGroupedList
                sessions={sessions}
                bulkDeleteAction={bulkDeleteDoctorSessions}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-border flex items-center justify-center py-16 text-muted-foreground">
                Select a doctor above to view and manage sessions.
              </div>
            )}
          </CardContent>
        </Card>
      </Suspense>
    </div>
  );
}
