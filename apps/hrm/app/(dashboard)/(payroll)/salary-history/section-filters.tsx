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
import { INSTITUTION_OPTIONS } from '@/types/institution';
import type {
  PaysheetStaffOption,
  SalaryFilterOption,
  SalaryHistoryFilters
} from '@/types/payroll';

type SectionFiltersProps = {
  staffOptions?: PaysheetStaffOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  periodOptions?: SalaryFilterOption[];
  componentOptions?: SalaryFilterOption[];
  initial?: SalaryHistoryFilters;
};

function parseLocalDate(iso?: string): Date | null {
  if (!iso) return null;
  const parsed = new Date(`${iso}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toLocalDateIso(value?: Date | null): string | undefined {
  if (!value) return undefined;
  return format(value, 'yyyy-MM-dd');
}

function SectionFiltersInner({
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  periodOptions = [],
  componentOptions = [],
  initial = {}
}: SectionFiltersProps) {
  const initialValues = {
    search: initial.search ?? '',
    staffId: initial.staffId ?? '',
    staffCode: initial.staffCode ?? '',
    departmentId: initial.departmentId ?? '',
    designationId: initial.designationId ?? '',
    institution: initial.institution ?? '__all__',
    salaryPeriod: initial.salaryPeriod ?? '',
    componentId: initial.componentId ?? '',
    dateFrom: initial.dateFrom ?? '',
    dateTo: initial.dateTo ?? ''
  };

  return (
    <div className="h-full rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={[
          initialValues.search,
          initialValues.staffId,
          initialValues.staffCode,
          initialValues.departmentId,
          initialValues.designationId,
          initialValues.institution,
          initialValues.salaryPeriod,
          initialValues.componentId,
          initialValues.dateFrom,
          initialValues.dateTo
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
            <div className="space-y-2">
              <Label
                htmlFor="salary-history-search"
                className="text-xs uppercase text-muted-foreground"
              >
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="salary-history-search"
                  className="pl-8"
                  placeholder="Name or code"
                  value={values.search ?? ''}
                  onChange={(e) => setValue('search', e.target.value)}
                />
              </div>
            </div>

            <Combobox
              label="Staff"
              options={staffOptions}
              value={values.staffId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('staffId', v)}
              clearable
              triggerClassName="self-end"
            />

            <div className="space-y-2">
              <Label
                htmlFor="salary-history-staff-code"
                className="text-xs uppercase text-muted-foreground"
              >
                Staff Code
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="salary-history-staff-code"
                  className="pl-8"
                  placeholder="E-0000"
                  value={values.staffCode ?? ''}
                  onChange={(e) => setValue('staffCode', e.target.value)}
                />
              </div>
            </div>

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

            <Selector
              label="Institution"
              options={INSTITUTION_OPTIONS}
              value={values.institution ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('institution', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />

            <Combobox
              label="Salary Period"
              options={periodOptions}
              value={values.salaryPeriod ?? ''}
              defaultValue=""
              onChange={(v) => setValue('salaryPeriod', v)}
              clearable
              triggerClassName="self-end"
            />

            <Combobox
              label="Salary Component"
              options={componentOptions}
              value={values.componentId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('componentId', v)}
              clearable
              triggerClassName="self-end"
            />

            <CustomDatePickerField
              id="salaryHistoryDateFrom"
              placeholder="Date From"
              value={parseLocalDate(values.dateFrom)}
              onChange={(value) => setValue('dateFrom', toLocalDateIso(value))}
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
              id="salaryHistoryDateTo"
              placeholder="Date To"
              value={parseLocalDate(values.dateTo)}
              onChange={(value) => setValue('dateTo', toLocalDateIso(value))}
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
