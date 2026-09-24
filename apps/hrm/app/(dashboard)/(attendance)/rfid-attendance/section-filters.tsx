'use client';

import { Suspense } from 'react';
import { format } from 'date-fns';
import {
  Combobox,
  CustomDatePickerField,
  Selector
} from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import type { RfidAttendanceDashboard } from '@/types/attendance';

type SectionFiltersProps = {
  dashboard: RfidAttendanceDashboard;
  initial: {
    department?: string;
    location?: string;
    date?: string;
    shiftTypeId?: string;
    staffId?: string;
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

function SectionFiltersInner({ dashboard, initial }: SectionFiltersProps) {
  const initialValues = {
    department: initial.department ?? '',
    location: initial.location ?? '',
    date: initial.date ?? dashboard.date,
    shiftTypeId: initial.shiftTypeId ?? '__all__',
    staffId: initial.staffId ?? ''
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Filters
      </h2>
      <FilterWrapper
        key={[
          initialValues.department,
          initialValues.location,
          initialValues.date,
          initialValues.shiftTypeId,
          initialValues.staffId
        ].join('|')}
        initialValues={initialValues}
        buttonLabel="Apply Filters"
        showClearButton
        searchButton={{
          variant: 'default',
          className: 'h-10 w-full gap-2'
        }}
      >
        {({ values, setValue }) => (
          <div className="flex w-full flex-col gap-3">
            <Combobox
              label="Select Department"
              options={dashboard.filterOptions.departments}
              value={values.department ?? ''}
              defaultValue=""
              onChange={(v) => setValue('department', v)}
              clearable
            />
            <Combobox
              label="Select Location"
              options={dashboard.filterOptions.locations}
              value={values.location ?? ''}
              defaultValue=""
              onChange={(v) => setValue('location', v)}
              clearable
            />
            <CustomDatePickerField
              id="rfidFilterDate"
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
              label="All shifts"
              options={dashboard.filterOptions.shifts}
              value={values.shiftTypeId}
              defaultValue="__all__"
              onChange={(v) => setValue('shiftTypeId', v)}
              className={{ trigger: 'w-full max-w-none' }}
            />
            <Combobox
              label="Select Staff"
              options={dashboard.filterOptions.staff}
              value={values.staffId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('staffId', v)}
              clearable
            />
          </div>
        )}
      </FilterWrapper>
    </div>
  );
}

export default function SectionFilters(props: SectionFiltersProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Loading filters...
        </div>
      }
    >
      <SectionFiltersInner {...props} />
    </Suspense>
  );
}
