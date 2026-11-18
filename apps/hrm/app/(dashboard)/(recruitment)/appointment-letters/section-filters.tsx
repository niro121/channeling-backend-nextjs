'use client';

import { Suspense } from 'react';
import {
  CustomDatePickerField,
  Input,
  Label,
  Selector
} from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import {
  APPOINTMENT_LETTER_STATUS_LABELS,
  APPOINTMENT_LETTER_STATUSES,
  VACANCY_DEPARTMENT_OPTIONS,
  VACANCY_DESIGNATION_OPTIONS,
  type AppointmentLetterFilters
} from '@/types/recruitment';

type SectionFiltersProps = {
  initial?: AppointmentLetterFilters;
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
  const positionOptions = VACANCY_DESIGNATION_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));
  const departmentOptions = VACANCY_DEPARTMENT_OPTIONS.map((item) => ({
    id: item.id,
    name: item.name
  }));
  const statusOptions = APPOINTMENT_LETTER_STATUSES.map((id) => ({
    id,
    name: APPOINTMENT_LETTER_STATUS_LABELS[id]
  }));

  const initialValues = {
    letterNumber: initial.letterNumber ?? '',
    candidateName: initial.candidateName ?? '',
    position: initial.position ?? '__all__',
    department: initial.department ?? '__all__',
    letterDate: initial.letterDate ?? '',
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
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label
                htmlFor="al-letter-no"
                className="text-xs uppercase text-muted-foreground"
              >
                Letter Number
              </Label>
              <Input
                id="al-letter-no"
                placeholder="LETTER-…"
                value={values.letterNumber ?? ''}
                onChange={(e) => setValue('letterNumber', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="al-candidate"
                className="text-xs uppercase text-muted-foreground"
              >
                Candidate Name
              </Label>
              <Input
                id="al-candidate"
                placeholder="Candidate name"
                value={values.candidateName ?? ''}
                onChange={(e) => setValue('candidateName', e.target.value)}
              />
            </div>

            <Selector
              label="Position"
              options={positionOptions}
              value={values.position ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('position', v)}
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

            <CustomDatePickerField
              id="al-letter-date"
              placeholder="Letter Date"
              value={parseFilterDate(values.letterDate)}
              onChange={(date) => setValue('letterDate', toYmd(date))}
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
