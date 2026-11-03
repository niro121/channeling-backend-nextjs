'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import FormLeaveDetails, {
  type LeaveTypeFormOption
} from './form-leave-details';
import SectionApplicationList, {
  type LeaveFormListFilters
} from './section-leave-form-list';
import { createLeaveApplicationColumns } from './columns';
import type { LeaveApplicationRecord } from '@/types/leave';

type FilterOption = {
  id: string;
  name: string;
};

type LeaveApplicationWorkspaceProps = {
  records: LeaveApplicationRecord[];
  staffOptions: FilterOption[];
  leaveTypeOptions: LeaveTypeFormOption[];
  filterLeaveTypeOptions: FilterOption[];
  approverOptions: FilterOption[];
  filters: LeaveFormListFilters;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
  onBulkDelete: (ids: string[]) => Promise<boolean>;
  getBulkDeleteDescription: (ids: string[]) => Promise<string>;
};

export default function LeaveApplicationWorkspace({
  records,
  staffOptions,
  leaveTypeOptions,
  filterLeaveTypeOptions,
  approverOptions,
  filters,
  onExport,
  onBulkDelete,
  getBulkDeleteDescription
}: LeaveApplicationWorkspaceProps) {
  const [selectedRecord, setSelectedRecord] =
    useState<LeaveApplicationRecord | null>(null);

  const columns = useMemo(
    () =>
      createLeaveApplicationColumns({
        onEdit: (record) => setSelectedRecord(record),
        onDeleted: () => setSelectedRecord(null)
      }),
    []
  ) as ColumnDef<LeaveApplicationRecord>[];

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-4">
        <FormLeaveDetails
          staffOptions={staffOptions}
          leaveTypeOptions={leaveTypeOptions}
          approverOptions={approverOptions}
          selectedRecord={selectedRecord}
          onClearSelection={() => setSelectedRecord(null)}
        />
      </div>

      <div className="min-w-0 lg:col-span-8">
        <SectionApplicationList
          records={records}
          columns={columns}
          staffOptions={staffOptions}
          leaveTypeOptions={filterLeaveTypeOptions}
          approverOptions={approverOptions}
          filters={filters}
          onExport={onExport}
          onBulkDelete={onBulkDelete}
          getBulkDeleteDescription={getBulkDeleteDescription}
        />
      </div>
    </div>
  );
}
