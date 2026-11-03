'use client';

import { Suspense } from 'react';
import { format } from 'date-fns';
import {
  Combobox,
  CustomDatePickerField,
  Selector
} from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import type { DailyAttendanceFilterOptions } from '@/types/attendance';

type SectionDailyFiltersProps = {
  filterOptions: DailyAttendanceFilterOptions;
  initial: {
    date?: string;
    institution?: string;
    department?: string;
    room?: string;
    staffCategory?: string;
    designation?: string;
    staffId?: string;
    shiftTypeId?: string;
    status?: string;
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

function SectionDailyFiltersInner({
  filterOptions,
  initial
}: SectionDailyFiltersProps) {
  const initialValues = {
    date: initial.date ?? '',
    institution: initial.institution ?? '__all__',
    department: initial.department ?? '',
    room: initial.room ?? '',
    staffCategory: initial.staffCategory ?? '',
    designation: initial.designation ?? '',
    staffId: initial.staffId ?? '',
    shiftTypeId: initial.shiftTypeId ?? '',
    status: initial.status ?? '__all__'
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={[
          initialValues.date,
          initialValues.institution,
          initialValues.department,
          initialValues.room,
          initialValues.staffCategory,
          initialValues.designation,
          initialValues.staffId,
          initialValues.shiftTypeId,
          initialValues.status
        ].join('|')}
        initialValues={initialValues}
        buttonLabel="Search"
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
              id="dailyAttendanceDate"
              placeholder="Date"
              value={parseLocalDate(values.date)}
              onChange={(value) => setValue('date', toLocalDateIso(value))}
              onBlur={() => undefined}
              required={false}
              useFormikError={false}
              styleClasses={{
                parentDiv: 'grid grid-cols-1 gap-2 items-start',
                labelClassName: 'text-xs uppercase text-muted-foreground',
                inputClassName: 'w-full'
              }}
            />
            <Selector
              label="Select Institution"
              options={filterOptions.institutions}
              value={values.institution}
              defaultValue="__all__"
              onChange={(v) => setValue('institution', v)}
              className={{ trigger: 'w-full max-w-none' }}
            />
            <Combobox
              label="Select Department"
              options={filterOptions.departments}
              value={values.department ?? ''}
              defaultValue=""
              onChange={(v) => setValue('department', v)}
              clearable
            />
            <Combobox
              label="Select Room"
              options={filterOptions.rooms}
              value={values.room ?? ''}
              defaultValue=""
              onChange={(v) => setValue('room', v)}
              clearable
            />
            <Combobox
              label="Select Staff Category"
              options={filterOptions.staffCategories}
              value={values.staffCategory ?? ''}
              defaultValue=""
              onChange={(v) => setValue('staffCategory', v)}
              clearable
            />
            <Combobox
              label="Select Designation"
              options={filterOptions.designations}
              value={values.designation ?? ''}
              defaultValue=""
              onChange={(v) => setValue('designation', v)}
              clearable
            />
            <Combobox
              label="Select Staff"
              options={filterOptions.staff}
              value={values.staffId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('staffId', v)}
              clearable
            />
            <Combobox
              label="Select Shift / Roster"
              options={filterOptions.shifts}
              value={values.shiftTypeId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('shiftTypeId', v)}
              clearable
            />
            <Selector
              label="Select Attendance Status"
              options={filterOptions.statuses}
              value={values.status}
              defaultValue="__all__"
              onChange={(v) => setValue('status', v)}
              className={{ trigger: 'w-full max-w-none' }}
            />
          </div>
        )}
      </FilterWrapper>
    </div>
  );
}

export default function SectionDailyFilters(props: SectionDailyFiltersProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Loading filters...
        </div>
      }
    >
      <SectionDailyFiltersInner {...props} />
    </Suspense>
  );
}
