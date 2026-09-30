'use client';

import { Suspense } from 'react';
import { format } from 'date-fns';
import {
  Combobox,
  CustomDatePickerField
} from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import type {
  PerformanceAllowanceFilters,
  PaysheetStaffOption,
  SalaryFilterOption
} from '@/types/payroll';

type SectionFiltersProps = {
  staffOptions?: PaysheetStaffOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  initial?: PerformanceAllowanceFilters;
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
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  initial = {}
}: SectionFiltersProps) {
  const initialValues = {
    staffId: initial.staffId ?? '',
    departmentId: initial.departmentId ?? '',
    designationId: initial.designationId ?? '',
    effectiveDate: initial.effectiveDate ?? ''
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={[
          initialValues.staffId,
          initialValues.departmentId,
          initialValues.designationId,
          initialValues.effectiveDate
        ].join('|')}
        initialValues={initialValues}
        buttonLabel="Search"
        showClearButton
        preserveQueryKeys={['mode']}
        searchButton={{
          variant: 'default',
          className: 'h-10 shrink-0 gap-2'
        }}
      >
        {({ values, setValue }) => (
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Combobox
              label="Employee"
              options={staffOptions}
              value={values.staffId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('staffId', v)}
              clearable
              triggerClassName="self-end"
            />
            <Combobox
              label="Department"
              options={departmentOptions}
              value={values.departmentId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('departmentId', v)}
              clearable
              triggerClassName="self-end"
            />
            <Combobox
              label="Designation"
              options={designationOptions}
              value={values.designationId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('designationId', v)}
              clearable
              triggerClassName="self-end"
            />
            <CustomDatePickerField
              id="performanceEffectiveDate"
              placeholder="Effective Date"
              value={parseLocalDate(values.effectiveDate)}
              onChange={(value) =>
                setValue('effectiveDate', toLocalDateIso(value))
              }
              onBlur={() => undefined}
              required={false}
              useFormikError={false}
              styleClasses={{
                parentDiv: 'grid grid-cols-1 gap-2 items-start',
                labelClassName: 'text-xs uppercase text-muted-foreground',
                inputClassName: 'w-full'
              }}
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
