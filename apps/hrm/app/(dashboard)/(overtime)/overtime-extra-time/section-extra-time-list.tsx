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
import ExtraTimeFilterSection from './filter-section';
import type {
  ExtraTimeListFilters,
  ExtraTimeRecord,
  OvertimeFilterOption
} from '@/types/overtime';

type SectionExtraTimeListProps = {
  records: ExtraTimeRecord[];
  columns: ColumnDef<ExtraTimeRecord>[];
  staffOptions: OvertimeFilterOption[];
  approverOptions: OvertimeFilterOption[];
  filters: ExtraTimeListFilters;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

export default function SectionExtraTimeList({
  records,
  columns,
  staffOptions,
  approverOptions,
  filters,
  onExport
}: SectionExtraTimeListProps) {
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
            Filter extra time forms by date range, staff, and approver.
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
            <ExtraTimeFilterSection
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
        heading="Additional Extra Time Register"
        subHeading="Extra time forms matching the current filters."
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
              'Roster',
              'Shift Start',
              'Shift End',
              'From',
              'To',
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
              'shiftStart',
              'shiftEnd',
              'fromAt',
              'toAt',
              'approverName',
              'comment',
              'updatedByName',
              'updatedAt',
              'createdByName',
              'createdAt'
            ]}
            title="Additional Extra Time Register"
            fileName="extra-time-register"
          />
        }
      />
    </div>
  );
}
