import React from 'react';
import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/server-permissions';
import { scanGeneratedSessionOverlaps } from '@/services/scan-session-overlaps.service';
import { SessionOverlapsClient } from './session-overlaps-client';

export const dynamic = 'force-dynamic';

type SearchParams = {
  searchParams?: Promise<{
    fromDate?: string;
    toDate?: string;
  }>;
};

function colomboDate(offsetDays = 0): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  const date = new Date(Date.UTC(year, month - 1, day + offsetDays));
  return date.toISOString().slice(0, 10);
}

export default async function SessionOverlapsPage({ searchParams }: SearchParams) {
  const canView = await checkRouteAccess('/sessions');
  if (!canView) {
    redirect('/unauthorized-access');
  }

  const params = await searchParams;
  const fromDate = params?.fromDate || colomboDate(0);
  const toDate = params?.toDate || colomboDate(30);
  const result = await scanGeneratedSessionOverlaps(fromDate, toDate);

  return (
    <SessionOverlapsClient
      scan={result.success ? result.data : null}
      error={result.success ? null : result.message}
      fromDate={fromDate}
      toDate={toDate}
    />
  );
}
