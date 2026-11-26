'use client';

import { Suspense } from 'react';
import { format } from 'date-fns';
import {
  Combobox,
  CustomDatePickerField,
  Selector
} from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import type { DepartmentReportFilterOptions } from '@/types/reports';

type SectionFiltersProps = {
  filterOptions: DepartmentReportFilterOptions;
  initial: {
    fromDate?: string;
    toDate?: string;
    institution?: string;
    departmentId?: string;
  };
  periodLabel: string;
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

function SectionFiltersInner({
  filterOptions,
  initial,
  periodLabel
}: SectionFiltersProps) {
  const initialValues = {
    fromDate: initial.fromDate ?? '',
    toDate: initial.toDate ?? '',
    institution: initial.institution ?? '__all__',
    departmentId: initial.departmentId ?? ''
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Reporting period &amp; filters
        </h2>
        <p className="text-xs text-muted-foreground">
          Selected: {periodLabel}
        </p>
      </div>

      <FilterWrapper
        key={[
          initialValues.fromDate,
          initialValues.toDate,
          initialValues.institution,
          initialValues.departmentId
        ].join('|')}
        initialValues={initialValues}
        buttonLabel="Apply Filters"
        showClearButton
        clearButtonLabel="Reset Filters"
        searchButton={{
          variant: 'default',
          className: 'h-10 w-full gap-2 sm:w-auto'
        }}
      >
        {({ values, setValue }) => (
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-2">
              <span className="text-xs uppercase text-muted-foreground">
                Reporting period from
              </span>
              <CustomDatePickerField
                id="reportFromDate"
                placeholder="From date"
                value={parseLocalDate(values.fromDate)}
                onChange={(value) => setValue('fromDate', toLocalDateIso(value))}
                onBlur={() => undefined}
                required={false}
                useFormikError={false}
                styleClasses={{
                  parentDiv: 'grid grid-cols-1 gap-2 items-start',
                  inputClassName: 'w-full'
                }}
              />
            </div>
            <div className="grid gap-2">
              <span className="text-xs uppercase text-muted-foreground">
                Period to / as of
              </span>
              <CustomDatePickerField
                id="reportToDate"
                placeholder="To date"
                value={parseLocalDate(values.toDate)}
                onChange={(value) => setValue('toDate', toLocalDateIso(value))}
                onBlur={() => undefined}
                required={false}
                useFormikError={false}
                styleClasses={{
                  parentDiv: 'grid grid-cols-1 gap-2 items-start',
                  inputClassName: 'w-full'
                }}
              />
            </div>
            <Selector
              label="Select Institution"
              options={filterOptions.institutions.filter(
                (opt) => opt.id !== '__all__'
              )}
              value={values.institution}
              defaultValue="__all__"
              onChange={(v) => setValue('institution', v)}
              className={{ trigger: 'w-full max-w-none self-end' }}
            />
            <Combobox
              label="Select Department"
              options={filterOptions.departments}
              value={values.departmentId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('departmentId', v)}
              clearable
              triggerClassName="w-full max-w-none self-end"
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
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
          Loading filters...
        </div>
      }
    >
      <SectionFiltersInner {...props} />
    </Suspense>
  );
}
