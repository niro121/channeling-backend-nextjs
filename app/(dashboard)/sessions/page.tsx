import React, { Suspense } from 'react';
import Loading from '../loading';
import SessionsPageClient from './sessions-page-client';
import { getDoctorOptions } from '@/app/actions/sessions.action';

type SearchParams = {
  searchParams?: Promise<{
    page?: string;
    limit?: string;
    doctorId?: string;
    fromDate?: string;
    toDate?: string;
  }>;
};

function todayYYYYMMDD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default async function Page({ searchParams }: SearchParams) {
  const params = await searchParams;
  const doctorOptions = await getDoctorOptions();
  const defaultToday = todayYYYYMMDD();
  const fromDate = params?.fromDate ?? defaultToday;
  const toDate = params?.toDate ?? defaultToday;

  const doctorOptionsWithAll = [
    { id: '-1', name: 'All Doctors' },
    ...(doctorOptions.data || [])
  ];

  return (
    <Suspense fallback={<Loading />}>
      <SessionsPageClient
        doctorId={params?.doctorId}
        doctorOptions={doctorOptionsWithAll}
        fromDate={fromDate}
        toDate={toDate}
        page={params?.page}
        limit={params?.limit}
      />
    </Suspense>
  );
}
