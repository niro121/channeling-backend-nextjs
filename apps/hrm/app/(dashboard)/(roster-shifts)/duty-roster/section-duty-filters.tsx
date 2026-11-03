'use client';

import { Suspense } from 'react';
import { format } from 'date-fns';
import { Combobox, CustomDatePickerField, Label } from '@archmage/ui';
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import type { RosterFilterOption } from '@/types/roster';

export type DutyFilterValues = {
  departmentId: string;
  unitId: string;
  dutyDate: Date | null;
  shiftId: string;
  rosterId: string;
};

type SectionDutyFiltersProps = {
  initial?: Partial<DutyFilterValues>;
  departmentOptions: RosterFilterOption[];
  unitOptions: RosterFilterOption[];
  shiftOptions: RosterFilterOption[];
  rosterOptions: RosterFilterOption[];
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

function SectionDutyFiltersInner({
  initial = {},
  departmentOptions,
  unitOptions,
  shiftOptions,
  rosterOptions
}: SectionDutyFiltersProps) {
  const initialValues = {
    department: initial.departmentId ?? '',
    unit: initial.unitId ?? '',
    dutyDate: toIso(initial.dutyDate ?? null),
    shiftTypeId: initial.shiftId ?? '',
    roster: initial.rosterId ?? ''
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Search & Filters
      </h2>
      <FilterWrapper
        key={Object.values(initialValues).join('|')}
        initialValues={initialValues}
        buttonLabel="Load Duty Roster"
        showClearButton
        preserveQueryKeys={['limit', 'view']}
        searchButton={{
          variant: 'default',
          className: 'h-10 shrink-0 gap-2'
        }}
      >
        {({ values, setValue }) => (
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
            <div>
              <Label
                htmlFor="dutyFilterDate"
                className="text-xs uppercase text-muted-foreground"
              >
                Select Date
              </Label>
              <CustomDatePickerField
                id="dutyFilterDate"
                placeholder=""
                value={parseLocalDate(values.dutyDate)}
                onChange={(value) => setValue('dutyDate', toLocalDateIso(value))}
                onBlur={() => undefined}
                required={false}
                useFormikError={false}
                styleClasses={{
                  parentDiv: 'grid grid-cols-1 items-start',
                  inputClassName: 'w-full'
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Select Shift
              </Label>
              <Combobox
                label="Shift"
                options={shiftOptions}
                value={values.shiftTypeId ?? ''}
                defaultValue=""
                onChange={(value) => setValue('shiftTypeId', value)}
                clearable
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Select Roster
              </Label>
              <Combobox
                label="Roster"
                options={rosterOptions}
                value={values.roster ?? ''}
                defaultValue=""
                onChange={(value) => setValue('roster', value)}
                clearable
              />
            </div>
          </div>
        )}
      </FilterWrapper>
    </div>
  );
}

export default function SectionDutyFilters(props: SectionDutyFiltersProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
          Loading filters...
        </div>
      }
    >
      <SectionDutyFiltersInner {...props} />
    </Suspense>
  );
}
