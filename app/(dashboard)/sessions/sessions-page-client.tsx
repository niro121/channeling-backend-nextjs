'use client';

import React, { useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FilterSection from './filter-section';
import SessionsList, { type SessionsListRef } from './sessions-list';

type Option = { id: string; name: string };

interface SessionsPageClientProps {
  doctorOptions: Option[];
  doctorId?: string;
  fromDate: string;
  toDate: string;
  page?: string;
  limit?: string;
}

export default function SessionsPageClient({
  doctorOptions,
  doctorId,
  fromDate,
  toDate,
  page,
  limit
}: SessionsPageClientProps) {
  const listRef = useRef<SessionsListRef>(null);

  return (
    <Card className="rounded-lg border border-border shadow-sm overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Sessions</CardTitle>
        <CardDescription className="text-muted-foreground">
          View and manage sessions by doctor and date range.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-start">
          <FilterSection
            doctorId={doctorId}
            doctorOptions={doctorOptions}
            fromDate={fromDate}
            toDate={toDate}
            onSessionsCreatedOrUpdated={() => listRef.current?.refetch?.()}
          />
        </div>
        <div className="overflow-hidden">
          <SessionsList
            ref={listRef}
            doctorId={doctorId}
            fromDate={fromDate}
            toDate={toDate}
            page={page}
            limit={limit}
          />
        </div>
      </CardContent>
    </Card>
  );
}
