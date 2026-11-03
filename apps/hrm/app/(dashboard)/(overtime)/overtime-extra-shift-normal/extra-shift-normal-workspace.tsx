'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import FormExtraShiftNormal from './form-extra-shift-normal';
import SectionExtraShiftNormalList from './section-extra-shift-normal-list';
import { ExtraShiftNormalLinksCard } from './section-extra-shift-normal-links';
import { createExtraShiftNormalColumns } from './columns';
import type {
  ExtraShiftNormalFilterOption,
  ExtraShiftNormalListFilters,
  ExtraShiftNormalRecord
} from './sample-data';

type ExtraShiftNormalWorkspaceProps = {
  records: ExtraShiftNormalRecord[];
  staffOptions: ExtraShiftNormalFilterOption[];
  approverOptions: ExtraShiftNormalFilterOption[];
  filters: ExtraShiftNormalListFilters;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

export default function ExtraShiftNormalWorkspace({
  records,
  staffOptions,
  approverOptions,
  filters,
  onExport
}: ExtraShiftNormalWorkspaceProps) {
  const [selectedRecord, setSelectedRecord] =
    useState<ExtraShiftNormalRecord | null>(null);

  const columns = useMemo(
    () =>
      createExtraShiftNormalColumns({
        onEdit: (record) => setSelectedRecord(record)
      }),
    []
  ) as ColumnDef<ExtraShiftNormalRecord>[];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-4 2xl:col-span-3">
        <FormExtraShiftNormal
          staffOptions={staffOptions}
          approverOptions={approverOptions}
          selectedRecord={selectedRecord}
          onClearSelection={() => setSelectedRecord(null)}
        />
      </div>

      <div className="min-w-0 space-y-4 lg:col-span-8 2xl:col-span-7">
        <ExtraShiftNormalLinksCard
          className="2xl:hidden"
          orientation="horizontal"
        />
        <SectionExtraShiftNormalList
          records={records}
          columns={columns}
          staffOptions={staffOptions}
          approverOptions={approverOptions}
          filters={filters}
          onExport={onExport}
        />
      </div>

      <div className="hidden min-w-0 2xl:col-span-2 2xl:block">
        <ExtraShiftNormalLinksCard orientation="vertical" />
      </div>
    </div>
  );
}
