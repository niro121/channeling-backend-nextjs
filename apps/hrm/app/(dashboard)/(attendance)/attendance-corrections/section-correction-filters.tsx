'use client';

import { Suspense } from 'react';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import {
  Combobox,
  CustomDatePickerField,
  Input,
  Label,
  Selector
} from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import type { AttendanceCorrectionFilterOptions } from '@/types/attendance';

type SectionCorrectionFiltersProps = {
  filterOptions: AttendanceCorrectionFilterOptions;
  initial: {
    staffId?: string;
    staffCode?: string;
    department?: string;
    designation?: string;
    attendanceStatus?: string;
    correctedStatus?: string;
    requestedById?: string;
    fromDate?: string;
    toDate?: string;
  };
};

function parseLocalDate(iso?: string): Date | null {
  if (!iso?.trim()) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toLocalDateIso(value?: Date | null): string | undefined {
  if (!value) return undefined;
  return format(value, 'yyyy-MM-dd');
}

function SectionCorrectionFiltersInner({
  filterOptions,
  initial
}: SectionCorrectionFiltersProps) {
  const initialValues = {
    staffId: initial.staffId ?? '',
    staffCode: initial.staffCode ?? '',
    department: initial.department ?? '',
    designation: initial.designation ?? '',
    attendanceStatus: initial.attendanceStatus ?? '__all__',
    correctedStatus: initial.correctedStatus ?? '__all__',
    requestedById: initial.requestedById ?? '',
    fromDate: initial.fromDate ?? '',
    toDate: initial.toDate ?? ''
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={[
          initialValues.staffId,
          initialValues.staffCode,
          initialValues.department,
          initialValues.designation,
          initialValues.attendanceStatus,
          initialValues.correctedStatus,
          initialValues.requestedById,
          initialValues.fromDate,
          initialValues.toDate
        ].join('|')}
        initialValues={initialValues}
        buttonLabel="Search"
        showClearButton
        searchButton={{
          variant: 'default',
          className: 'h-10 w-full gap-2'
        }}
      >
        {({ values, setValue }) => (
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <CustomDatePickerField
              id="correctionFromDate"
              placeholder="From Date"
              value={parseLocalDate(values.fromDate)}
              onChange={(value) => setValue('fromDate', toLocalDateIso(value))}
              onBlur={() => undefined}
              required={false}
              useFormikError={false}
              styleClasses={{
                parentDiv: 'grid grid-cols-1 gap-2 items-start',
                labelClassName: 'text-xs uppercase text-muted-foreground',
                inputClassName: 'w-full'
              }}
            />
            <CustomDatePickerField
              id="correctionToDate"
              placeholder="To Date"
              value={parseLocalDate(values.toDate)}
              onChange={(value) => setValue('toDate', toLocalDateIso(value))}
              onBlur={() => undefined}
              required={false}
              useFormikError={false}
              styleClasses={{
                parentDiv: 'grid grid-cols-1 gap-2 items-start',
                labelClassName: 'text-xs uppercase text-muted-foreground',
                inputClassName: 'w-full'
              }}
            />
            <div className="space-y-2">
              <Label
                htmlFor="correction-staff-code"
                className="text-xs uppercase text-muted-foreground"
              >
                Staff Code
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="correction-staff-code"
                  className="pl-8"
                  placeholder="ST-…"
                  value={values.staffCode ?? ''}
                  onChange={(e) => setValue('staffCode', e.target.value)}
                />
              </div>
            </div>
            <Combobox
              label="Select Staff"
              options={filterOptions.staff}
              value={values.staffId ?? ''}
              defaultValue=""
              onChange={(v) => setValue('staffId', v)}
              clearable
              triggerClassName='self-end'
            />
            <Combobox
              label="Select Department"
              options={filterOptions.departments}
              value={values.department ?? ''}
              defaultValue=""
              onChange={(v) => setValue('department', v)}
              clearable
            />
            <Combobox
              label="Select Designation"
              options={filterOptions.designations}
              value={values.designation ?? ''}
              defaultValue=""
              onChange={(v) => setValue('designation', v)}
              clearable
            />
            <Selector
              label="Attendance Status"
              options={filterOptions.attendanceStatuses}
              value={values.attendanceStatus}
              defaultValue="__all__"
              onChange={(v) => setValue('attendanceStatus', v)}
              className={{ trigger: 'w-full max-w-none' }}
            />
            <Selector
              label="Corrected Status"
              options={filterOptions.correctedStatuses}
              value={values.correctedStatus}
              defaultValue="__all__"
              onChange={(v) => setValue('correctedStatus', v)}
              className={{ trigger: 'w-full max-w-none' }}
            />
            <Combobox
              label="Submitted By"
              options={filterOptions.requesters}
              value={values.requestedById ?? ''}
              defaultValue=""
              onChange={(v) => setValue('requestedById', v)}
              clearable
            />
          </div>
        )}
      </FilterWrapper>
    </div>
  );
}

export default function SectionCorrectionFilters(
  props: SectionCorrectionFiltersProps
) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Loading filters...
        </div>
      }
    >
      <SectionCorrectionFiltersInner {...props} />
    </Suspense>
  );
}
