import { Suspense } from 'react';
import {
  BackButton,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@archmage/ui';
import {
  CommonDataTable,
  DataTableBulkDeleteFeature,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import {
  leaveApplicationColumns,
  type LeaveApplicationRecord
} from './columns';
import LeaveApplicationFilterSection from './filter-section';

type FilterOption = {
  id: string;
  name: string;
};

export type LeaveFormListFilters = {
  staffId?: string;
  leaveType?: string;
  approverId?: string;
  fromDate?: string;
  toDate?: string;
  dateSearchBy?: string;
  outWithCancel?: string;
};

type SectionLeaveFormListProps = {
  records: LeaveApplicationRecord[];
  staffOptions: FilterOption[];
  leaveTypeOptions: FilterOption[];
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

export default function SectionLeaveFormList({
  records,
  staffOptions,
  leaveTypeOptions,
  approverOptions,
  filters,
  onExport,
  onBulkDelete,
  getBulkDeleteDescription
}: SectionLeaveFormListProps) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Search Leave Forms</h2>
        <BackButton
          href="/leave-entitlement"
          label="Back to Leave Entitlement"
          className='ml-auto'
        />
      </div>

      <Card className="rounded-lg border border-border shadow-sm">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-lg font-semibold">Search & Filters</CardTitle>
          <CardDescription>
            Filter leave applications by staff, dates, type, and approval.
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
            <LeaveApplicationFilterSection
              staffOptions={staffOptions}
              leaveTypeOptions={leaveTypeOptions}
              approverOptions={approverOptions}
              staffId={filters.staffId}
              leaveType={filters.leaveType}
              approverId={filters.approverId}
              fromDate={filters.fromDate}
              toDate={filters.toDate}
              dateSearchBy={filters.dateSearchBy}
              outWithCancel={filters.outWithCancel}
            />
          </Suspense>
        </CardContent>
      </Card>

      <CommonDataTable
        heading="Application Register"
        subHeading="Leave applications matching the current filters."
        columns={leaveApplicationColumns}
        data={records}
        rowCount={records.length}
        showPagination={false}
        haveBulkDelete
        deleteServerAction={onBulkDelete}
        getBulkDeleteDescription={getBulkDeleteDescription}
        toolbarLeft={<DataTableBulkDeleteFeature />}
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            serverData={onExport}
            columns={[
              'Staff Code',
              'Staff',
              'Leave Type',
              'From',
              'To',
              'Days',
              'Approved By',
              'Approved At',
              'Status',
              'Out with Cancel',
              'Shift Date',
              'Updated By',
              'Updated At',
              'Created By',
              'Created At'
            ]}
            keys={[
              'staffCode',
              'staffName',
              'leaveType',
              'fromDate',
              'toDate',
              'days',
              'approverName',
              'approvedAt',
              'status',
              'outWithCancel',
              'shiftDate',
              'updatedBy',
              'updatedAt',
              'createdBy',
              'createdAt'
            ]}
            title="Leave Application Register"
            fileName="leave-application"
          />
        }
      />
    </div>
  );
}
