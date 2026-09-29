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
import { STAFF_CATEGORY_OPTIONS } from '@/types/staff-employment-options';
import {
  SALARY_STRUCTURE_STATUS_OPTIONS,
  type SalaryFilterOption,
  type SalaryStructureFilters
} from '@/types/payroll';

type SectionFiltersProps = {
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  structureOptions?: SalaryFilterOption[];
  initial?: SalaryStructureFilters;
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
  structureOptions = [],
  initial = {}
}: SectionFiltersProps) {
  const staffCategoryOptions = STAFF_CATEGORY_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));

  const statusOptions = SALARY_STRUCTURE_STATUS_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));

  const initialValues = {
    search: initial.search ?? '',
    institution: initial.institution ?? '__all__',
    departmentId: initial.departmentId ?? '',
    staffCategory: initial.staffCategory ?? '',
    designationId: initial.designationId ?? '',
    structureId: initial.structureId ?? '',
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
          initialValues.institution,
          initialValues.departmentId,
          initialValues.staffCategory,
          initialValues.designationId,
          initialValues.structureId,
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
                htmlFor="salary-structure-search"
                className="text-xs uppercase text-muted-foreground"
              >
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="salary-structure-search"
                  className="pl-8"
                  placeholder="Code or name"
                  value={values.search ?? ''}
                  onChange={(e) => setValue('search', e.target.value)}
                />
              </div>
            </div>

            <Selector
              label="Institution"
              options={INSTITUTION_OPTIONS}
              value={values.institution ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('institution', v)}
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
              label="Salary Structure"
              options={structureOptions}
              value={values.structureId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('structureId', v)}
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
              id="salaryStructureEffectiveDate"
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
