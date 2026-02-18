'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import FilterSection from './filter-section';
import AddBtnSection from './add-btn-section';
import DoctorSessionsGroupedList from './doctor-sessions-grouped-list';
import { Loader2 } from 'lucide-react';
import type { DoctorSession } from '@/types/doctor.session';

type Option = { id: string; name: string };

type Props = {
  sessions: DoctorSession[];
  doctorId?: string;
  institutionId: string;
  doctorOptions: Option[];
  institutionOptions: Option[];
  bulkDeleteAction: (ids: string[]) => Promise<boolean>;
};

export default function DoctorSessionsContent({
  sessions,
  doctorId,
  institutionId,
  doctorOptions,
  institutionOptions,
  bulkDeleteAction
}: Props) {
  const [searchInProgress, setSearchInProgress] = useState(false);
  const [filterChanged, setFilterChanged] = useState(false);

  useEffect(() => {
    setSearchInProgress(false);
    setFilterChanged(false);
  }, [sessions, doctorId]);

  const showData = !filterChanged && !searchInProgress && doctorId && doctorId !== '__all__';

  return (
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
            onSearchStart={() => setSearchInProgress(true)}
            onFilterChange={() => setFilterChanged(true)}
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/doctor-sessions/bulk-price-change">Bulk Price Change</Link>
            </Button>
            <AddBtnSection />
          </div>
        </div>

        {searchInProgress ? (
          <div className="rounded-lg border border-dashed border-border flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">Loading sessions…</p>
          </div>
        ) : showData ? (
          <DoctorSessionsGroupedList
            sessions={sessions}
            bulkDeleteAction={bulkDeleteAction}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border flex items-center justify-center py-16 text-muted-foreground">
            {filterChanged
              ? 'Institution or doctor changed. Click Search Sessions to load.'
              : 'Select a Doctor above to view and manage sessions.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
