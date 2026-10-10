'use client';

import { Suspense } from 'react';
import { format } from 'date-fns';
import {
  Combobox,
  CustomDatePickerField,
  Selector
} from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import type { AttendanceSummaryFilterOptions } from '@/types/attendance';

type SectionSummaryFiltersProps = {
  filterOptions: AttendanceSummaryFilterOptions;
  initial: {
    fromDate?: string;
    toDate?: string;
    institution?: string;
    department?: string;
    room?: string;
    staffCategory?: string;
    designation?: string;
    staffId?: string;
    shiftTypeId?: string;
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

function SectionSummaryFiltersInner({
  filterOptions,
  initial
}: SectionSummaryFiltersProps) {
  const initialValues = {
    fromDate: initial.fromDate ?? '',
    toDate: initial.toDate ?? '',
    institution: initial.institution ?? '__all__',
    department: initial.department ?? '',
    room: initial.room ?? '',
    staffCategory: initial.staffCategory ?? '',
    designation: initial.designation ?? '',
    staffId: initial.staffId ?? '',
    shiftTypeId: initial.shiftTypeId ?? ''
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
          initialValues.institution,
          initialValues.department,
          initialValues.room,
          initialValues.staffCategory,
          initialValues.designation,
          initialValues.staffId,
          initialValues.shiftTypeId
        ].join('|')}
        initialValues={initialValues}
        buttonLabel="Generate Summary"
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
              id="summaryFromDate"
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
              id="summaryToDate"
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
            <Selector
              label="Select Institution"
              options={filterOptions.institutions}
              value={values.institution}
              defaultValue="__all__"
              onChange={(v) => setValue('institution', v)}
              className={{ trigger: 'w-full max-w-none self-end' }}
            />
            <Combobox
              label="Select Department"
              options={filterOptions.departments}
              value={values.department ?? ''}
              defaultValue=""
              onChange={(v) => setValue('department', v)}
              clearable
              triggerClassName='w-full max-w-none self-end'
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
          </div>
        )}
      </FilterWrapper>
    </div>
  );
}

export default function SectionSummaryFilters(props: SectionSummaryFiltersProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Loading filters...
        </div>
      }
    >
      <SectionSummaryFiltersInner {...props} />
    </Suspense>
  );
}
