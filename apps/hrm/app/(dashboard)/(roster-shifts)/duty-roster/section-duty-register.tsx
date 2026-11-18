'use client';

import { Suspense } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type { DutyRosterRow, DutyRosterViewMode } from '@/types/roster';
import { dutyRangeLabel } from '@/lib/utils/duty-roster-view';
import { getDutyRosterColumns } from './columns';
import SectionDutyViewToolbar from './section-duty-view-toolbar';

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

export default function SectionDutyRegister({
  items,
  totalRecords,
  page,
  dutyDate,
  viewMode,
  onViewChange,
  onExport
}: SectionDutyRegisterProps) {
  const dateLabel = dutyRangeLabel(dutyDate, 'list');
  const exportColumns = [
    'Staff ID',
    'Staff Name',
    'Shift',
    'Duty Date',
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
    'staffCode',
    'staffName',
    'shiftName',
    'date',
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
        subHeading="List of duty shifts grouped by staff. Same allocations as Shift Roster."
        headingRight={
          <SectionDutyViewToolbar
            viewMode={viewMode}
            onViewChange={onViewChange}
          />
        }
        columns={getDutyRosterColumns({ groupedByStaff: true })}
        data={items}
        rowCount={totalRecords}
        page={page}
        showPagination
        haveBulkDelete={false}
        groupBy="staffId"
        groupByDefaultExpanded
        renderGroupHeader={({ row, subRowCount }) => {
          const sample = (row.subRows[0]?.original ??
            row.original) as DutyRosterRow | undefined;
          const code = sample?.staffCode?.trim() || '';
          const name = sample?.staffName?.trim() || 'Unknown staff';
          return (
            <span className="font-semibold text-foreground">
              {code ? (
                <>
                  <span className="tabular-nums">{code}</span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                </>
              ) : null}
              {name}
              <span className="ml-2 font-normal text-muted-foreground">
                {subRowCount} {subRowCount === 1 ? 'duty' : 'duties'}
              </span>
            </span>
          );
        }}
        toolbarLeft={
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            List view
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
