'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import FormExtraShift from './form-extra-shift';
import SectionExtraShiftList from './section-extra-shift-list';
import { ExtraShiftLinksCard } from './section-extra-shift-links';
import { createExtraShiftColumns } from './columns';
import type {
  ExtraShiftFilterOption,
  ExtraShiftListFilters,
  ExtraShiftRecord
} from './sample-data';

type ExtraShiftWorkspaceProps = {
  records: ExtraShiftRecord[];
  staffOptions: ExtraShiftFilterOption[];
  approverOptions: ExtraShiftFilterOption[];
  filters: ExtraShiftListFilters;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

export default function ExtraShiftWorkspace({
  records,
  staffOptions,
  approverOptions,
  filters,
  onExport
}: ExtraShiftWorkspaceProps) {
  const [selectedRecord, setSelectedRecord] = useState<ExtraShiftRecord | null>(
    null
  );

  const columns = useMemo(
    () =>
      createExtraShiftColumns({
        onEdit: (record) => setSelectedRecord(record)
      }),
    []
  ) as ColumnDef<ExtraShiftRecord>[];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="min-w-0 lg:col-span-4 2xl:col-span-3">
        <FormExtraShift
          staffOptions={staffOptions}
          approverOptions={approverOptions}
          selectedRecord={selectedRecord}
          onClearSelection={() => setSelectedRecord(null)}
        />
      </div>

      <div className="min-w-0 space-y-4 lg:col-span-8 2xl:col-span-7">
        <ExtraShiftLinksCard className="2xl:hidden" orientation="horizontal" />
        <SectionExtraShiftList
          records={records}
          columns={columns}
          staffOptions={staffOptions}
          approverOptions={approverOptions}
          filters={filters}
          onExport={onExport}
        />
      </div>

      <div className="hidden min-w-0 2xl:col-span-2 2xl:block">
        <ExtraShiftLinksCard orientation="vertical" />
      </div>
    </div>
  );
}
