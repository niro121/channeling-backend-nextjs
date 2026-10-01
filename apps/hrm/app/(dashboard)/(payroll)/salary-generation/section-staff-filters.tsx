'use client';

import { Suspense } from 'react';
import { Button, Combobox, Selector, Separator } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import { INSTITUTION_OPTIONS } from '@/types/institution';
import { STAFF_CATEGORY_OPTIONS } from '@/types/staff-employment-options';
import type {
  SalaryFilterOption,
  SalaryGenerationFillMode,
  SalaryGenerationStaffFilters
} from '@/types/payroll';
import { Label } from '@archmage/ui';

type FilterValues = Record<string, string | undefined>;

type SectionStaffFiltersProps = {
  staffOptions?: SalaryFilterOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  rosterOptions?: SalaryFilterOption[];
  initial?: SalaryGenerationStaffFilters;
  busy?: boolean;
  onFill?: (mode: SalaryGenerationFillMode) => void;
  onValuesChange?: (values: FilterValues) => void;
};

const FILL_ACTIONS: Array<{ id: SalaryGenerationFillMode; label: string }> = [
  { id: 'all', label: 'Fill All Staff' },
  { id: 'not-generated', label: 'Fill Salary Not Generated Staff Only' },
  { id: 'generated', label: 'Fill Salary Generated Staff Only' },
  { id: 'resigned', label: 'Fill Resigned Staff' }
];

function SectionStaffFiltersInner({
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  rosterOptions = [],
  initial = {},
  busy = false,
  onFill,
  onValuesChange
}: SectionStaffFiltersProps) {
  const staffCategoryOptions = STAFF_CATEGORY_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));

  const initialValues = {
    staffId: initial.staffId ?? '',
    institution: initial.institution ?? '__all__',
    departmentId: initial.departmentId ?? '',
    staffCategory: initial.staffCategory ?? '',
    designationId: initial.designationId ?? '',
    rosterId: initial.rosterId ?? ''
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILL_ACTIONS.map((action) => (
          <Button
            key={action.id}
            type="button"
            size="sm"
            variant="outline"
            className="h-9"
            disabled={busy}
            onClick={() => onFill?.(action.id)}
          >
            {action.label}
          </Button>
        ))}
      </div>

      <Separator />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Select Staff To Generate Salary For
      </h2>

      <FilterWrapper
        key={[
          initialValues.staffId,
          initialValues.institution,
          initialValues.departmentId,
          initialValues.staffCategory,
          initialValues.designationId,
          initialValues.rosterId
        ].join('|')}
        initialValues={initialValues}
        buttonLabel="Search"
        showClearButton
        onValuesChange={onValuesChange}
        searchButton={{
          variant: 'default',
          className: 'h-10 shrink-0 gap-2'
        }}
      >
        {({ values, setValue }) => (
          <>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Select Employee
              </Label>
              <Combobox
                label="Employee"
                options={staffOptions}
                value={values.staffId ?? ''}
                defaultValue=""
                onChange={(v) => setValue('staffId', v)}
                clearable
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Select Institution
              </Label>
              <Selector
                label="Institution"
                options={INSTITUTION_OPTIONS}
                value={values.institution}
                defaultValue="__all__"
                onChange={(v) => setValue('institution', v)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Select Department
              </Label>
              <Combobox
                label="Department"
                options={departmentOptions}
                value={values.departmentId ?? ''}
                defaultValue=""
                onChange={(v) => setValue('departmentId', v)}
                clearable
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Select Staff Category
              </Label>
              <Combobox
                label="Staff Category"
                options={staffCategoryOptions}
                value={values.staffCategory ?? ''}
                defaultValue=""
                onChange={(v) => setValue('staffCategory', v)}
                clearable
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Select Designation
              </Label>
              <Combobox
                label="Designation"
                options={designationOptions}
                value={values.designationId ?? ''}
                defaultValue=""
                onChange={(v) => setValue('designationId', v)}
                clearable
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Select Roster
              </Label>
              <Combobox
                label="Roster"
                options={rosterOptions}
                value={values.rosterId ?? ''}
                defaultValue=""
                onChange={(v) => setValue('rosterId', v)}
                clearable
              />
            </div>
          </>
        )}
      </FilterWrapper>
    </div>
  );
}

export default function SectionStaffFilters(props: SectionStaffFiltersProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Loading filters...
        </div>
      }
    >
      <SectionStaffFiltersInner {...props} />
    </Suspense>
  );
}
