'use client';

import { Suspense, useMemo } from 'react';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import type { FingerprintVerificationRow } from '@/types/attendance';
import {
  createFingerprintVerificationColumns,
  type FingerprintColumnHandlers
} from './columns';

type SectionFingerprintRegisterProps = {
  rows: FingerprintVerificationRow[];
  canEdit: boolean;
  onVerifiedChange: FingerprintColumnHandlers['onVerifiedChange'];
  onClearRow: FingerprintColumnHandlers['onClearRow'];
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

export default function SectionFingerprintRegister({
  rows,
  canEdit,
  onVerifiedChange,
  onClearRow,
  onExport
}: SectionFingerprintRegisterProps) {
  const columns = useMemo(
    () =>
      createFingerprintVerificationColumns({
        canEdit,
        onVerifiedChange,
        onClearRow
      }),
    [canEdit, onVerifiedChange, onClearRow]
  );

  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading fingerprint verification...
        </div>
      }
    >
      <CommonDataTable
        heading="Fingerprint Verification"
        subHeading="Reconcile roster allocations with device punches. Verified times are saved separately; punches stay immutable."
        columns={columns}
        data={rows}
        rowCount={rows.length}
        showPagination={false}
        groupBy="dateLabel"
        groupByDefaultExpanded
        renderGroupHeader={({ value, subRowCount }) => (
          <span className="font-semibold text-foreground">
            {String(value || 'Unknown date')}
            <span className="ml-2 font-normal text-muted-foreground">
              {subRowCount} staff
            </span>
          </span>
        )}
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={onExport}
            columns={[
              'Date',
              'No',
              'Shift',
              'Duration',
              'Staff Code',
              'ID',
              'Leave / Replace',
              'Staff Name',
              'Att. Start',
              'Exception',
              'Att. End',
              'Verified Start',
              'Verified End',
              'Status'
            ]}
            keys={[
              'date',
              'no',
              'shift',
              'duration',
              'staffCode',
              'id',
              'leaveReplace',
              'staffName',
              'attStart',
              'exception',
              'attEnd',
              'verifiedStart',
              'verifiedEnd',
              'status'
            ]}
            title="Fingerprint Verification"
            fileName="fingerprint-verification"
          />
        }
      />
    </Suspense>
  );
}
