'use client';

import { Suspense } from 'react';
import { Button, useToast } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import { format } from 'date-fns';
import { dutyRosterColumns } from './columns';
import type { DutyRosterSample } from './sample-data';

type DutyViewMode = 'daily' | 'weekly' | 'monthly';

type SectionDutyRegisterProps = {
  items: DutyRosterSample[];
  dutyDate: Date;
};

const LATER = 'Will be wired in a later phase.';

export default function SectionDutyRegister({
  items,
  dutyDate
}: SectionDutyRegisterProps) {
  const { toast } = useToast();
  const dateLabel = format(dutyDate, 'dd MMM yyyy');
  const viewMode: DutyViewMode = 'daily';

  const handleViewChange = (mode: DutyViewMode) => {
    if (mode === 'daily') return;
    toast({
      title: mode === 'weekly' ? 'Weekly Duty Roster' : 'Monthly Duty Roster',
      description: LATER
    });
  };

  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading duty roster...
        </div>
      }
    >
      <CommonDataTable
        heading={`Duty Roster — ${dateLabel}`}
        subHeading="Daily duty list derived from Shift Assignment."
        headingRight={
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['daily', 'Daily Duty Roster'],
                ['weekly', 'Weekly Duty Roster'],
                ['monthly', 'Monthly Duty Roster']
              ] as const
            ).map(([mode, label]) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={viewMode === mode ? 'default' : 'outline'}
                className="h-9"
                onClick={() => handleViewChange(mode)}
              >
                {label}
              </Button>
            ))}
          </div>
        }
        columns={dutyRosterColumns}
        data={items}
        rowCount={items.length}
        showPagination
        haveBulkDelete={false}
        toolbarLeft={
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            Daily view
          </span>
        }
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={async () => ({
              success: true,
              data: items.map((row) => ({
                staffCode: row.staffCode,
                staffName: row.staffName,
                shiftName: row.shiftName,
                startTime: row.startTime,
                endTime: row.endTime,
                dutyLocation: row.dutyLocation,
                wardUnit: row.wardUnit,
                supervisorName: row.supervisorName,
                status: row.status,
                attendance: row.attendance,
                updatedBy: row.updatedBy,
                updatedAt: row.updatedAt,
                createdBy: row.createdBy,
                createdAt: row.createdAt
              }))
            })}
            columns={[
              'Staff ID',
              'Staff Name',
              'Shift',
              'Start Time',
              'End Time',
              'Duty Location',
              'Ward / Unit',
              'Supervisor',
              'Status',
              'Attendance',
              'Updated By',
              'Updated At',
              'Created By',
              'Created At'
            ]}
            keys={[
              'staffCode',
              'staffName',
              'shiftName',
              'startTime',
              'endTime',
              'dutyLocation',
              'wardUnit',
              'supervisorName',
              'status',
              'attendance',
              'updatedBy',
              'updatedAt',
              'createdBy',
              'createdAt'
            ]}
            title="Duty Roster"
            fileName="duty-roster"
          />
        }
      />
    </Suspense>
  );
}
