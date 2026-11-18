'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ScanSearch } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  branchOptions: Option[];
  branchId?: string;
}

export default function SessionsPageClient({
  doctorOptions,
  doctorId,
  fromDate,
  toDate,
  page,
  limit,
  branchOptions,
  branchId,
}: SessionsPageClientProps) {
  const listRef = useRef<SessionsListRef>(null);

  return (
    <Card className="rounded-lg border border-border shadow-sm overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-lg font-semibold">Sessions</CardTitle>
            <CardDescription className="text-muted-foreground">
              View and manage sessions by doctor and date range.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/sessions/overlaps">
              <ScanSearch className="mr-1.5 h-4 w-4" />
              Scan overlaps
            </Link>
          </Button>
        </div>
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
            branchOptions={branchOptions}
            branchId={branchId}
          />
        </div>
      </CardContent>
    </Card>
  );
}
