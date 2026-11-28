'use client';

import { Suspense } from 'react';
import { CustomDatePickerField, Input, Label, Selector } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import {
  PROBATION_REVIEW_STATUS_LABELS,
  PROBATION_REVIEW_STATUSES,
  type ProbationReviewFilters
} from '@/types/performance';

export type FilterOption = { id: string; name: string };

type SectionFiltersProps = {
  initial?: ProbationReviewFilters;
  institutionOptions?: FilterOption[];
  departmentOptions?: FilterOption[];
  designationOptions?: FilterOption[];
};

const labelClassName = 'text-xs uppercase text-muted-foreground';
const selectTriggerClass = { trigger: 'h-10 w-full max-w-none' };

function parseFilterDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toYmd(date?: Date): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function SectionFiltersInner({
  initial = {},
  institutionOptions = [],
  departmentOptions = [],
  designationOptions = []
}: SectionFiltersProps) {
  const statusOptions = PROBATION_REVIEW_STATUSES.map((id) => ({
    id,
    name: PROBATION_REVIEW_STATUS_LABELS[id]
  }));

  const initialValues = {
    staffName: initial.staffName ?? '',
    staffCode: initial.staffCode ?? '',
    institution: initial.institution ?? '__all__',
    department: initial.department ?? '__all__',
    designation: initial.designation ?? '__all__',
    reportingManager: initial.reportingManager ?? '',
    probationStartDate: initial.probationStartDate ?? '',
    probationEndDate: initial.probationEndDate ?? '',
    reviewStatus: initial.reviewStatus ?? '__all__'
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
        clearButtonLabel="Reset"
        showClearButton
        searchButton={{
          variant: 'default',
          className: 'h-10 shrink-0 gap-2'
        }}
      >
        {({ values, setValue }) => (
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="pr-staff-name" className={labelClassName}>
                Staff Name
              </Label>
              <Input
                id="pr-staff-name"
                value={values.staffName ?? ''}
                onChange={(e) => setValue('staffName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pr-staff-code" className={labelClassName}>
                Staff Code
              </Label>
              <Input
                id="pr-staff-code"
                value={values.staffCode ?? ''}
                onChange={(e) => setValue('staffCode', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className={labelClassName}>Institution</Label>
              <Selector
                label="Select Institution"
                options={institutionOptions}
                value={values.institution ?? '__all__'}
                defaultValue="__all__"
                onChange={(v) => setValue('institution', v)}
                className={selectTriggerClass}
              />
            </div>

            <div className="space-y-2">
              <Label className={labelClassName}>Department</Label>
              <Selector
                label="Select Department"
                options={departmentOptions}
                value={values.department ?? '__all__'}
                defaultValue="__all__"
                onChange={(v) => setValue('department', v)}
                className={selectTriggerClass}
              />
            </div>

            <div className="space-y-2">
              <Label className={labelClassName}>Designation</Label>
              <Selector
                label="Select Designation"
                options={designationOptions}
                value={values.designation ?? '__all__'}
                defaultValue="__all__"
                onChange={(v) => setValue('designation', v)}
                className={selectTriggerClass}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pr-reporting-manager" className={labelClassName}>
                Reporting Manager
              </Label>
              <Input
                id="pr-reporting-manager"
                value={values.reportingManager ?? ''}
                onChange={(e) => setValue('reportingManager', e.target.value)}
              />
            </div>

            <CustomDatePickerField
              id="pr-probation-start-date"
              placeholder="Probation Start Date"
              value={parseFilterDate(values.probationStartDate)}
              onChange={(date) => setValue('probationStartDate', toYmd(date))}
              onBlur={() => undefined}
              required={false}
              useFormikError={false}
              styleClasses={{
                parentDiv: 'space-y-2',
                labelClassName,
                inputClassName: 'w-full'
              }}
            />

            <CustomDatePickerField
              id="pr-probation-end-date"
              placeholder="Probation End Date"
              value={parseFilterDate(values.probationEndDate)}
              onChange={(date) => setValue('probationEndDate', toYmd(date))}
              onBlur={() => undefined}
              required={false}
              useFormikError={false}
              styleClasses={{
                parentDiv: 'space-y-2',
                labelClassName,
                inputClassName: 'w-full'
              }}
            />

            <div className="space-y-2">
              <Label className={labelClassName}>Review Status</Label>
              <Selector
                label="Select Review Status"
                options={statusOptions}
                value={values.reviewStatus ?? '__all__'}
                defaultValue="__all__"
                onChange={(v) => setValue('reviewStatus', v)}
                className={selectTriggerClass}
              />
            </div>
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
