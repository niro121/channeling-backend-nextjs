'use client';

import { Suspense } from 'react';
import { format } from 'date-fns';
import {
  Combobox,
  CustomDatePickerField,
  Selector
} from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import { INSTITUTION_OPTIONS } from '@/types/institution';
import { STAFF_CATEGORY_OPTIONS } from '@/types/staff-employment-options';
import type { PaysheetComponentOption } from '@/types/paysheet-component';
import type {
  LoanAdvanceFilters,
  PaysheetStaffOption,
  SalaryFilterOption
} from '@/types/payroll';

type SectionFiltersProps = {
  componentOptions?: PaysheetComponentOption[];
  staffOptions?: PaysheetStaffOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  rosterOptions?: SalaryFilterOption[];
  initial?: LoanAdvanceFilters;
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
  componentOptions = [],
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  rosterOptions = [],
  initial = {}
}: SectionFiltersProps) {
  const staffCategoryOptions = STAFF_CATEGORY_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));

  const initialValues = {
    fromDate: initial.fromDate ?? '',
    componentId: initial.componentId ?? '',
    staffId: initial.staffId ?? '',
    departmentId: initial.departmentId ?? '',
    institution: initial.institution ?? '__all__',
    staffCategory: initial.staffCategory ?? '',
    designationId: initial.designationId ?? '',
    rosterId: initial.rosterId ?? ''
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={[
          initialValues.fromDate,
          initialValues.componentId,
          initialValues.staffId,
          initialValues.departmentId,
          initialValues.institution,
          initialValues.staffCategory,
          initialValues.designationId,
          initialValues.rosterId
        ].join('|')}
        initialValues={initialValues}
        buttonLabel="Search"
        showClearButton
        searchButton={{
          variant: 'default',
          className: 'h-10 shrink-0 gap-2'
        }}
      >
        {({ values, setValue }) => (
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <CustomDatePickerField
              id="loanFromDate"
              placeholder="From"
              value={parseLocalDate(values.fromDate)}
              onChange={(value) =>
                setValue('fromDate', toLocalDateIso(value))
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
            <Combobox
              label="Component"
              options={componentOptions}
              value={values.componentId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('componentId', v)}
              clearable
              triggerClassName="self-end"
            />
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
            <Selector
              label="Institution"
              options={INSTITUTION_OPTIONS}
              value={values.institution}
              defaultValue="__all__"
              onChange={(v) => setValue('institution', v)}
              className={{ trigger: 'w-full max-w-none self-end' }}
            />
            <Combobox
              label="Staff Category"
              options={staffCategoryOptions}
              value={values.staffCategory ?? ''}
              defaultValue=""
              onChange={(v) => setValue('staffCategory', v)}
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
            <Combobox
              label="Roster"
              options={rosterOptions}
              value={values.rosterId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('rosterId', v)}
              clearable
              triggerClassName="self-end"
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
