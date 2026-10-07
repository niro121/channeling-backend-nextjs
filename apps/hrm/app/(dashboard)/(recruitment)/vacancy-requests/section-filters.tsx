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
  VACANCY_DEPARTMENT_OPTIONS,
  VACANCY_DESIGNATION_OPTIONS,
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  VACANCY_EMPLOYMENT_TYPES,
  VACANCY_REQUEST_STATUS_LABELS,
  VACANCY_REQUEST_STATUSES,
  type VacancyRequestFilters
} from '@/types/recruitment';

type SectionFiltersProps = {
  initial?: VacancyRequestFilters;
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

  const statusOptions = VACANCY_REQUEST_STATUSES.map((id) => ({
    id,
    name: VACANCY_REQUEST_STATUS_LABELS[id]
  }));

  const initialValues = {
    requestId: initial.requestId ?? '',
    department: initial.department ?? '__all__',
    designation: initial.designation ?? '__all__',
    employmentType: initial.employmentType ?? '__all__',
    requestedBy: initial.requestedBy ?? '',
    requestDate: initial.requestDate ?? '',
    requiredDate: initial.requiredDate ?? '',
    status: initial.status ?? '__all__',
    search: initial.search ?? ''
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={[
          initialValues.requestId,
          initialValues.department,
          initialValues.designation,
          initialValues.employmentType,
          initialValues.requestedBy,
          initialValues.requestDate,
          initialValues.requiredDate,
          initialValues.status,
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
                htmlFor="vacancy-request-id"
                className="text-xs uppercase text-muted-foreground"
              >
                Request ID
              </Label>
              <Input
                id="vacancy-request-id"
                placeholder="VR-2026-…"
                value={values.requestId ?? ''}
                onChange={(e) => setValue('requestId', e.target.value)}
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

            <div className="space-y-2">
              <Label
                htmlFor="vacancy-requested-by"
                className="text-xs uppercase text-muted-foreground"
              >
                Requested By
              </Label>
              <Input
                id="vacancy-requested-by"
                placeholder="Name"
                value={values.requestedBy ?? ''}
                onChange={(e) => setValue('requestedBy', e.target.value)}
              />
            </div>

            <CustomDatePickerField
              id="vacancy-request-date"
              placeholder="Request Date"
              value={parseFilterDate(values.requestDate)}
              onChange={(date) => setValue('requestDate', toYmd(date))}
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
              id="vacancy-required-date"
              placeholder="Required Date"
              value={parseFilterDate(values.requiredDate)}
              onChange={(date) => setValue('requiredDate', toYmd(date))}
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
              label="Status"
              options={statusOptions}
              value={values.status ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('status', v)}
              className={{ trigger: 'h-10 w-full max-w-none self-end' }}
            />

            <div className="space-y-2 sm:col-span-2 xl:col-span-4">
              <Label
                htmlFor="vacancy-search"
                className="text-xs uppercase text-muted-foreground"
              >
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="vacancy-search"
                  className="pl-8"
                  placeholder="Search request id, department, designation…"
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
