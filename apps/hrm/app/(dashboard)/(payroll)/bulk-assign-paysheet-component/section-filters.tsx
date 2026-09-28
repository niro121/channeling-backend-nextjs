'use client';

import { Suspense } from 'react';
import { Combobox, Label, Selector, useToast } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import { INSTITUTION_OPTIONS } from '@/types/institution';
import { STAFF_CATEGORY_OPTIONS } from '@/types/staff-employment-options';
import type {
  BulkPaysheetStaffFilters,
  PaysheetStaffOption,
  SalaryFilterOption
} from '@/types/payroll';

type SectionFiltersProps = {
  staffOptions?: PaysheetStaffOption[];
  departmentOptions?: SalaryFilterOption[];
  designationOptions?: SalaryFilterOption[];
  rosterOptions?: SalaryFilterOption[];
  initial?: BulkPaysheetStaffFilters;
};

function SectionFiltersInner({
  staffOptions = [],
  departmentOptions = [],
  designationOptions = [],
  rosterOptions = [],
  initial = {}
}: SectionFiltersProps) {
  const { toast } = useToast();
  const staffCategoryOptions = STAFF_CATEGORY_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));

  const initialValues = {
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
        onApplyClick={(params) => {
          const institution = params?.get('institution')?.trim() ?? '';
          if (!institution || institution === '__all__') {
            toast({
              title: 'Institution required',
              description:
                'Select an institution before searching staff. Wide searches are blocked for performance.'
            });
          }
        }}
      >
        {({ values, setValue }) => (
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Institution
                <span className="text-red-600"> *</span>
              </Label>
              <Selector
                label="Institution"
                options={INSTITUTION_OPTIONS}
                value={values.institution}
                defaultValue="__all__"
                onChange={(v) => setValue('institution', v)}
                className={{ trigger: 'w-full max-w-none self-end' }}
              />
            </div>
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
