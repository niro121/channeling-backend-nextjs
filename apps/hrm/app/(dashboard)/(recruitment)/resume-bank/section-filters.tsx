'use client';

import { Suspense } from 'react';
import { Search } from 'lucide-react';
import { Input, Label, Selector } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import {
  APPLICATION_SOURCE_LABELS,
  APPLICATION_SOURCES,
  VACANCY_DEPARTMENT_OPTIONS,
  VACANCY_DESIGNATION_OPTIONS,
  type ResumeBankFilters
} from '@/types/recruitment';
import { SAMPLE_EXPERIENCE_OPTIONS } from './sample-data';

type SectionFiltersProps = {
  initial?: ResumeBankFilters;
};

function SectionFiltersInner({ initial = {} }: SectionFiltersProps) {
  const experienceOptions = SAMPLE_EXPERIENCE_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));
  const designationOptions = VACANCY_DESIGNATION_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));
  const departmentOptions = VACANCY_DEPARTMENT_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));
  const sourceOptions = APPLICATION_SOURCES.map((id) => ({
    id,
    name: APPLICATION_SOURCE_LABELS[id]
  }));

  const initialValues = {
    skills: initial.skills ?? '',
    qualification: initial.qualification ?? '',
    location: initial.location ?? '',
    candidateName: initial.candidateName ?? '',
    experience: initial.experience ?? '__all__',
    designation: initial.designation ?? '__all__',
    department: initial.department ?? '__all__',
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
            <div className="space-y-2">
              <Label
                htmlFor="rb-skills"
                className="text-xs uppercase text-muted-foreground"
              >
                Skills
              </Label>
              <Input
                id="rb-skills"
                placeholder="Skills"
                value={values.skills ?? ''}
                onChange={(e) => setValue('skills', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="rb-qualification"
                className="text-xs uppercase text-muted-foreground"
              >
                Qualification
              </Label>
              <Input
                id="rb-qualification"
                placeholder="Qualification"
                value={values.qualification ?? ''}
                onChange={(e) => setValue('qualification', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="rb-location"
                className="text-xs uppercase text-muted-foreground"
              >
                Location
              </Label>
              <Input
                id="rb-location"
                placeholder="Location"
                value={values.location ?? ''}
                onChange={(e) => setValue('location', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="rb-candidate"
                className="text-xs uppercase text-muted-foreground"
              >
                Candidate Name
              </Label>
              <Input
                id="rb-candidate"
                placeholder="Candidate name"
                value={values.candidateName ?? ''}
                onChange={(e) => setValue('candidateName', e.target.value)}
              />
            </div>

            <Selector
              label="Experience"
              options={experienceOptions}
              value={values.experience ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('experience', v)}
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
              label="Department"
              options={departmentOptions}
              value={values.department ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('department', v)}
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
                htmlFor="rb-search"
                className="text-xs uppercase text-muted-foreground"
              >
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="rb-search"
                  className="pl-8"
                  placeholder="Search candidate, skills, position…"
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
