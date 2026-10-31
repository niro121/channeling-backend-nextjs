'use client';

import { Suspense } from 'react';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import {
  Combobox,
  CustomDatePickerField,
  Input,
  Label,
  Selector
} from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import type { AttendanceLogFilterOptions } from '@/types/attendance';

type SectionLogFiltersProps = {
  filterOptions: AttendanceLogFilterOptions;
  initial: {
    fromDate?: string;
    toDate?: string;
    staffSearch?: string;
    department?: string;
    actionType?: string;
    attendanceStatus?: string;
    source?: string;
    performedById?: string;
  };
};

function parseLocalDate(iso?: string): Date | null {
  if (!iso?.trim()) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toLocalDateIso(value?: Date | null): string | undefined {
  if (!value) return undefined;
  return format(value, 'yyyy-MM-dd');
}

function withAll(options: { id: string; name: string }[]) {
  return [{ id: '__all__', name: 'All' }, ...options];
}

function SectionLogFiltersInner({
  filterOptions,
  initial
}: SectionLogFiltersProps) {
  const initialValues = {
    fromDate: initial.fromDate ?? '',
    toDate: initial.toDate ?? '',
    staffSearch: initial.staffSearch ?? '',
    department: initial.department ?? '',
    actionType: initial.actionType ?? '__all__',
    attendanceStatus: initial.attendanceStatus ?? '__all__',
    source: initial.source ?? '__all__',
    performedById: initial.performedById ?? ''
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={[
          initialValues.fromDate,
          initialValues.toDate,
          initialValues.staffSearch,
          initialValues.department,
          initialValues.actionType,
          initialValues.attendanceStatus,
          initialValues.source,
          initialValues.performedById
        ].join('|')}
        initialValues={initialValues}
        buttonLabel="Search Logs"
        showClearButton
        clearButtonLabel="Reset"
        searchButton={{
          variant: 'default',
          className: 'h-10 w-full gap-2'
        }}
      >
        {({ values, setValue }) => (
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <CustomDatePickerField
              id="logFromDate"
              placeholder="From Date"
              value={parseLocalDate(values.fromDate)}
              onChange={(value) => setValue('fromDate', toLocalDateIso(value))}
              onBlur={() => undefined}
              required={false}
              useFormikError={false}
              styleClasses={{
                parentDiv: 'grid grid-cols-1 gap-2 items-start',
                labelClassName: 'text-xs uppercase text-muted-foreground',
                inputClassName: 'w-full'
              }}
            />
            <CustomDatePickerField
              id="logToDate"
              placeholder="To Date"
              value={parseLocalDate(values.toDate)}
              onChange={(value) => setValue('toDate', toLocalDateIso(value))}
              onBlur={() => undefined}
              required={false}
              useFormikError={false}
              styleClasses={{
                parentDiv: 'grid grid-cols-1 gap-2 items-start',
                labelClassName: 'text-xs uppercase text-muted-foreground',
                inputClassName: 'w-full'
              }}
            />
            <div className="space-y-2">
              <Label
                htmlFor="log-staff-search"
                className="text-xs uppercase text-muted-foreground"
              >
                Staff
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="log-staff-search"
                  className="pl-9"
                  placeholder="Search name or code"
                  value={values.staffSearch ?? ''}
                  onChange={(e) => setValue('staffSearch', e.target.value)}
                />
              </div>
            </div>
            <Combobox
              label="Select Department"
              options={filterOptions.departments}
              value={values.department ?? ''}
              defaultValue=""
              onChange={(v) => setValue('department', v)}
              clearable
              triggerClassName="w-full max-w-none self-end"
            />
            <Selector
              label="Select Action Type"
              options={withAll(filterOptions.actionTypes)}
              value={values.actionType}
              defaultValue="__all__"
              onChange={(v) => setValue('actionType', v)}
              className={{ trigger: 'w-full max-w-none self-end' }}
            />
            <Selector
              label="Select Attendance Status"
              options={withAll(filterOptions.attendanceStatuses)}
              value={values.attendanceStatus}
              defaultValue="__all__"
              onChange={(v) => setValue('attendanceStatus', v)}
              className={{ trigger: 'w-full max-w-none self-end' }}
            />
            <Selector
              label="Select Source"
              options={withAll(filterOptions.sources)}
              value={values.source}
              defaultValue="__all__"
              onChange={(v) => setValue('source', v)}
              className={{ trigger: 'w-full max-w-none self-end' }}
            />
            <Combobox
              label="Select User"
              options={filterOptions.users}
              value={values.performedById ?? ''}
              defaultValue=""
              onChange={(v) => setValue('performedById', v)}
              clearable
              triggerClassName="w-full max-w-none self-end"
            />
          </div>
        )}
      </FilterWrapper>
    </div>
  );
}

export default function SectionLogFilters(props: SectionLogFiltersProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Loading filters...
        </div>
      }
    >
      <SectionLogFiltersInner {...props} />
    </Suspense>
  );
}
