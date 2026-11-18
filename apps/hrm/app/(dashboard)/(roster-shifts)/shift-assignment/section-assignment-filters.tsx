'use client';

import { Suspense } from 'react';
import { Search } from 'lucide-react';
import { Combobox, Input, Label } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import type { RosterFilterOption } from '@/types/roster';

export type AssignmentFilterValues = {
  institutionId: string;
  departmentId: string;
  unitId: string;
  designationId: string;
  staffCategoryId: string;
  staffGradeId: string;
  employeeStatusId: string;
  staffSearch: string;
};

type SectionAssignmentFiltersProps = {
  initial?: Partial<AssignmentFilterValues>;
  institutionOptions: RosterFilterOption[];
  departmentOptions: RosterFilterOption[];
  unitOptions: RosterFilterOption[];
  designationOptions: RosterFilterOption[];
  staffCategoryOptions: RosterFilterOption[];
  staffGradeOptions: RosterFilterOption[];
  employeeStatusOptions: RosterFilterOption[];
};

function SectionAssignmentFiltersInner({
  initial = {},
  institutionOptions,
  departmentOptions,
  unitOptions,
  designationOptions,
  staffCategoryOptions,
  staffGradeOptions,
  employeeStatusOptions
}: SectionAssignmentFiltersProps) {
  const initialValues = {
    institution: initial.institutionId ?? '',
    department: initial.departmentId ?? '',
    unit: initial.unitId ?? '',
    designation: initial.designationId ?? '',
    staffCategory: initial.staffCategoryId ?? '',
    staffGrade: initial.staffGradeId ?? '',
    employeeStatus: initial.employeeStatusId ?? '',
    search: initial.staffSearch ?? ''
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={Object.values(initialValues).join('|')}
        initialValues={initialValues}
        buttonLabel="Search"
        showClearButton
        preserveQueryKeys={['limit']}
        searchButton={{
          variant: 'default',
          className: 'h-10 shrink-0 gap-2'
        }}
      >
        {({ values, setValue }) => (
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Select Institution
              </Label>
              <Combobox
                label="Institution"
                options={institutionOptions}
                value={values.institution ?? ''}
                defaultValue=""
                onChange={(value) => setValue('institution', value)}
                clearable
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Select Department
              </Label>
              <Combobox
                label="Department"
                options={departmentOptions}
                value={values.department ?? ''}
                defaultValue=""
                onChange={(value) => setValue('department', value)}
                clearable
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Select Unit
              </Label>
              <Combobox
                label="Unit"
                options={unitOptions}
                value={values.unit ?? ''}
                defaultValue=""
                onChange={(value) => setValue('unit', value)}
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
                value={values.designation ?? ''}
                defaultValue=""
                onChange={(value) => setValue('designation', value)}
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
                onChange={(value) => setValue('staffCategory', value)}
                clearable
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Select Staff Grade
              </Label>
              <Combobox
                label="Staff Grade"
                options={staffGradeOptions}
                value={values.staffGrade ?? ''}
                defaultValue=""
                onChange={(value) => setValue('staffGrade', value)}
                clearable
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Select Employee Status
              </Label>
              <Combobox
                label="Employee Status"
                options={employeeStatusOptions}
                value={values.employeeStatus ?? ''}
                defaultValue=""
                onChange={(value) => setValue('employeeStatus', value)}
                clearable
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="assignment-staff-search"
                className="text-xs uppercase text-muted-foreground"
              >
                Staff Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="assignment-staff-search"
                  className="pl-8"
                  placeholder="Search staff ID or name"
                  value={values.search ?? ''}
                  onChange={(e) => setValue('search', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </FilterWrapper>
    </div>
  );
}

export default function SectionAssignmentFilters(
  props: SectionAssignmentFiltersProps
) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Loading filters...
        </div>
      }
    >
      <SectionAssignmentFiltersInner {...props} />
    </Suspense>
  );
}
