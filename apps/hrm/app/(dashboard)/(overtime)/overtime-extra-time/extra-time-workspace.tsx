'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import FormExtraTime from './form-extra-time';
import SectionExtraTimeList from './section-extra-time-list';
import { ExtraTimeLinksCard } from './section-extra-time-links';
import { createExtraTimeColumns } from './columns';
import type {
  ExtraTimeFilterOption,
  ExtraTimeListFilters,
  ExtraTimeRecord
} from './sample-data';

type ExtraTimeWorkspaceProps = {
  records: ExtraTimeRecord[];
  staffOptions: ExtraTimeFilterOption[];
  approverOptions: ExtraTimeFilterOption[];
  filters: ExtraTimeListFilters;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

export default function ExtraTimeWorkspace({
  records,
  staffOptions,
  approverOptions,
  filters,
  onExport
}: ExtraTimeWorkspaceProps) {
  const [selectedRecord, setSelectedRecord] = useState<ExtraTimeRecord | null>(
    null
  );

  const columns = useMemo(
    () =>
      createExtraTimeColumns({
        onEdit: (record) => setSelectedRecord(record)
      }),
    []
  ) as ColumnDef<ExtraTimeRecord>[];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-4 2xl:col-span-3">
        <FormExtraTime
          staffOptions={staffOptions}
          approverOptions={approverOptions}
          selectedRecord={selectedRecord}
          onClearSelection={() => setSelectedRecord(null)}
        />
      </div>

      <div className="min-w-0 space-y-4 lg:col-span-8 2xl:col-span-7">
        <ExtraTimeLinksCard className="2xl:hidden" orientation="horizontal" />
        <SectionExtraTimeList
          records={records}
          columns={columns}
          staffOptions={staffOptions}
          approverOptions={approverOptions}
          filters={filters}
          onExport={onExport}
        />
      </div>

      <div className="hidden min-w-0 2xl:col-span-2 2xl:block">
        <ExtraTimeLinksCard orientation="vertical" />
      </div>
    </div>
  );
}
