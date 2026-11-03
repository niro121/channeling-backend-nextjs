'use client';

import { Suspense } from 'react';
import { format } from 'date-fns';
import {
  Combobox,
  CustomDatePickerField
} from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import type { RosterFilterOption } from '@/types/roster';

export type HolidayFilterValues = {
  holidayId: string;
  holidayTypeId: string;
  fromDate: Date | null;
  toDate: Date | null;
  departmentId: string;
  unitId: string;
  payRateId: string;
  statusId: string;
};

type SectionHolidayFiltersProps = {
  initial?: Partial<HolidayFilterValues>;
  holidayOptions: RosterFilterOption[];
  holidayTypeOptions: RosterFilterOption[];
  departmentOptions: RosterFilterOption[];
  unitOptions: RosterFilterOption[];
  payRateOptions: RosterFilterOption[];
  statusOptions: RosterFilterOption[];
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

function toIso(value?: Date | null): string {
  return value ? format(value, 'yyyy-MM-dd') : '';
}

function SectionHolidayFiltersInner({
  initial = {},
  holidayOptions,
  holidayTypeOptions,
  departmentOptions,
  unitOptions,
  payRateOptions,
  statusOptions
}: SectionHolidayFiltersProps) {
  const initialValues = {
    holidayId: initial.holidayId ?? '',
    holidayTypeId: initial.holidayTypeId ?? '',
    fromDate: toIso(initial.fromDate ?? null),
    toDate: toIso(initial.toDate ?? null),
    department: initial.departmentId ?? '',
    unit: initial.unitId ?? '',
    payRate: initial.payRateId ?? '',
    status: initial.statusId ?? ''
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
            <Combobox
              label="Holiday"
              options={holidayOptions}
              value={values.holidayId ?? ''}
              defaultValue=""
              onChange={(value) => setValue('holidayId', value)}
              clearable
              triggerClassName="self-end"
            />
            <Combobox
              label="Holiday Type"
              options={holidayTypeOptions}
              value={values.holidayTypeId ?? ''}
              defaultValue=""
              onChange={(value) => setValue('holidayTypeId', value)}
              clearable
              triggerClassName="self-end"
            />
            <CustomDatePickerField
              id="fromDate"
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
              id="toDate"
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
            <Combobox
              label="Department"
              options={departmentOptions}
              value={values.department ?? ''}
              defaultValue=""
              onChange={(value) => setValue('department', value)}
              clearable
              triggerClassName="self-end"
            />
            <Combobox
              label="Unit"
              options={unitOptions}
              value={values.unit ?? ''}
              defaultValue=""
              onChange={(value) => setValue('unit', value)}
              clearable
              triggerClassName="self-end"
            />
            <Combobox
              label="Pay Rate"
              options={payRateOptions}
              value={values.payRate ?? ''}
              defaultValue=""
              onChange={(value) => setValue('payRate', value)}
              clearable
              triggerClassName="self-end"
            />
            <Combobox
              label="Approval Status"
              options={statusOptions}
              value={values.status ?? ''}
              defaultValue=""
              onChange={(value) => setValue('status', value)}
              clearable
              triggerClassName="self-end"
            />
          </div>
        )}
      </FilterWrapper>
    </div>
  );
}

export default function SectionHolidayFilters(
  props: SectionHolidayFiltersProps
) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Loading filters...
        </div>
      }
    >
      <SectionHolidayFiltersInner {...props} />
    </Suspense>
  );
}
