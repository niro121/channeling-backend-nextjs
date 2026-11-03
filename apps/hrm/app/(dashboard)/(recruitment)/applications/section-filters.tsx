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
  APPLICATION_SOURCE_LABELS,
  APPLICATION_SOURCES,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUSES,
  type ApplicationFilters,
  type VacancySelectOption
} from '@/types/recruitment';

type SectionFiltersProps = {
  initial?: ApplicationFilters;
  departmentOptions?: VacancySelectOption[];
  jobPostOptions?: VacancySelectOption[];
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

function SectionFiltersInner({
  initial = {},
  departmentOptions = [],
  jobPostOptions = []
}: SectionFiltersProps) {
  const statusOptions = APPLICATION_STATUSES.map((id) => ({
    id,
    name: APPLICATION_STATUS_LABELS[id]
  }));
  const sourceOptions = APPLICATION_SOURCES.map((id) => ({
    id,
    name: APPLICATION_SOURCE_LABELS[id]
  }));

  const initialValues = {
    jobPostId: initial.jobPostId ?? '__all__',
    jobTitle: initial.jobTitle ?? '',
    candidateName: initial.candidateName ?? '',
    applicationId: initial.applicationId ?? '',
    applicationDate: initial.applicationDate ?? '',
    department: initial.department ?? '__all__',
    status: initial.status ?? '__all__',
    source: initial.source ?? '__all__',
    search: initial.search ?? ''
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
        searchButton={{
          variant: 'default',
          className: 'h-10 shrink-0 gap-2'
        }}
      >
        {({ values, setValue }) => (
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Selector
              label="Job Post"
              options={jobPostOptions}
              value={values.jobPostId ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('jobPostId', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />

            <div className="space-y-2">
              <Label
                htmlFor="app-job-title"
                className="text-xs uppercase text-muted-foreground"
              >
                Job Title
              </Label>
              <Input
                id="app-job-title"
                placeholder="Job title"
                value={values.jobTitle ?? ''}
                onChange={(e) => setValue('jobTitle', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="app-candidate"
                className="text-xs uppercase text-muted-foreground"
              >
                Candidate Name
              </Label>
              <Input
                id="app-candidate"
                placeholder="Candidate name"
                value={values.candidateName ?? ''}
                onChange={(e) => setValue('candidateName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="app-id"
                className="text-xs uppercase text-muted-foreground"
              >
                Application ID
              </Label>
              <Input
                id="app-id"
                placeholder="APP-…"
                value={values.applicationId ?? ''}
                onChange={(e) => setValue('applicationId', e.target.value)}
              />
            </div>

            <CustomDatePickerField
              id="app-date"
              placeholder="Application Date"
              value={parseFilterDate(values.applicationDate)}
              onChange={(date) => setValue('applicationDate', toYmd(date))}
              onBlur={() => undefined}
              required={false}
              useFormikError={false}
              styleClasses={{
                parentDiv: 'space-y-2',
                labelClassName: 'text-xs uppercase text-muted-foreground',
                inputClassName: 'w-full'
              }}
            />

            <Selector
              label="Department"
              options={departmentOptions}
              value={values.department ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('department', v)}
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

            <Selector
              label="Source"
              options={sourceOptions}
              value={values.source ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('source', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />

            <div className="space-y-2 sm:col-span-2 xl:col-span-4">
              <Label
                htmlFor="app-search"
                className="text-xs uppercase text-muted-foreground"
              >
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="app-search"
                  className="pl-8"
                  placeholder="Search application id, candidate, job…"
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
