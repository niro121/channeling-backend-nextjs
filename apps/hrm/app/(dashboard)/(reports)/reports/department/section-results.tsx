'use client';

import { Suspense, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Selector } from '@archmage/ui';
import {
  CommonDataTable,
  DataTableExportFeature
} from '@/components/common/common-data-table';
import { cn } from '@/lib/utils';
import {
  DEPARTMENT_REPORT_CATEGORIES,
  type DepartmentReportRow
} from '@/types/reports';
import { departmentReportColumns } from './columns';

type SectionResultsProps = {
  rows: DepartmentReportRow[];
  totalRecords: number;
  page?: string;
  periodLabel: string;
  category?: string;
  keyword?: string;
  onExport: () => Promise<{
    success: boolean;
    message?: string;
    data?: Record<string, unknown>[];
  }>;
};

function SectionResultsInner({
  rows,
  totalRecords,
  page,
  periodLabel,
  category,
  keyword,
  onExport
}: SectionResultsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateQuery = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Report results</h2>
          <p className="text-xs text-muted-foreground">
            {periodLabel} · {totalRecords} records
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Selector
            label="Report category"
            options={[...DEPARTMENT_REPORT_CATEGORIES]}
            value={category || 'department_staff_summary'}
            defaultValue="department_staff_summary"
            showDefaultOption={false}
            onChange={(value) =>
              updateQuery('category', value || 'department_staff_summary')
            }
            className={{ trigger: 'w-[260px] max-w-full' }}
          />
          <div className="grid min-w-[220px] gap-1.5">
            <label
              htmlFor="reportKeyword"
              className="text-xs uppercase text-muted-foreground"
            >
              Search results
            </label>
            <input
              id="reportKeyword"
              defaultValue={keyword ?? ''}
              placeholder="Search generated report..."
              disabled={isPending}
              className={cn(
                'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
                'ring-offset-background placeholder:text-muted-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  updateQuery(
                    'keyword',
                    (event.target as HTMLInputElement).value.trim() || undefined
                  );
                }
              }}
              onBlur={(event) => {
                const next = event.target.value.trim();
                if (next !== (keyword ?? '')) {
                  updateQuery('keyword', next || undefined);
                }
              }}
            />
          </div>
        </div>
      </div>

      <CommonDataTable
        heading="Department-wise Staff Summary"
        subHeading={`${totalRecords} department records for the selected filters.`}
        columns={departmentReportColumns}
        data={rows}
        rowCount={totalRecords}
        page={page}
        showPagination
        toolbarRight={
          <DataTableExportFeature
            showColumnToggle
            showPrintButton
            serverData={onExport}
            columns={[
              'Department Code',
              'Department Name',
              'Institution',
              'Department Head',
              'Total Staff',
              'Active Staff',
              'Inactive Staff',
              'Vacancies',
              'Present Staff',
              'Absent Staff',
              'Leave Count',
              'Total OT Hours',
              'Payroll Expenditure',
              'Status'
            ]}
            keys={[
              'departmentCode',
              'departmentName',
              'institution',
              'departmentHead',
              'totalStaff',
              'activeStaff',
              'inactiveStaff',
              'vacancies',
              'presentStaff',
              'absentStaff',
              'leaveCount',
              'totalOtHours',
              'payrollExpenditure',
              'status'
            ]}
            title="Department Reports"
            fileName="department-reports"
          />
        }
      />
    </div>
  );
}

export default function SectionResults(props: SectionResultsProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          Loading report results...
        </div>
      }
    >
      <SectionResultsInner {...props} />
    </Suspense>
  );
}
