'use client';

import { Suspense } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import { Button } from '@archmage/ui';
import type { DutyRosterRow, DutyRosterViewMode } from '@/types/roster';
import { dutyRangeLabel, formatDutyDateLabel } from '@/lib/utils/duty-roster-view';
import { getDutyRosterColumns } from './columns';

type SectionDutyRegisterProps = {
  items: DutyRosterRow[];
  totalRecords: number;
  page?: string;
  dutyDate: Date;
  viewMode: DutyRosterViewMode;
  onViewChange: (mode: DutyRosterViewMode) => void;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

const VIEW_LABELS: Record<DutyRosterViewMode, string> = {
  daily: 'Daily view',
  weekly: 'Weekly view',
  monthly: 'Monthly view'
};

export default function SectionDutyRegister({
  items,
  totalRecords,
  page,
  dutyDate,
  viewMode,
  onViewChange,
  onExport
}: SectionDutyRegisterProps) {
  const dateLabel = dutyRangeLabel(dutyDate, viewMode);
  const grouped = viewMode !== 'daily';
  const showDate = grouped;
  const exportColumns = [
    ...(showDate ? ['Duty Date'] : []),
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
  ];
  const exportKeys = [
    ...(showDate ? ['date'] : []),
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
  ];

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
        subHeading={
          viewMode === 'daily'
            ? 'Daily duty list from the same allocations as Shift Roster.'
            : 'Date-range duty list grouped by duty date. Same allocations as Shift Roster.'
        }
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
                onClick={() => onViewChange(mode)}
              >
                {label}
              </Button>
            ))}
          </div>
        }
        columns={getDutyRosterColumns(showDate)}
        data={items}
        rowCount={totalRecords}
        page={page}
        showPagination={!grouped}
        haveBulkDelete={false}
        groupBy={grouped ? 'date' : undefined}
        groupByDefaultExpanded
        renderGroupHeader={({ value, subRowCount }) => (
          <span className="font-semibold text-foreground">
            {formatDutyDateLabel(String(value ?? ''))}
            <span className="ml-2 font-normal text-muted-foreground">
              {subRowCount} {subRowCount === 1 ? 'duty' : 'duties'}
            </span>
          </span>
        )}
        toolbarLeft={
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            {VIEW_LABELS[viewMode]}
          </span>
        }
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={onExport}
            columns={exportColumns}
            keys={exportKeys}
            title="Duty Roster"
            fileName="duty-roster"
          />
        }
      />
    </Suspense>
  );
}
