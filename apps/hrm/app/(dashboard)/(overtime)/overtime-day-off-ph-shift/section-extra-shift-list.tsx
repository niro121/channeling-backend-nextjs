import { Suspense } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BackButton,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import ExtraShiftFilterSection from './filter-section';
import type {
  ExtraShiftFilterOption,
  ExtraShiftListFilters,
  ExtraShiftRecord
} from './sample-data';

type SectionExtraShiftListProps = {
  records: ExtraShiftRecord[];
  columns: ColumnDef<ExtraShiftRecord>[];
  staffOptions: ExtraShiftFilterOption[];
  approverOptions: ExtraShiftFilterOption[];
  filters: ExtraShiftListFilters;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

export default function SectionExtraShiftList({
  records,
  columns,
  staffOptions,
  approverOptions,
  filters,
  onExport
}: SectionExtraShiftListProps) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Search Forms</h2>
        <BackButton
          href="/overtime-requests"
          label="Back to OT Requests"
          className="ml-auto"
        />
      </div>

      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-lg font-semibold">Search Forms</CardTitle>
          <CardDescription>
            Filter Day Off / PH shift forms by date range, staff, and approver.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="h-10 text-sm text-muted-foreground">
                Loading filters...
              </div>
            }
          >
            <ExtraShiftFilterSection
              staffOptions={staffOptions}
              approverOptions={approverOptions}
              staffId={filters.staffId}
              approverId={filters.approverId}
              fromDate={filters.fromDate}
              toDate={filters.toDate}
            />
          </Suspense>
        </CardContent>
      </Card>

      <CommonDataTable
        heading="Day Off / PH Shift Register"
        subHeading="Day Off / PH shift forms matching the current filters."
        columns={columns}
        data={records}
        rowCount={records.length}
        showPagination={true}
        headingRight={
          <Button type="button" variant="outline" size="sm" className="h-8">
            Approval workflow
          </Button>
        }
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={onExport}
            columns={[
              'ID',
              'Staff Code',
              'Staff',
              'Type',
              'Roster',
              'From',
              'To',
              'Shift Start',
              'Shift End',
              'Approved By',
              'Comment',
              'Updated By',
              'Updated At',
              'Created By',
              'Created At'
            ]}
            keys={[
              'formNumber',
              'staffCode',
              'staffName',
              'shiftType',
              'roster',
              'fromAt',
              'toAt',
              'shiftStart',
              'shiftEnd',
              'approverName',
              'comment',
              'updatedByName',
              'updatedAt',
              'createdByName',
              'createdAt'
            ]}
            title="Day Off / PH Shift Register"
            fileName="day-off-ph-shift-register"
          />
        }
      />
    </div>
  );
}
