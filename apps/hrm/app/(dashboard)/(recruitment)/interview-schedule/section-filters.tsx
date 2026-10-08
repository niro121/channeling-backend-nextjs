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
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_STATUSES,
  INTERVIEW_TYPE_LABELS,
  INTERVIEW_TYPES,
  VACANCY_DEPARTMENT_OPTIONS,
  type InterviewFilters
} from '@/types/recruitment';
import { SAMPLE_INTERVIEW_JOB_POST_OPTIONS } from './sample-data';

type SectionFiltersProps = {
  initial?: InterviewFilters;
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
  const jobPostOptions = SAMPLE_INTERVIEW_JOB_POST_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));
  const typeOptions = INTERVIEW_TYPES.map((id) => ({
    id,
    name: INTERVIEW_TYPE_LABELS[id]
  }));
  const statusOptions = INTERVIEW_STATUSES.map((id) => ({
    id,
    name: INTERVIEW_STATUS_LABELS[id]
  }));

  const initialValues = {
    interviewDate: initial.interviewDate ?? '',
    interviewer: initial.interviewer ?? '',
    department: initial.department ?? '__all__',
    jobPostId: initial.jobPostId ?? '__all__',
    interviewType: initial.interviewType ?? '__all__',
    status: initial.status ?? '__all__',
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
            <CustomDatePickerField
              id="int-date"
              placeholder="Date"
              value={parseFilterDate(values.interviewDate)}
              onChange={(date) => setValue('interviewDate', toYmd(date))}
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
                htmlFor="int-interviewer"
                className="text-xs uppercase text-muted-foreground"
              >
                Interviewer
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="int-interviewer"
                  className="pl-8"
                  placeholder="Search interviewer"
                  value={values.interviewer ?? ''}
                  onChange={(e) => setValue('interviewer', e.target.value)}
                />
              </div>
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
              label="Job Position"
              options={jobPostOptions}
              value={values.jobPostId ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('jobPostId', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />

            <Selector
              label="Interview Type"
              options={typeOptions}
              value={values.interviewType ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('interviewType', v)}
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

            <div className="space-y-2 sm:col-span-2">
              <Label
                htmlFor="int-search"
                className="text-xs uppercase text-muted-foreground"
              >
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="int-search"
                  className="pl-8"
                  placeholder="Search candidate, code, position…"
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
