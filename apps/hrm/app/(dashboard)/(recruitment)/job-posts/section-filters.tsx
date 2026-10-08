'use client';

import { Suspense } from 'react';
import { Search } from 'lucide-react';
import {
  CustomDatePickerField,
  Input,
  Label,
  Selector
} from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import {
  JOB_POST_STATUS_LABELS,
  JOB_POST_STATUSES,
  VACANCY_DEPARTMENT_OPTIONS,
  VACANCY_DESIGNATION_OPTIONS,
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  VACANCY_EMPLOYMENT_TYPES,
  type JobPostFilters
} from '@/types/recruitment';

type SectionFiltersProps = {
  initial?: JobPostFilters;
};

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

function SectionFiltersInner({ initial = {} }: SectionFiltersProps) {
  const departmentOptions = VACANCY_DEPARTMENT_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));
  const designationOptions = VACANCY_DESIGNATION_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));
  const employmentTypeOptions = VACANCY_EMPLOYMENT_TYPES.map((id) => ({
    id,
    name: VACANCY_EMPLOYMENT_TYPE_LABELS[id]
  }));
  const statusOptions = JOB_POST_STATUSES.map((id) => ({
    id,
    name: JOB_POST_STATUS_LABELS[id]
  }));

  const initialValues = {
    jobTitle: initial.jobTitle ?? '',
    department: initial.department ?? '__all__',
    designation: initial.designation ?? '__all__',
    employmentType: initial.employmentType ?? '__all__',
    status: initial.status ?? '__all__',
    postedDate: initial.postedDate ?? '',
    closingDate: initial.closingDate ?? '',
    search: initial.search ?? ''
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={[
          initialValues.jobTitle,
          initialValues.department,
          initialValues.designation,
          initialValues.employmentType,
          initialValues.status,
          initialValues.postedDate,
          initialValues.closingDate,
          initialValues.search
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
                htmlFor="job-post-title"
                className="text-xs uppercase text-muted-foreground"
              >
                Job Title
              </Label>
              <Input
                id="job-post-title"
                placeholder="Job title"
                value={values.jobTitle ?? ''}
                onChange={(e) => setValue('jobTitle', e.target.value)}
              />
            </div>

            <Selector
              label="Department"
              options={departmentOptions}
              value={values.department ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('department', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />

            <Selector
              label="Designation"
              options={designationOptions}
              value={values.designation ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('designation', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />

            <Selector
              label="Employment Type"
              options={employmentTypeOptions}
              value={values.employmentType ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('employmentType', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
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
              id="job-posted-date"
              placeholder="Posted Date"
              value={parseFilterDate(values.postedDate)}
              onChange={(date) => setValue('postedDate', toYmd(date))}
              onBlur={() => undefined}
              required={false}
              useFormikError={false}
              styleClasses={{
                parentDiv: 'space-y-2',
                labelClassName: 'text-xs uppercase text-muted-foreground',
                inputClassName: 'w-full'
              }}
            />

            <CustomDatePickerField
              id="job-closing-date"
              placeholder="Closing Date"
              value={parseFilterDate(values.closingDate)}
              onChange={(date) => setValue('closingDate', toYmd(date))}
              onBlur={() => undefined}
              required={false}
              useFormikError={false}
              styleClasses={{
                parentDiv: 'space-y-2',
                labelClassName: 'text-xs uppercase text-muted-foreground',
                inputClassName: 'w-full'
              }}
            />

            <div className="space-y-2">
              <Label
                htmlFor="job-post-search"
                className="text-xs uppercase text-muted-foreground"
              >
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="job-post-search"
                  className="pl-8"
                  placeholder="Search job id, title, department…"
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
