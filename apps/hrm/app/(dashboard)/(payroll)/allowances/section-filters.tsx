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
import { STAFF_CATEGORY_OPTIONS } from '@/types/staff-employment-options';
import {
  ALLOWANCE_STATUS_OPTIONS,
  ALLOWANCE_TYPE_OPTIONS,
  type AllowanceFilters,
  type SalaryFilterOption
} from '@/types/payroll';

type SectionFiltersProps = {
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  initial?: AllowanceFilters;
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
  departmentOptions = [],
  designationOptions = [],
  initial = {}
}: SectionFiltersProps) {
  const staffCategoryOptions = STAFF_CATEGORY_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));

  const typeOptions = ALLOWANCE_TYPE_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));

  const statusOptions = ALLOWANCE_STATUS_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));

  const initialValues = {
    search: initial.search ?? '',
    allowanceType: initial.allowanceType ?? '__all__',
    staffCategory: initial.staffCategory ?? '__all__',
    departmentId: initial.departmentId ?? '',
    designationId: initial.designationId ?? '',
    status: initial.status ?? '__all__',
    effectiveDate: initial.effectiveDate ?? ''
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={[
          initialValues.search,
          initialValues.allowanceType,
          initialValues.staffCategory,
          initialValues.departmentId,
          initialValues.designationId,
          initialValues.status,
          initialValues.effectiveDate
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
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label
                htmlFor="allowance-search"
                className="text-xs uppercase text-muted-foreground"
              >
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="allowance-search"
                  className="pl-8"
                  placeholder="Code or name"
                  value={values.search ?? ''}
                  onChange={(e) => setValue('search', e.target.value)}
                />
              </div>
            </div>

            <Selector
              label="Allowance Type"
              options={typeOptions}
              value={values.allowanceType ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('allowanceType', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />

            <Selector
              label="Staff Category"
              options={staffCategoryOptions}
              value={values.staffCategory ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('staffCategory', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
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

            <Selector
              label="Status"
              options={statusOptions}
              value={values.status ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('status', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />

            <CustomDatePickerField
              id="allowanceEffectiveDate"
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
