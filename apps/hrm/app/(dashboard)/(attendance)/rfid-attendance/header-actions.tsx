'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@archmage/ui';
import { ExportWrapper } from '@/app/(dashboard)/export-wrapper';

type RfidAttendanceHeaderActionsProps = {
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
  polling?: boolean;
  onRefresh?: () => void;
};

export function RfidAttendanceHeaderActions({
  onExport,
  polling = false,
  onRefresh
}: RfidAttendanceHeaderActionsProps) {
  const router = useRouter();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 w-9 p-0"
        title={polling ? 'Auto-refresh on · click to refresh now' : 'Refresh'}
        onClick={() => (onRefresh ? onRefresh() : router.refresh())}
      >
        <RefreshCw
          className={`h-4 w-4 ${polling ? 'animate-spin [animation-duration:2.5s]' : ''}`}
        />
        <span className="sr-only">Refresh</span>
      </Button>
      <ExportWrapper
        serverData={onExport}
        columns={[
          'Punched At',
          'Device',
          'External ID',
          'RFID',
          'Staff Code',
          'Staff Name',
          'Department',
          'Direction',
          'Source',
          'Match Status'
        ]}
        keys={[
          'punchedAtLabel',
          'deviceCode',
          'externalPunchId',
          'rfid',
          'staffCode',
          'staffName',
          'department',
          'direction',
          'source',
          'matchStatus'
        ]}
        title="RFID Attendance Punches"
        fileName="rfid-attendance-punches"
        showPrintButton={false}
      />
      <Button type="button" size="sm" className="h-9 gap-1.5" asChild>
        <Link href="/attendance-corrections">
          <Plus className="h-4 w-4" />
          Add Correction
        </Link>
      </Button>
    </>
  );
}
