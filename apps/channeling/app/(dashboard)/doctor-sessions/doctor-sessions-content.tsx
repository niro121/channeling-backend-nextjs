'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  branchId?: string;
  doctorOptions: Option[];
  institutionOptions: Option[];
  departmentOptions?: { id: string; name: string }[];
  locationOptions?: { id: string; name: string }[];
  branchOptions: Option[];
  bulkDeleteAction: (ids: string[]) => Promise<boolean>;
};

export default function DoctorSessionsContent({
  sessions,
  doctorId,
  institutionId,
  branchId,
  doctorOptions,
  institutionOptions,
  departmentOptions,
  locationOptions,
  branchOptions,
  bulkDeleteAction
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInProgress, setSearchInProgress] = useState(false);
  const [filterChanged, setFilterChanged] = useState(false);

  useEffect(() => {
    setSearchInProgress(false);
    setFilterChanged(false);
  }, [sessions, doctorId, branchId]);

  const showData = !filterChanged && !searchInProgress && doctorId && doctorId !== '__all__';

  const branchSelectValue =
    branchId && /^[a-fA-F0-9]{24}$/.test(branchId) ? branchId : '__all__';

  const onBranchChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (value === '__all__') {
      params.delete('branchId');
    } else {
      params.set('branchId', value);
    }
    params.delete('page');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };

  const branchFilter = (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-muted-foreground sm:inline">Branch</span>
      <Select value={branchSelectValue} onValueChange={onBranchChange}>
        <SelectTrigger
          aria-label="Filter by branch"
          className="h-9 w-[min(90vw,13rem)] sm:w-[13rem]"
        >
          <SelectValue placeholder="Branch" />
        </SelectTrigger>
        <SelectContent>
          {branchOptions.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

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
            <AddBtnSection
              searchDone={!!showData}
              departmentOptions={departmentOptions}
              locationOptions={locationOptions}
            />
          </div>
        </div>

        {searchInProgress ? (
          <div className="rounded-lg border border-dashed border-border flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium">Loading sessions…</p>
          </div>
        ) : showData ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {sessions.length} session{sessions.length === 1 ? '' : 's'}
                {branchSelectValue !== '__all__' ? ' for selected branch' : ''}.
                {sessions.length === 0 ? ' Try another branch or add a session.' : ''}
              </p>
              {branchFilter}
            </div>
            <DoctorSessionsGroupedList
              sessions={sessions}
              bulkDeleteAction={bulkDeleteAction}
            />
          </div>
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
