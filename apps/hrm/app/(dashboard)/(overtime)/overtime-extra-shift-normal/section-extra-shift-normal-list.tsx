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
import ExtraShiftNormalFilterSection from './filter-section';
import type {
  ExtraShiftNormalFilterOption,
  ExtraShiftNormalListFilters,
  ExtraShiftNormalRecord
} from './sample-data';

type SectionExtraShiftNormalListProps = {
  records: ExtraShiftNormalRecord[];
  columns: ColumnDef<ExtraShiftNormalRecord>[];
  staffOptions: ExtraShiftNormalFilterOption[];
  approverOptions: ExtraShiftNormalFilterOption[];
  filters: ExtraShiftNormalListFilters;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

export default function SectionExtraShiftNormalList({
  records,
  columns,
  staffOptions,
  approverOptions,
  filters,
  onExport
}: SectionExtraShiftNormalListProps) {
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
            Filter extra shift forms by date range, staff, and approver.
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
            <ExtraShiftNormalFilterSection
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
        heading="Extra Shifts Register"
        subHeading="Extra shift forms matching the current filters."
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
              'Form No',
              'Staff Code',
              'Staff',
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
            title="Extra Shifts Register"
            fileName="extra-shift-normal-register"
          />
        }
      />
    </div>
  );
}
